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