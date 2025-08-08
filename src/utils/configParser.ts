import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { MockConfig, ProfileConfig, MockEndpoint } from '../types';

export class ConfigParser {
  static parseConfigFile(configPath: string): MockConfig | ProfileConfig {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    const fileContent = fs.readFileSync(configPath, 'utf8');
    const ext = path.extname(configPath).toLowerCase();

    let parsed: any;

    try {
      if (ext === '.json') {
        parsed = JSON.parse(fileContent);
      } else if (ext === '.yaml' || ext === '.yml') {
        parsed = yaml.load(fileContent);
      } else {
        throw new Error(`Unsupported config file format: ${ext}. Use .json, .yaml, or .yml`);
      }
    } catch (error) {
      throw new Error(`Failed to parse config file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return this.validateConfig(parsed);
  }

  static validateConfig(config: any): MockConfig | ProfileConfig {
    if (!config || typeof config !== 'object') {
      throw new Error('Config must be a valid object');
    }

    // Check if it's a profile config
    if (config.profiles && typeof config.profiles === 'object') {
      return this.validateProfileConfig(config);
    }

    // Otherwise, treat as a simple mock config
    return this.validateMockConfig(config);
  }

  private static validateProfileConfig(config: any): ProfileConfig {
    const profiles: { [key: string]: MockConfig } = {};

    for (const [profileName, profileConfig] of Object.entries(config.profiles)) {
      if (typeof profileConfig !== 'object' || profileConfig === null) {
        throw new Error(`Profile "${profileName}" must be an object`);
      }
      profiles[profileName] = this.validateMockConfig(profileConfig);
    }

    return {
      profiles,
      default: config.default || Object.keys(profiles)[0]
    };
  }

  private static validateMockConfig(config: any): MockConfig {
    const mockConfig: MockConfig = {};

    for (const [route, endpoint] of Object.entries(config)) {
      if (!this.isValidRoute(route)) {
        throw new Error(`Invalid route format: ${route}. Routes must be in format "METHOD /path"`);
      }

      mockConfig[route] = this.validateEndpoint(endpoint, route);
    }

    return mockConfig;
  }

  private static validateEndpoint(endpoint: any, route: string): MockEndpoint {
    if (!endpoint || typeof endpoint !== 'object') {
      throw new Error(`Endpoint for route "${route}" must be an object`);
    }

    if (endpoint.response === undefined) {
      throw new Error(`Endpoint for route "${route}" must have a "response" property`);
    }

    const validatedEndpoint: MockEndpoint = {
      response: endpoint.response
    };

    if (endpoint.status !== undefined) {
      if (typeof endpoint.status !== 'number' || endpoint.status < 100 || endpoint.status > 599) {
        throw new Error(`Invalid status code for route "${route}": ${endpoint.status}`);
      }
      validatedEndpoint.status = endpoint.status;
    }

    if (endpoint.delay !== undefined) {
      if (typeof endpoint.delay !== 'number' || endpoint.delay < 0) {
        throw new Error(`Invalid delay for route "${route}": ${endpoint.delay}`);
      }
      validatedEndpoint.delay = endpoint.delay;
    }

    if (endpoint.headers !== undefined) {
      if (typeof endpoint.headers !== 'object' || Array.isArray(endpoint.headers)) {
        throw new Error(`Headers for route "${route}" must be an object`);
      }
      validatedEndpoint.headers = endpoint.headers;
    }

    if (endpoint.condition !== undefined) {
      if (typeof endpoint.condition !== 'string') {
        throw new Error(`Condition for route "${route}" must be a string`);
      }
      validatedEndpoint.condition = endpoint.condition;
    }

    return validatedEndpoint;
  }

  private static isValidRoute(route: string): boolean {
    const routePattern = /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+\/.*$/i;
    return routePattern.test(route);
  }

  static extractMockConfig(config: MockConfig | ProfileConfig, profile?: string): MockConfig {
    // If it's already a simple mock config, return it
    if (!('profiles' in config)) {
      return config;
    }

    // It's a profile config
    const profileConfig = config as ProfileConfig;
    const targetProfile = profile || profileConfig.default;

    if (!targetProfile) {
      throw new Error('No profile specified and no default profile found');
    }

    if (!profileConfig.profiles[targetProfile]) {
      const availableProfiles = Object.keys(profileConfig.profiles);
      throw new Error(`Profile "${targetProfile}" not found. Available profiles: ${availableProfiles.join(', ')}`);
    }

    return profileConfig.profiles[targetProfile];
  }
}