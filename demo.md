# MockAPI Responder Demo

## Installation & Quick Start

```bash
# Install from your local directory (after publishing)
npm install -g mockapi-responder

# Or use the built version directly
node dist/cli.js --help
```

## Demo Commands

### 1. Create a sample config
```bash
node dist/cli.js init
# Creates mockapi.json with sample endpoints
```

### 2. Validate the config
```bash
node dist/cli.js validate mockapi.json
# Checks if the configuration is valid
```

### 3. Start the server
```bash
node dist/cli.js mockapi.json --port 3000 --swagger --watch
```

This will start the server with:
- **Port 3000** - Main API endpoints
- **Swagger docs** at http://localhost:3000/docs
- **Hot reload** - Updates when mockapi.json changes
- **CORS enabled** - Works with frontend apps

### 4. Test the endpoints

```bash
# Get all users
curl http://localhost:3000/users

# Get user by ID  
curl http://localhost:3000/users/123

# Create a new user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'

# Test login (will fail with invalid credentials)
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "wrong"}'
```

### 5. Try different examples

```bash
# Use the ecommerce example
node dist/cli.js examples/ecommerce.json --port 3001 --swagger

# Use profiles example
node dist/cli.js examples/profiles.yaml --profile staging --port 3002
```

## Key Features Demonstrated

✅ **Single Config File** - Everything defined in JSON/YAML  
✅ **Dynamic Routes** - `/users/:id` with parameter substitution  
✅ **Faker.js Integration** - `{{faker.person.firstName}}` generates realistic data  
✅ **Response Delays** - Simulate network latency  
✅ **Error Simulation** - Return 4xx/5xx status codes  
✅ **Query Parameters** - Access with `{{query.limit}}`  
✅ **Request Body** - Access with `{{body.name}}`  
✅ **Multiple Profiles** - dev/staging/test configurations  
✅ **Hot Reload** - Changes update without restart  
✅ **OpenAPI Docs** - Auto-generated Swagger UI  
✅ **CORS Support** - Works with frontend frameworks  

## Template Examples

```json
{
  "response": {
    "id": "{{params.id}}",
    "name": "{{faker.person.fullName}}",
    "email": "{{faker.internet.email}}",
    "timestamp": "{{date.now}}",
    "randomNumber": "{{random.number(1,100)}}",
    "queryParam": "{{query.limit}}",
    "bodyField": "{{body.username}}"
  }
}
```

## Publishing to npm

```bash
# Update package.json with your details
# Then publish
npm publish
```

After publishing, users can install with:
```bash
npm install -g mockapi-responder
npx mockapi-responder init
npx mockapi-responder mockapi.json
```