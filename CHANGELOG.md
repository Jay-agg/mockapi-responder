# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2024-01-XX

### Added
- Initial release of MockAPI Responder
- Single JSON/YAML config file support
- Dynamic route handling with parameter substitution (`/users/:id`)
- Faker.js integration for realistic mock data generation
- Response delay simulation for network latency testing
- Error simulation with configurable status codes
- Query parameter handling and template access
- Multiple profile support (dev, staging, test configurations)
- Hot reload functionality for config file changes
- Auto-generated OpenAPI/Swagger documentation
- CORS support for frontend development
- CLI with commands: start, init, validate
- Programmatic API for Node.js integration
- Comprehensive templating system:
  - Faker.js expressions: `{{faker.person.firstName}}`
  - Request data access: `{{params.id}}`, `{{query.limit}}`, `{{body.name}}`
  - Date generators: `{{date.now}}`, `{{date.past}}`, `{{date.future}}`
  - Random values: `{{random.number(1,100)}}`, `{{random.uuid}}`
- Example configurations for common use cases
- TypeScript support with full type definitions

### Features
- ✅ Single config file (JSON/YAML)
- ✅ Dynamic routes with parameters
- ✅ Faker.js templating
- ✅ Response delays
- ✅ Error simulation
- ✅ Query parameter handling
- ✅ Multiple profiles
- ✅ Hot reload
- ✅ OpenAPI/Swagger docs
- ✅ CLI interface
- ✅ CORS support
- ✅ TypeScript support