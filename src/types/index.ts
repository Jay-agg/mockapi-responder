export interface MockEndpoint {
  status?: number;
  delay?: number;
  response: any;
  headers?: Record<string, string>;
  condition?: string; // For conditional responses based on query params
}

export interface MockConfig {
  [route: string]: MockEndpoint;
}

export interface ProfileConfig {
  profiles: {
    [profileName: string]: MockConfig;
  };
  default?: string;
}

export interface ServerOptions {
  port: number;
  host?: string;
  profile?: string;
  watch?: boolean;
  cors?: boolean;
  swagger?: boolean;
}

export interface RouteParams {
  [key: string]: string;
}

export interface QueryParams {
  [key: string]: string | string[];
}

export interface RequestContext {
  params: RouteParams;
  query: QueryParams;
  body?: any;
  headers: Record<string, string>;
}

export interface ParsedRoute {
  method: string;
  path: string;
  originalRoute: string;
  paramNames: string[];
  pathRegex: RegExp;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';