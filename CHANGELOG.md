# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2024-01-XX

### 🚨 BREAKING CHANGES
- Complete rewrite of route resolution system
- Enhanced error handling and debugging

### ✅ FIXED (Critical Issues)
- **CRITICAL**: Fixed route resolution bug where all requests were interpreted as path "/"
- **MAJOR**: Added binary file response support (Excel, PDF, images, ZIP, CSV)
- **MAJOR**: Implemented comprehensive debug logging with `--debug` flag

### 🎉 NEW FEATURES
- Binary response templates: `{{binary.excel}}`, `{{binary.pdf}}`, `{{binary.image}}`, etc.
- Debug mode with detailed request/response logging
- Enhanced template expression validation
- Better error messages and warnings
- Improved configuration validation

### 🔧 IMPROVEMENTS
- Better route matching algorithm using `app.all()` instead of `app.use()`
- Enhanced template engine with binary support
- More comprehensive configuration validation
- Improved request logging with debug information
- Better error handling throughout the application

### 📚 TECHNICAL DETAILS
- Changed from `app.use('*')` to `app.all('*')` for better route handling
- Added binary content type detection and proper headers
- Enhanced template validation with regex patterns
- Improved debug logging throughout request lifecycle

## [1.0.0] - 2024-01-XX (DEPRECATED - Critical Issues)

### Issues Found in v1.0.0
- Route resolution completely broken (all requests interpreted as "/")
- No binary file support
- Poor error handling and debugging
- Limited template validation

### Added (v1.0.0)
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