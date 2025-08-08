import { faker } from '@faker-js/faker';
import { RequestContext } from '../types';

export class TemplateEngine {
  private static templateRegex = /\{\{([^}]+)\}\}/g;

  static processTemplate(template: any, context: RequestContext): any {
    if (typeof template === 'string') {
      return this.processStringTemplate(template, context);
    }

    if (Array.isArray(template)) {
      return template.map(item => this.processTemplate(item, context));
    }

    if (template && typeof template === 'object') {
      const processed: any = {};
      for (const [key, value] of Object.entries(template)) {
        processed[key] = this.processTemplate(value, context);
      }
      return processed;
    }

    return template;
  }

  private static processStringTemplate(template: string, context: RequestContext): any {
    if (!template.includes('{{')) {
      return template;
    }

    let result = template;
    let hasReplacements = false;

    result = result.replace(this.templateRegex, (match, expression) => {
      hasReplacements = true;
      return this.evaluateExpression(expression.trim(), context);
    });

    // If the entire string was a template expression, try to parse it as the actual value
    if (hasReplacements && template.startsWith('{{') && template.endsWith('}}') && template.match(/\{\{[^}]+\}\}$/)) {
      try {
        // If it's a number, return as number
        if (!isNaN(Number(result)) && result.trim() !== '') {
          return Number(result);
        }
        // If it's a boolean, return as boolean
        if (result === 'true') return true;
        if (result === 'false') return false;
        // If it's JSON, try to parse it
        if ((result.startsWith('{') && result.endsWith('}')) || (result.startsWith('[') && result.endsWith(']'))) {
          return JSON.parse(result);
        }
      } catch (e) {
        // If parsing fails, return as string
      }
    }

    return result;
  }

  private static evaluateExpression(expression: string, context: RequestContext): string {
    try {
      // Handle params references (e.g., params.id)
      if (expression.startsWith('params.')) {
        const paramName = expression.substring(7); // Remove 'params.'
        return context.params[paramName] || '';
      }

      // Handle query parameters (e.g., query.limit)
      if (expression.startsWith('query.')) {
        const queryName = expression.substring(6); // Remove 'query.'
        const queryValue = context.query[queryName];
        if (Array.isArray(queryValue)) {
          return queryValue[0] || '';
        }
        return queryValue || '';
      }

      // Handle body references (e.g., body.username)
      if (expression.startsWith('body.')) {
        const bodyPath = expression.substring(5); // Remove 'body.'
        return this.getNestedProperty(context.body, bodyPath) || '';
      }

      // Handle headers (e.g., headers.authorization)
      if (expression.startsWith('headers.')) {
        const headerName = expression.substring(8); // Remove 'headers.'
        return context.headers[headerName.toLowerCase()] || '';
      }

      // Handle faker expressions (e.g., faker.name.firstName)
      if (expression.startsWith('faker.')) {
        return this.evaluateFakerExpression(expression);
      }

      // Handle random numbers (e.g., random.number(1,100))
      if (expression.startsWith('random.')) {
        return this.evaluateRandomExpression(expression);
      }

      // Handle date expressions (e.g., date.now, date.past)
      if (expression.startsWith('date.')) {
        return this.evaluateDateExpression(expression);
      }

      // Handle binary expressions (e.g., binary.excel, binary.pdf)
      if (expression.startsWith('binary.')) {
        return this.evaluateBinaryExpression(expression);
      }

      // If nothing matches, return the expression as is
      return expression;
    } catch (error) {
      console.warn(`Failed to evaluate expression: ${expression}`, error);
      return expression;
    }
  }

  private static evaluateFakerExpression(expression: string): string {
    try {
      // Remove 'faker.' prefix
      const fakerPath = expression.substring(6);
      
      // Split by dots to navigate faker object
      const parts = fakerPath.split('.');
      let result: any = faker;

      for (const part of parts) {
        // Handle function calls with parentheses
        if (part.includes('(')) {
          const [funcName, argsString] = part.split('(');
          const args = argsString.replace(')', '');
          
          if (result[funcName] && typeof result[funcName] === 'function') {
            // Parse simple arguments (numbers, strings)
            const parsedArgs = args ? args.split(',').map(arg => {
              arg = arg.trim();
              if (arg.startsWith('"') && arg.endsWith('"')) {
                return arg.slice(1, -1); // Remove quotes
              }
              if (arg.startsWith("'") && arg.endsWith("'")) {
                return arg.slice(1, -1); // Remove quotes
              }
              if (!isNaN(Number(arg))) {
                return Number(arg);
              }
              return arg;
            }) : [];
            
            result = result[funcName](...parsedArgs);
          } else {
            throw new Error(`Function ${funcName} not found`);
          }
        } else {
          if (result[part] !== undefined) {
            result = result[part];
          } else {
            throw new Error(`Property ${part} not found`);
          }
        }
      }

      // If result is a function, call it
      if (typeof result === 'function') {
        result = result();
      }

      return String(result);
    } catch (error) {
      console.warn(`Failed to evaluate faker expression: ${expression}`, error);
      return `{{${expression}}}`;
    }
  }

  private static evaluateRandomExpression(expression: string): string {
    try {
      if (expression === 'random.uuid') {
        return faker.string.uuid();
      }
      
      if (expression.startsWith('random.number(')) {
        const argsString = expression.match(/random\.number\(([^)]+)\)/)?.[1];
        if (argsString) {
          const [min, max] = argsString.split(',').map(s => parseInt(s.trim()));
          return String(faker.number.int({ min: min || 0, max: max || 100 }));
        }
      }

      if (expression === 'random.boolean') {
        return String(faker.datatype.boolean());
      }

      return expression;
    } catch (error) {
      console.warn(`Failed to evaluate random expression: ${expression}`, error);
      return expression;
    }
  }

  private static evaluateDateExpression(expression: string): string {
    try {
      const now = new Date();
      
      switch (expression) {
        case 'date.now':
          return now.toISOString();
        case 'date.past':
          return faker.date.past().toISOString();
        case 'date.future':
          return faker.date.future().toISOString();
        case 'date.recent':
          return faker.date.recent().toISOString();
        case 'date.timestamp':
          return String(now.getTime());
        default:
          return expression;
      }
    } catch (error) {
      console.warn(`Failed to evaluate date expression: ${expression}`, error);
      return expression;
    }
  }

  private static evaluateBinaryExpression(expression: string): string {
    try {
      // Handle binary file generation
      switch (expression) {
        case 'binary.excel':
          return this.generateExcelBuffer();
        case 'binary.pdf':
          return this.generatePDFBuffer();
        case 'binary.image':
          return this.generateImageBuffer();
        case 'binary.zip':
          return this.generateZipBuffer();
        case 'binary.csv':
          return this.generateCSVBuffer();
        default:
          console.warn(`Unknown binary type: ${expression}`);
          return expression;
      }
    } catch (error) {
      console.warn(`Failed to evaluate binary expression: ${expression}`, error);
      return expression;
    }
  }

  private static generateExcelBuffer(): string {
    // Generate a simple Excel-like binary buffer
    // In a real implementation, you'd use a library like 'xlsx' or 'exceljs'
    const excelHeader = Buffer.from([
      0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00, // Excel file signature
      0x08, 0x00, 0x00, 0x00, 0x21, 0x00, 0x00, 0x00
    ]);
    const mockContent = Buffer.from('Mock Excel Content - Replace with real Excel generation');
    return Buffer.concat([excelHeader, mockContent]).toString('base64');
  }

  private static generatePDFBuffer(): string {
    // Generate a simple PDF buffer
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Mock PDF Content) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
301
%%EOF`;
    return Buffer.from(pdfContent).toString('base64');
  }

  private static generateImageBuffer(): string {
    // Generate a simple PNG image buffer (1x1 transparent pixel)
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 image
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ]);
    return pngData.toString('base64');
  }

  private static generateZipBuffer(): string {
    // Generate a simple ZIP file buffer
    const zipContent = Buffer.from([
      0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, // ZIP header
      0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x50, 0x4B, 0x05, 0x06, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);
    return zipContent.toString('base64');
  }

  private static generateCSVBuffer(): string {
    const csvContent = `id,name,email,created_at
1,"${faker.person.fullName()}","${faker.internet.email()}","${faker.date.past().toISOString()}"
2,"${faker.person.fullName()}","${faker.internet.email()}","${faker.date.past().toISOString()}"
3,"${faker.person.fullName()}","${faker.internet.email()}","${faker.date.past().toISOString()}"`;
    return Buffer.from(csvContent).toString('base64');
  }

  private static getNestedProperty(obj: any, path: string): any {
    if (!obj || typeof obj !== 'object') {
      return undefined;
    }

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current[key] === undefined) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }
}