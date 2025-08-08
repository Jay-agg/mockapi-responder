#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { MockServer } from './core/server';
import { ServerOptions } from './types';

const program = new Command();

program
  .name('mockapi')
  .description('A developer-friendly tool that spins up a mock API server from a single JSON or YAML file')
  .version('1.0.0');

program
  .argument('<config>', 'Path to the JSON or YAML config file')
  .option('-p, --port <number>', 'Port to run the server on', '3000')
  .option('-h, --host <string>', 'Host to bind the server to', 'localhost')
  .option('--profile <name>', 'Profile to use (if config has multiple profiles)')
  .option('-w, --watch', 'Watch config file for changes and hot reload', false)
  .option('--no-cors', 'Disable CORS headers')
  .option('--swagger', 'Enable Swagger documentation endpoint', false)
  .option('--debug', 'Enable debug logging for troubleshooting', false)
  .option('--no-logs', 'Disable request logging', false)
  .action(async (configPath: string, options: any) => {
    try {
      // Validate config file exists
      const resolvedConfigPath = path.resolve(configPath);
      if (!fs.existsSync(resolvedConfigPath)) {
        console.error(`❌ Config file not found: ${configPath}`);
        process.exit(1);
      }

      // Validate port
      const port = parseInt(options.port);
      if (isNaN(port) || port < 1 || port > 65535) {
        console.error(`❌ Invalid port: ${options.port}. Port must be between 1 and 65535.`);
        process.exit(1);
      }

      // Create server options
      const serverOptions: ServerOptions = {
        port,
        host: options.host,
        profile: options.profile,
        watch: options.watch,
        cors: options.cors !== false,
        swagger: options.swagger,
        debug: options.debug,
        logRequests: options.logs !== false
      };

      // Create and start server
      const server = new MockServer(resolvedConfigPath, serverOptions);
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down server...');
        await server.stop();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        console.log('\n🛑 Shutting down server...');
        await server.stop();
        process.exit(0);
      });

      // Start the server
      await server.start();
    } catch (error) {
      console.error('❌ Failed to start server:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Add init command to create sample config
program
  .command('init')
  .description('Create a sample mockapi.json config file')
  .option('-f, --format <type>', 'Config format (json|yaml)', 'json')
  .option('-o, --output <file>', 'Output file name', 'mockapi.json')
  .action((options: any) => {
    const format = options.format.toLowerCase();
    let filename = options.output;
    
    if (format === 'yaml' || format === 'yml') {
      if (filename === 'mockapi.json') {
        filename = 'mockapi.yaml';
      }
    }

    try {
      if (fs.existsSync(filename)) {
        console.error(`❌ File ${filename} already exists`);
        process.exit(1);
      }

      let content: string;
      
      if (format === 'yaml' || format === 'yml') {
        content = generateSampleYaml();
      } else {
        content = generateSampleJson();
      }

      fs.writeFileSync(filename, content);
      console.log(`✅ Created sample config file: ${filename}`);
      console.log(`\nTo start the server, run:`);
      console.log(`   npx mockapi ${filename}`);
    } catch (error) {
      console.error('❌ Failed to create config file:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Add validate command
program
  .command('validate')
  .description('Validate a mockapi config file')
  .argument('<config>', 'Path to the JSON or YAML config file')
  .action((configPath: string) => {
    try {
      const { ConfigParser } = require('./utils/configParser');
      const config = ConfigParser.parseConfigFile(configPath);
      
      console.log('✅ Config file is valid');
      
      if ('profiles' in config) {
        const profiles = Object.keys(config.profiles);
        console.log(`📋 Found profiles: ${profiles.join(', ')}`);
        console.log(`🎯 Default profile: ${config.default || profiles[0]}`);
      } else {
        const routes = Object.keys(config);
        console.log(`🚀 Found ${routes.length} routes:`);
        routes.forEach(route => console.log(`   ${route}`));
      }
    } catch (error) {
      console.error('❌ Config validation failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

function generateSampleJson(): string {
  const sample = {
    "GET /users": {
      "status": 200,
      "delay": 200,
      "response": [
        { "id": 1, "name": "{{faker.person.firstName}}", "email": "{{faker.internet.email}}" },
        { "id": 2, "name": "{{faker.person.firstName}}", "email": "{{faker.internet.email}}" }
      ]
    },
    "GET /users/:id": {
      "status": 200,
      "response": {
        "id": "{{params.id}}",
        "name": "{{faker.person.fullName}}",
        "email": "{{faker.internet.email}}",
        "createdAt": "{{date.past}}"
      }
    },
    "POST /users": {
      "status": 201,
      "response": {
        "id": "{{random.number(1,1000)}}",
        "name": "{{body.name}}",
        "email": "{{body.email}}",
        "createdAt": "{{date.now}}"
      }
    },
    "POST /login": {
      "status": 401,
      "condition": "body.password !== 'secret'",
      "response": { "error": "Invalid credentials" }
    },
    "GET /posts": {
      "status": 200,
      "response": [
        {
          "id": 1,
          "title": "{{faker.lorem.sentence}}",
          "content": "{{faker.lorem.paragraphs}}",
          "authorId": "{{random.number(1,10)}}"
        }
      ]
    }
  };

  return JSON.stringify(sample, null, 2);
}

function generateSampleYaml(): string {
  return `GET /users:
  status: 200
  delay: 200
  response:
    - id: 1
      name: "{{faker.person.firstName}}"
      email: "{{faker.internet.email}}"
    - id: 2
      name: "{{faker.person.firstName}}"
      email: "{{faker.internet.email}}"

GET /users/:id:
  status: 200
  response:
    id: "{{params.id}}"
    name: "{{faker.person.fullName}}"
    email: "{{faker.internet.email}}"
    createdAt: "{{date.past}}"

POST /users:
  status: 201
  response:
    id: "{{random.number(1,1000)}}"
    name: "{{body.name}}"
    email: "{{body.email}}"
    createdAt: "{{date.now}}"

POST /login:
  status: 401
  condition: "body.password !== 'secret'"
  response:
    error: "Invalid credentials"

GET /posts:
  status: 200
  response:
    - id: 1
      title: "{{faker.lorem.sentence}}"
      content: "{{faker.lorem.paragraphs}}"
      authorId: "{{random.number(1,10)}}"
`;
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

program.parse();