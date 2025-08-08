import express, { Request, Response, NextFunction } from 'express';
import * as chokidar from 'chokidar';
import * as path from 'path';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { ConfigParser } from '../utils/configParser';
import { RouteHandler } from '../utils/routeHandler';
import { TemplateEngine } from '../utils/templateEngine';
import { SwaggerGenerator } from '../utils/swaggerGenerator';
import { MockConfig, ProfileConfig, ServerOptions, ParsedRoute, RequestContext, MockEndpoint } from '../types';

export class MockServer {
  private app: express.Application;
  private server: any;
  private configPath: string;
  private config!: MockConfig | ProfileConfig;
  private mockConfig!: MockConfig;
  private routes: ParsedRoute[] = [];
  private options: ServerOptions;
  private watcher?: chokidar.FSWatcher;

  constructor(configPath: string, options: ServerOptions) {
    this.configPath = path.resolve(configPath);
    this.options = options;
    this.app = express();
    this.setupMiddleware();
    this.loadConfig();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Parse JSON bodies
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // CORS support
    if (this.options.cors !== false) {
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        
        if (req.method === 'OPTIONS') {
          res.sendStatus(200);
          return;
        }
        
        next();
      });
    }

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      if (this.options.logRequests !== false) {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      }
      if (this.options.debug) {
        console.log(`🔍 DEBUG: Request headers:`, req.headers);
        if (req.body && Object.keys(req.body).length > 0) {
          console.log(`🔍 DEBUG: Request body:`, req.body);
        }
      }
      next();
    });
  }

  private loadConfig(): void {
    try {
      this.config = ConfigParser.parseConfigFile(this.configPath);
      this.mockConfig = ConfigParser.extractMockConfig(this.config, this.options.profile);
      this.parseRoutes();
      console.log(`✅ Loaded config from ${this.configPath}`);
      
      if ('profiles' in this.config) {
        const profileName = this.options.profile || this.config.default;
        console.log(`📋 Using profile: ${profileName}`);
      }
      
      console.log(`🚀 Loaded ${this.routes.length} routes`);
    } catch (error) {
      console.error('❌ Failed to load config:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  private parseRoutes(): void {
    this.routes = [];
    
    for (const route of Object.keys(this.mockConfig)) {
      try {
        const parsedRoute = RouteHandler.parseRoute(route);
        this.routes.push(parsedRoute);
      } catch (error) {
        console.error(`❌ Failed to parse route "${route}":`, error instanceof Error ? error.message : error);
      }
    }

    // Sort routes by specificity (most specific first)
    this.routes = RouteHandler.sortRoutesBySpecificity(this.routes);
  }

  private setupRoutes(): void {
    // Setup Swagger documentation if enabled
    if (this.options.swagger) {
      this.setupSwaggerDocs();
    }

    // Catch-all route handler - handle all requests
    this.app.all('*', async (req: Request, res: Response) => {
      const method = req.method;
      const requestPath = req.path; // Use req.path for clean path without query params
      
      // Debug logging
      if (this.options.debug) {
        console.log(`🔍 DEBUG: Incoming request: ${method} ${requestPath}`);
        console.log(`🔍 DEBUG: Available routes:`, this.routes.map(r => `${r.method} ${r.path}`));
      }

      // Find matching route
      const match = RouteHandler.findMatchingRoute(this.routes, method, requestPath);
      
      if (this.options.debug) {
        console.log(`🔍 DEBUG: Route match result:`, match ? `Matched ${match.route.originalRoute}` : 'No match found');
      }
      
      if (!match) {
        console.log(`❌ Route not found: ${method} ${requestPath}`);
        if (this.options.debug) {
          console.log(`🔍 DEBUG: Available routes:`, this.routes.map(r => `${r.method} ${r.path}`));
        }
        res.status(404).json({
          error: 'Route not found',
          method,
          path: requestPath,
          availableRoutes: this.routes.map(r => `${r.method} ${r.path}`)
        });
        return;
      }

      const endpoint = this.mockConfig[match.route.originalRoute];
      await this.handleRequest(req, res, endpoint, match.params);
    });

    // Error handling middleware
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('❌ Server error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    });
  }

  private async handleRequest(
    req: Request,
    res: Response,
    endpoint: MockEndpoint,
    params: Record<string, string>
  ): Promise<void> {
    try {
      // Create request context for template processing
      const context: RequestContext = {
        params,
        query: req.query as Record<string, string | string[]>,
        body: req.body,
        headers: req.headers as Record<string, string>
      };

      // Check condition if present
      if (endpoint.condition && !this.evaluateCondition(endpoint.condition, context)) {
        res.status(404).json({ error: 'Condition not met' });
        return;
      }

      // Apply delay if specified
      if (endpoint.delay && endpoint.delay > 0) {
        await this.delay(endpoint.delay);
      }

      // Set status code
      const statusCode = endpoint.status || 200;

      // Set custom headers
      if (endpoint.headers) {
        for (const [key, value] of Object.entries(endpoint.headers)) {
          res.setHeader(key, value);
        }
      }

      // Process response template
      const processedResponse = TemplateEngine.processTemplate(endpoint.response, context);

      // Handle binary responses
      if (typeof processedResponse === 'string' && this.isBinaryResponse(processedResponse)) {
        const binaryData = Buffer.from(processedResponse, 'base64');
        
        // Set appropriate content type for binary data if not already set
        if (!res.getHeader('Content-Type')) {
          const contentType = this.getBinaryContentType(endpoint.response as string);
          res.setHeader('Content-Type', contentType);
        }
        
        if (this.options.debug) {
          console.log(`🔍 DEBUG: Sending binary response (${binaryData.length} bytes)`);
        }
        
        res.status(statusCode).send(binaryData);
        return;
      }

      // Set content type if not already set
      if (!res.getHeader('Content-Type')) {
        if (typeof processedResponse === 'object') {
          res.setHeader('Content-Type', 'application/json');
        } else {
          res.setHeader('Content-Type', 'text/plain');
        }
      }

      res.status(statusCode).json(processedResponse);
    } catch (error) {
      console.error('❌ Error handling request:', error);
      res.status(500).json({
        error: 'Failed to process request',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private evaluateCondition(condition: string, context: RequestContext): boolean {
    try {
      // Simple condition evaluation
      // For now, support basic query parameter checks
      // e.g., "query.type === 'premium'" or "params.id > 10"
      
      // Replace template variables in condition
      const processedCondition = condition
        .replace(/params\.(\w+)/g, (match, paramName) => {
          const value = context.params[paramName];
          return typeof value === 'string' ? `"${value}"` : String(value);
        })
        .replace(/query\.(\w+)/g, (match, queryName) => {
          const value = context.query[queryName];
          const queryValue = Array.isArray(value) ? value[0] : value;
          return typeof queryValue === 'string' ? `"${queryValue}"` : String(queryValue || 'undefined');
        });

      // For safety, only allow basic comparisons
      if (!/^[a-zA-Z0-9\s"'._><=!&|()]+$/.test(processedCondition)) {
        console.warn('Invalid condition syntax:', condition);
        return true;
      }

      // Simple evaluation (not using eval for security)
      // This is a basic implementation - could be enhanced with a proper expression parser
      return this.simpleConditionEval(processedCondition);
    } catch (error) {
      console.warn('Failed to evaluate condition:', condition, error);
      return true; // Default to true if evaluation fails
    }
  }

  private simpleConditionEval(condition: string): boolean {
    // Basic condition evaluation without eval
    // This could be enhanced with a proper expression parser
    
    // Handle simple equality checks
    const equalityMatch = condition.match(/^"([^"]*)" === "([^"]*)"$/);
    if (equalityMatch) {
      return equalityMatch[1] === equalityMatch[2];
    }

    const inequalityMatch = condition.match(/^"([^"]*)" !== "([^"]*)"$/);
    if (inequalityMatch) {
      return inequalityMatch[1] !== inequalityMatch[2];
    }

    // Handle numeric comparisons
    const numericMatch = condition.match(/^(\d+) ([><=]+) (\d+)$/);
    if (numericMatch) {
      const [, left, operator, right] = numericMatch;
      const leftNum = parseInt(left);
      const rightNum = parseInt(right);
      
      switch (operator) {
        case '>': return leftNum > rightNum;
        case '<': return leftNum < rightNum;
        case '>=': return leftNum >= rightNum;
        case '<=': return leftNum <= rightNum;
        case '==': return leftNum === rightNum;
        default: return true;
      }
    }

    // Default to true for unsupported conditions
    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isBinaryResponse(response: string): boolean {
    // Check if response is a base64 encoded binary (starts with valid base64 pattern and is long enough)
    try {
      // Base64 strings are typically much longer than text responses and contain specific patterns
      return response.length > 50 && 
             Buffer.from(response, 'base64').toString('base64') === response;
    } catch {
      return false;
    }
  }

  private getBinaryContentType(originalResponse: string): string {
    if (originalResponse.includes('{{binary.excel}}')) {
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    if (originalResponse.includes('{{binary.pdf}}')) {
      return 'application/pdf';
    }
    if (originalResponse.includes('{{binary.image}}')) {
      return 'image/png';
    }
    if (originalResponse.includes('{{binary.zip}}')) {
      return 'application/zip';
    }
    if (originalResponse.includes('{{binary.csv}}')) {
      return 'text/csv';
    }
    return 'application/octet-stream';
  }

  private setupSwaggerDocs(): void {
    try {
      const swaggerSpec = SwaggerGenerator.generateSwaggerSpec(this.mockConfig, {
        title: 'MockAPI Documentation',
        version: '1.0.0',
        description: 'Auto-generated API documentation from MockAPI configuration'
      });

      // Serve swagger documentation
      this.app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customSiteTitle: 'MockAPI Documentation',
        customCss: '.swagger-ui .topbar { display: none }',
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true
        }
      }));

      // Serve raw swagger spec
      this.app.get('/swagger.json', (req: Request, res: Response) => {
        res.json(swaggerSpec);
      });

      console.log('📚 Swagger documentation enabled at /docs');
    } catch (error) {
      console.warn('⚠️ Failed to setup Swagger docs:', error instanceof Error ? error.message : error);
    }
  }

  private setupHotReload(): void {
    if (!this.options.watch) return;

    this.watcher = chokidar.watch(this.configPath, {
      ignoreInitial: true
    });

    this.watcher.on('change', () => {
      console.log('📁 Config file changed, reloading...');
      try {
        this.loadConfig();
        console.log('🔄 Config reloaded successfully');
      } catch (error) {
        console.error('❌ Failed to reload config:', error instanceof Error ? error.message : error);
      }
    });

    console.log('👀 Watching config file for changes...');
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.options.port, this.options.host || 'localhost', () => {
          const host = this.options.host || 'localhost';
          console.log(`\n🚀 MockAPI server started!`);
          console.log(`📍 Server: http://${host}:${this.options.port}`);
          console.log(`📄 Config: ${this.configPath}`);
          
          if (this.options.swagger) {
            console.log(`📚 Swagger docs: http://${host}:${this.options.port}/docs`);
          }
          
          console.log(`\n📋 Available routes:`);
          this.routes.forEach(route => {
            console.log(`   ${route.method} ${route.path}`);
          });
          
          this.setupHotReload();
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.watcher) {
        this.watcher.close();
      }
      
      if (this.server) {
        this.server.close(() => {
          console.log('✅ Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getApp(): express.Application {
    return this.app;
  }
}