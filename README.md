# MockAPI Responder

A developer-friendly tool that spins up a mock API server from a single JSON or YAML file, no code required.

Perfect for frontend teams, prototyping, testing integrations, or working offline when the real backend isn't ready.

## 🚀 Quick Start

```bash
# Install globally
npm install -g mockapi-responder

# Or use with npx (no installation needed)
npx mockapi-responder --help
```

### Create a sample config and start the server

```bash
# Create a sample configuration file
npx mockapi-responder init

# Start the server
npx mockapi-responder mockapi.json
```

Your mock API server is now running at `http://localhost:3000`! 🎉

## 🌟 Features

- **Single Config File** - Define all endpoints in one JSON or YAML file
- **Dynamic Routes** - Support for `/users/:id` with parameter substitution
- **Faker.js Integration** - Generate realistic fake data with `{{faker.person.firstName}}`
- **Response Delays** - Simulate network latency with per-endpoint delays
- **Error Simulation** - Configure endpoints to return 4xx/5xx errors
- **Query Parameter Handling** - Access query params in responses with `{{query.limit}}`
- **Multiple Profiles** - Switch between dev, staging, and test configurations
- **Hot Reload** - Updates automatically when config file changes
- **OpenAPI/Swagger Docs** - Auto-generated documentation at `/docs`
- **CORS Support** - Works with frontend apps out of the box

## 📖 Usage

### Basic Example

Create a `mockapi.json` file:

```json
{
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
  }
}
```

Start the server:

```bash
npx mockapi-responder mockapi.json --port 4000 --watch
```

### Multiple Profiles

Create a `mockapi.yaml` with multiple environments:

```yaml
profiles:
  dev:
    GET /users:
      status: 200
      response:
        - id: 1
          name: "Dev User"
          email: "dev@example.com"
    
  test:
    GET /users:
      status: 200
      response:
        - id: 1
          name: "Test User"
          email: "test@example.com"

default: dev
```

Use specific profiles:

```bash
npx mockapi-responder mockapi.yaml --profile test
```

## 🎨 Template Expressions

MockAPI supports powerful templating for dynamic responses:

### Faker.js Integration
- `{{faker.person.firstName}}` - Random first name
- `{{faker.person.fullName}}` - Random full name
- `{{faker.internet.email}}` - Random email
- `{{faker.lorem.sentence}}` - Random sentence
- `{{faker.number.int(1,100)}}` - Random number

### Request Data
- `{{params.id}}` - URL parameters
- `{{query.limit}}` - Query parameters
- `{{body.username}}` - Request body fields
- `{{headers.authorization}}` - Request headers

### Dates & Random Values
- `{{date.now}}` - Current timestamp
- `{{date.past}}` - Past date
- `{{date.future}}` - Future date
- `{{random.number(1,100)}}` - Random number
- `{{random.uuid}}` - Random UUID
- `{{random.boolean}}` - Random boolean

## 📋 Configuration Options

### Endpoint Configuration

Each endpoint can have:

```json
{
  "GET /endpoint": {
    "status": 200,           // HTTP status code (default: 200)
    "delay": 500,            // Response delay in ms (default: 0)
    "headers": {             // Custom response headers
      "X-Custom": "value"
    },
    "condition": "query.type === 'premium'", // Conditional responses
    "response": { }          // Response body (required)
  }
}
```

### CLI Options

```bash
npx mockapi-responder <config> [options]

Options:
  -p, --port <number>      Port to run server on (default: 3000)
  -h, --host <string>      Host to bind to (default: localhost)
  --profile <name>         Profile to use for multi-profile configs
  -w, --watch              Watch config file for changes
  --no-cors                Disable CORS headers
  --swagger                Enable Swagger documentation at /docs
  --help                   Show help
```

## 🔧 CLI Commands

### Initialize Config
```bash
# Create sample JSON config
npx mockapi-responder init

# Create sample YAML config
npx mockapi-responder init --format yaml

# Custom filename
npx mockapi-responder init --output my-api.json
```

### Validate Config
```bash
# Check if config file is valid
npx mockapi-responder validate mockapi.json
```

### Start Server
```bash
# Basic usage
npx mockapi-responder mockapi.json

# With options
npx mockapi-responder mockapi.json --port 4000 --watch --swagger
```

## 🌐 API Endpoints

When running, your mock server provides:

- **Your configured routes** - As defined in your config file
- **GET /swagger.json** - Raw OpenAPI specification (if `--swagger` enabled)
- **GET /docs** - Interactive Swagger UI documentation (if `--swagger` enabled)

## 💡 Use Cases

### Frontend Development
```bash
# Start mock API for your React/Vue/Angular app
npx mockapi-responder api-mocks.json --port 3001 --watch --cors
```

### Testing
```bash
# Use specific test data profile
npx mockapi-responder test-mocks.yaml --profile ci
```

### Prototyping
```bash
# Quick API prototype with documentation
npx mockapi-responder prototype.json --swagger
```

### Integration Testing
```bash
# Stable mock responses for automated tests
npx mockapi-responder integration-mocks.json --profile stable
```

## 🔄 Hot Reload

Enable hot reload to automatically update the server when your config changes:

```bash
npx mockapi-responder mockapi.json --watch
```

Perfect for iterative development - just save your config file and the server updates instantly!

## 📊 Swagger Documentation

Enable automatic API documentation:

```bash
npx mockapi-responder mockapi.json --swagger
```

Then visit `http://localhost:3000/docs` to see your interactive API documentation.

## 🆚 vs json-server

| Feature | MockAPI Responder | json-server |
|---------|------------------|-------------|
| Faker.js Templates | ✅ Built-in | ❌ Manual setup |
| Response Delays | ✅ Per-endpoint | ❌ Global only |
| Error Simulation | ✅ Configurable | ❌ Limited |
| Multiple Profiles | ✅ Yes | ❌ No |
| OpenAPI Docs | ✅ Auto-generated | ❌ Manual |
| TypeScript Support | ✅ Native | ❌ Community |
| Hot Reload | ✅ Yes | ✅ Yes |
| Query Params | ✅ Template access | ✅ Basic |

## 🛠️ Programmatic Usage

Use MockAPI in your Node.js applications:

```typescript
import MockServer from 'mockapi-responder';

const server = new MockServer('./mockapi.json', {
  port: 3000,
  watch: true,
  swagger: true
});

await server.start();
console.log('Mock server running!');

// Later...
await server.stop();
```

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions welcome! Please read our [contributing guidelines](CONTRIBUTING.md) first.

## 🐛 Issues

Found a bug or have a feature request? Please [create an issue](https://github.com/yourusername/mockapi-responder/issues).

---

**Made with ❤️ for developers who want to mock APIs without the hassle.**