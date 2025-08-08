import { ParsedRoute, HttpMethod, RouteParams } from '../types';

export class RouteHandler {
  static parseRoute(route: string): ParsedRoute {
    const [method, ...pathParts] = route.split(' ');
    const path = pathParts.join(' '); // Rejoin in case path contains spaces

    if (!method || !path) {
      throw new Error(`Invalid route format: ${route}. Expected format: "METHOD /path"`);
    }

    const normalizedMethod = method.toUpperCase() as HttpMethod;
    const paramNames: string[] = [];
    
    // Convert Express-style route to regex
    // e.g., /users/:id/posts/:postId -> /users/([^/]+)/posts/([^/]+)
    let regexPath = path
      .replace(/:[^/]+/g, (match) => {
        const paramName = match.substring(1); // Remove the ':'
        paramNames.push(paramName);
        return '([^/]+)'; // Match any characters except '/'
      })
      .replace(/\*/g, '(.*)') // Handle wildcard routes
      .replace(/\//g, '\\/'); // Escape forward slashes

    // Ensure exact match
    const pathRegex = new RegExp(`^${regexPath}$`);

    return {
      method: normalizedMethod,
      path,
      originalRoute: route,
      paramNames,
      pathRegex
    };
  }

  static matchRoute(parsedRoute: ParsedRoute, method: string, requestPath: string): RouteParams | null {
    if (parsedRoute.method !== method.toUpperCase()) {
      return null;
    }

    const match = requestPath.match(parsedRoute.pathRegex);
    if (!match) {
      return null;
    }

    const params: RouteParams = {};
    
    // Extract parameters from the matched groups
    for (let i = 0; i < parsedRoute.paramNames.length; i++) {
      const paramName = parsedRoute.paramNames[i];
      const paramValue = match[i + 1]; // match[0] is the full match, parameters start at index 1
      if (paramValue !== undefined) {
        params[paramName] = decodeURIComponent(paramValue);
      }
    }

    return params;
  }

  static findMatchingRoute(
    routes: ParsedRoute[],
    method: string,
    requestPath: string
  ): { route: ParsedRoute; params: RouteParams } | null {
    for (const route of routes) {
      const params = this.matchRoute(route, method, requestPath);
      if (params !== null) {
        return { route, params };
      }
    }
    return null;
  }

  static sortRoutesBySpecificity(routes: ParsedRoute[]): ParsedRoute[] {
    return routes.sort((a, b) => {
      // Routes with fewer parameters are more specific
      const aParamCount = a.paramNames.length;
      const bParamCount = b.paramNames.length;
      
      if (aParamCount !== bParamCount) {
        return aParamCount - bParamCount;
      }

      // Routes with more path segments are more specific
      const aSegments = a.path.split('/').filter(s => s.length > 0);
      const bSegments = b.path.split('/').filter(s => s.length > 0);
      
      if (aSegments.length !== bSegments.length) {
        return bSegments.length - aSegments.length;
      }

      // Static segments are more specific than parameter segments
      let aStaticSegments = 0;
      let bStaticSegments = 0;
      
      for (const segment of aSegments) {
        if (!segment.startsWith(':')) aStaticSegments++;
      }
      
      for (const segment of bSegments) {
        if (!segment.startsWith(':')) bStaticSegments++;
      }

      return bStaticSegments - aStaticSegments;
    });
  }

  static validateHttpMethod(method: string): boolean {
    const validMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    return validMethods.includes(method.toUpperCase() as HttpMethod);
  }

  static normalizePath(path: string): string {
    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    // Remove trailing slash except for root
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    return path;
  }

  static extractPathSegments(path: string): string[] {
    return path.split('/').filter(segment => segment.length > 0);
  }

  static isParameterSegment(segment: string): boolean {
    return segment.startsWith(':');
  }

  static getParameterName(segment: string): string {
    return segment.startsWith(':') ? segment.substring(1) : segment;
  }
}