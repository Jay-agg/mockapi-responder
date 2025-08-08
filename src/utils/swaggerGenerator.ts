import { MockConfig, ParsedRoute } from '../types';
import { RouteHandler } from './routeHandler';

export class SwaggerGenerator {
  static generateSwaggerSpec(mockConfig: MockConfig, options: { title?: string; version?: string; description?: string } = {}): any {
    const paths: any = {};
    const components: any = {
      schemas: {}
    };

    // Parse all routes from config
    const routes = Object.keys(mockConfig).map(route => RouteHandler.parseRoute(route));

    for (const route of routes) {
      const endpoint = mockConfig[route.originalRoute];
      const pathKey = this.convertPathToSwagger(route.path);
      
      if (!paths[pathKey]) {
        paths[pathKey] = {};
      }

      const method = route.method.toLowerCase();
      const operationId = `${method}${pathKey.replace(/[\/{}:]/g, '')}`;

      paths[pathKey][method] = {
        operationId,
        summary: `Mock endpoint for ${route.method} ${route.path}`,
        description: `Returns mocked data for ${route.originalRoute}`,
        parameters: this.generateParameters(route),
        responses: {
          [endpoint.status || 200]: {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: this.generateSchemaFromResponse(endpoint.response),
                example: this.cleanExampleResponse(endpoint.response)
              }
            }
          }
        }
      };

      // Add request body for POST, PUT, PATCH methods
      if (['post', 'put', 'patch'].includes(method)) {
        paths[pathKey][method].requestBody = {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  // Generate basic properties from template references
                  ...this.extractBodyPropertiesFromResponse(endpoint.response)
                }
              }
            }
          }
        };
      }

      // Add additional status codes if error simulation is present
      if (endpoint.status && endpoint.status >= 400) {
        paths[pathKey][method].responses[endpoint.status] = {
          description: this.getErrorDescription(endpoint.status),
          content: {
            'application/json': {
              schema: this.generateSchemaFromResponse(endpoint.response),
              example: this.cleanExampleResponse(endpoint.response)
            }
          }
        };
      }
    }

    return {
      openapi: '3.0.0',
      info: {
        title: options.title || 'MockAPI Generated Documentation',
        version: options.version || '1.0.0',
        description: options.description || 'Auto-generated API documentation from MockAPI configuration'
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Mock API Server'
        }
      ],
      paths,
      components
    };
  }

  private static convertPathToSwagger(path: string): string {
    // Convert :param to {param} format for OpenAPI
    return path.replace(/:([^/]+)/g, '{$1}');
  }

  private static generateParameters(route: ParsedRoute): any[] {
    const parameters: any[] = [];

    // Add path parameters
    for (const paramName of route.paramNames) {
      parameters.push({
        name: paramName,
        in: 'path',
        required: true,
        schema: {
          type: 'string'
        },
        description: `Path parameter: ${paramName}`
      });
    }

    // Add common query parameters
    if (route.method === 'GET') {
      parameters.push(
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100
          },
          description: 'Limit the number of results'
        },
        {
          name: 'offset',
          in: 'query',
          required: false,
          schema: {
            type: 'integer',
            minimum: 0
          },
          description: 'Offset for pagination'
        }
      );
    }

    return parameters;
  }

  private static generateSchemaFromResponse(response: any): any {
    if (Array.isArray(response)) {
      return {
        type: 'array',
        items: this.generateSchemaFromResponse(response[0] || {})
      };
    }

    if (response && typeof response === 'object') {
      const properties: any = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(response)) {
        required.push(key);
        properties[key] = this.generateSchemaFromValue(value);
      }

      return {
        type: 'object',
        properties,
        required
      };
    }

    return this.generateSchemaFromValue(response);
  }

  private static generateSchemaFromValue(value: any): any {
    if (typeof value === 'string') {
      // Check for template expressions
      if (value.includes('{{')) {
        if (value.includes('faker.number') || value.includes('random.number')) {
          return { type: 'integer' };
        }
        if (value.includes('date.') || value.includes('faker.date')) {
          return { type: 'string', format: 'date-time' };
        }
        if (value.includes('faker.internet.email')) {
          return { type: 'string', format: 'email' };
        }
        if (value.includes('faker.internet.url')) {
          return { type: 'string', format: 'uri' };
        }
        return { type: 'string' };
      }
      return { type: 'string' };
    }

    if (typeof value === 'number') {
      return Number.isInteger(value) ? { type: 'integer' } : { type: 'number' };
    }

    if (typeof value === 'boolean') {
      return { type: 'boolean' };
    }

    if (Array.isArray(value)) {
      return {
        type: 'array',
        items: value.length > 0 ? this.generateSchemaFromValue(value[0]) : { type: 'string' }
      };
    }

    if (value && typeof value === 'object') {
      return this.generateSchemaFromResponse(value);
    }

    return { type: 'string' };
  }

  private static cleanExampleResponse(response: any): any {
    if (typeof response === 'string' && response.includes('{{')) {
      // Replace template expressions with example values
      return response
        .replace(/\{\{faker\.person\.firstName\}\}/g, 'John')
        .replace(/\{\{faker\.person\.fullName\}\}/g, 'John Doe')
        .replace(/\{\{faker\.internet\.email\}\}/g, 'john.doe@example.com')
        .replace(/\{\{faker\.lorem\.sentence\}\}/g, 'Lorem ipsum dolor sit amet.')
        .replace(/\{\{faker\.lorem\.paragraphs\}\}/g, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
        .replace(/\{\{random\.number\([^)]+\)\}\}/g, '42')
        .replace(/\{\{date\.now\}\}/g, new Date().toISOString())
        .replace(/\{\{date\.past\}\}/g, new Date(Date.now() - 86400000).toISOString())
        .replace(/\{\{params\.(\w+)\}\}/g, '$1_value')
        .replace(/\{\{query\.(\w+)\}\}/g, '$1_value')
        .replace(/\{\{body\.(\w+)\}\}/g, '$1_value');
    }

    if (Array.isArray(response)) {
      return response.map(item => this.cleanExampleResponse(item));
    }

    if (response && typeof response === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(response)) {
        cleaned[key] = this.cleanExampleResponse(value);
      }
      return cleaned;
    }

    return response;
  }

  private static extractBodyPropertiesFromResponse(response: any): any {
    const properties: any = {};

    if (typeof response === 'string' && response.includes('{{body.')) {
      const matches = response.match(/\{\{body\.(\w+)\}\}/g);
      if (matches) {
        for (const match of matches) {
          const propName = match.replace(/\{\{body\.(\w+)\}\}/, '$1');
          properties[propName] = { type: 'string' };
        }
      }
    }

    if (response && typeof response === 'object') {
      for (const value of Object.values(response)) {
        Object.assign(properties, this.extractBodyPropertiesFromResponse(value));
      }
    }

    return properties;
  }

  private static getErrorDescription(statusCode: number): string {
    const descriptions: { [key: number]: string } = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable'
    };

    return descriptions[statusCode] || 'Error Response';
  }
}