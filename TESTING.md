# Testing MockAPI Responder with Real Applications

This guide shows how to integrate and test MockAPI Responder with real frontend applications.

## Quick Test Setup

### 1. Start MockAPI Server

```bash
# Navigate to your mockapi project
cd /Users/jayantaggarwal/Desktop/mockapi

# Create a test config
node dist/cli.js init --output test-api.json

# Start the server with CORS enabled
node dist/cli.js test-api.json --port 3001 --swagger --watch --cors
```

Your mock API will be running at `http://localhost:3001` with:
- API endpoints as defined in your config
- Swagger docs at `http://localhost:3001/docs`
- CORS enabled for frontend apps

### 2. Test with curl (Quick Verification)

```bash
# Test basic endpoints
curl http://localhost:3001/users
curl http://localhost:3001/users/123
curl -X POST http://localhost:3001/users -H "Content-Type: application/json" -d '{"name":"Test User","email":"test@example.com"}'
```

## Integration with Frontend Frameworks

### React Application

Create a simple React app to test with:

```bash
# Create new React app
npx create-react-app mockapi-test-app
cd mockapi-test-app

# Install axios for API calls
npm install axios

# Start development server
npm start
```

Replace `src/App.js` with:

```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = 'http://localhost:3001';

function App() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '' });

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create user
  const createUser = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE_URL}/users`, newUser);
      setUsers([...users, response.data]);
      setNewUser({ name: '', email: '' });
      alert('User created successfully!');
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  // Test login
  const testLogin = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        email: 'admin@example.com',
        password: 'secret'
      });
      alert('Login successful: ' + JSON.stringify(response.data));
    } catch (error) {
      alert('Login failed: ' + error.response?.data?.error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>MockAPI Responder Test</h1>
        
        <div style={{ margin: '20px 0' }}>
          <button onClick={fetchUsers} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh Users'}
          </button>
          <button onClick={testLogin} style={{ marginLeft: '10px' }}>
            Test Login
          </button>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3>Create User</h3>
          <form onSubmit={createUser} style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <input
              type="text"
              placeholder="Name"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              required
            />
            <button type="submit">Create User</button>
          </form>
        </div>

        <div>
          <h3>Users ({users.length})</h3>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div style={{ display: 'grid', gap: '10px', maxWidth: '600px' }}>
              {users.map((user, index) => (
                <div key={index} style={{ 
                  background: '#282c34', 
                  padding: '15px', 
                  borderRadius: '8px',
                  border: '1px solid #444'
                }}>
                  <strong>{user.name}</strong><br/>
                  <small>{user.email}</small><br/>
                  <small>ID: {user.id}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>
    </div>
  );
}

export default App;
```

### Vue.js Application

```bash
# Create Vue app
npx @vue/cli create mockapi-vue-test
cd mockapi-vue-test

# Install axios
npm install axios

# Start development server
npm run serve
```

Replace `src/App.vue`:

```vue
<template>
  <div id="app">
    <h1>MockAPI Responder Test - Vue</h1>
    
    <div class="controls">
      <button @click="fetchUsers" :disabled="loading">
        {{ loading ? 'Loading...' : 'Refresh Users' }}
      </button>
      <button @click="testLogin">Test Login</button>
    </div>

    <form @submit.prevent="createUser" class="user-form">
      <h3>Create User</h3>
      <input v-model="newUser.name" placeholder="Name" required />
      <input v-model="newUser.email" type="email" placeholder="Email" required />
      <button type="submit">Create User</button>
    </form>

    <div class="users">
      <h3>Users ({{ users.length }})</h3>
      <div v-if="loading">Loading...</div>
      <div v-else class="user-list">
        <div v-for="(user, index) in users" :key="index" class="user-card">
          <strong>{{ user.name }}</strong><br/>
          <small>{{ user.email }}</small><br/>
          <small>ID: {{ user.id }}</small>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

export default {
  name: 'App',
  data() {
    return {
      users: [],
      loading: false,
      newUser: { name: '', email: '' }
    };
  },
  async mounted() {
    await this.fetchUsers();
  },
  methods: {
    async fetchUsers() {
      this.loading = true;
      try {
        const response = await axios.get(`${API_BASE_URL}/users`);
        this.users = response.data;
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        this.loading = false;
      }
    },
    async createUser() {
      try {
        const response = await axios.post(`${API_BASE_URL}/users`, this.newUser);
        this.users.push(response.data);
        this.newUser = { name: '', email: '' };
        alert('User created successfully!');
      } catch (error) {
        console.error('Error creating user:', error);
      }
    },
    async testLogin() {
      try {
        const response = await axios.post(`${API_BASE_URL}/login`, {
          email: 'admin@example.com',
          password: 'secret'
        });
        alert('Login successful: ' + JSON.stringify(response.data));
      } catch (error) {
        alert('Login failed: ' + error.response?.data?.error);
      }
    }
  }
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
.controls { margin: 20px 0; }
.user-form { margin: 30px 0; }
.user-form input { margin: 0 10px; padding: 8px; }
.user-list { display: grid; gap: 10px; max-width: 600px; margin: 0 auto; }
.user-card { background: #f5f5f5; padding: 15px; border-radius: 8px; }
</style>
```

### Angular Application

```bash
# Create Angular app
npx @angular/cli new mockapi-angular-test
cd mockapi-angular-test

# Install and start
npm start
```

## Testing Scenarios

### 1. Basic CRUD Operations

Test your frontend app's ability to:
- **GET** `/users` - List all users
- **GET** `/users/:id` - Get specific user
- **POST** `/users` - Create new user
- **PUT** `/users/:id` - Update user
- **DELETE** `/users/:id` - Delete user

### 2. Error Handling

Test how your app handles errors:
- Network failures
- 4xx/5xx responses
- Invalid data

### 3. Loading States

Test loading indicators with response delays:

```json
{
  "GET /users": {
    "status": 200,
    "delay": 2000,
    "response": [...]
  }
}
```

### 4. Authentication Flow

Test login/logout with conditional responses:

```json
{
  "POST /login": {
    "status": 200,
    "condition": "body.email === 'admin@example.com' && body.password === 'secret'",
    "response": {
      "token": "{{faker.string.alphanumeric(64)}}",
      "user": { "id": 1, "name": "Admin", "role": "admin" }
    }
  },
  "POST /login": {
    "status": 401,
    "response": { "error": "Invalid credentials" }
  }
}
```

### 5. Real-time Features

Test with dynamic data that changes on each request:

```json
{
  "GET /stats": {
    "status": 200,
    "response": {
      "timestamp": "{{date.now}}",
      "activeUsers": "{{random.number(100,500)}}",
      "revenue": "{{faker.commerce.price}}"
    }
  }
}
```

## Testing with Different Profiles

Create environment-specific tests:

### Development Profile
```yaml
profiles:
  development:
    GET /api/config:
      response:
        environment: "development"
        debug: true
        features: ["feature-a", "feature-b"]
```

### Staging Profile
```yaml
  staging:
    GET /api/config:
      response:
        environment: "staging"
        debug: false
        features: ["feature-a"]
```

Test profile switching:
```bash
# Test with development profile
node dist/cli.js config.yaml --profile development --port 3001

# Test with staging profile  
node dist/cli.js config.yaml --profile staging --port 3002
```

## Automated Testing

### Jest Tests with MockAPI

```javascript
// __tests__/api.test.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

describe('API Integration Tests', () => {
  test('should fetch users', async () => {
    const response = await axios.get(`${API_BASE_URL}/users`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  });

  test('should create user', async () => {
    const userData = { name: 'Test User', email: 'test@example.com' };
    const response = await axios.post(`${API_BASE_URL}/users`, userData);
    expect(response.status).toBe(201);
    expect(response.data.name).toBe(userData.name);
  });

  test('should handle login failure', async () => {
    try {
      await axios.post(`${API_BASE_URL}/login`, {
        email: 'wrong@example.com',
        password: 'wrong'
      });
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });
});
```

### Cypress E2E Tests

```javascript
// cypress/integration/mockapi.spec.js
describe('MockAPI Integration', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000'); // Your frontend app
  });

  it('should load and display users', () => {
    cy.get('[data-testid="users-list"]').should('be.visible');
    cy.get('[data-testid="user-card"]').should('have.length.gt', 0);
  });

  it('should create a new user', () => {
    cy.get('[data-testid="name-input"]').type('Cypress User');
    cy.get('[data-testid="email-input"]').type('cypress@example.com');
    cy.get('[data-testid="create-user-btn"]').click();
    
    cy.contains('User created successfully').should('be.visible');
  });
});
```

## Best Practices for Testing

### 1. Use Realistic Data
```json
{
  "GET /users": {
    "response": [
      {
        "id": 1,
        "name": "{{faker.person.fullName}}",
        "email": "{{faker.internet.email}}",
        "avatar": "{{faker.image.avatar}}",
        "address": {
          "street": "{{faker.location.streetAddress}}",
          "city": "{{faker.location.city}}",
          "country": "{{faker.location.country}}"
        }
      }
    ]
  }
}
```

### 2. Test Edge Cases
```json
{
  "GET /users": {
    "status": 200,
    "response": []
  },
  "GET /users/999": {
    "status": 404,
    "response": { "error": "User not found" }
  }
}
```

### 3. Simulate Network Conditions
```json
{
  "GET /slow-endpoint": {
    "status": 200,
    "delay": 3000,
    "response": { "message": "This was slow!" }
  }
}
```

### 4. Test Authentication States
```json
{
  "GET /protected": {
    "status": 401,
    "condition": "!headers.authorization",
    "response": { "error": "Unauthorized" }
  },
  "GET /protected": {
    "status": 200,
    "response": { "secret": "Protected data" }
  }
}
```

## Troubleshooting

### CORS Issues
If you get CORS errors, ensure MockAPI is started with `--cors`:
```bash
node dist/cli.js config.json --cors
```

### Port Conflicts
Use different ports for MockAPI and your frontend:
```bash
# MockAPI on 3001
node dist/cli.js config.json --port 3001

# Frontend on 3000 (default for most frameworks)
```

### Hot Reload Not Working
Ensure you're using `--watch` flag:
```bash
node dist/cli.js config.json --watch
```

This comprehensive testing setup will help you validate that MockAPI Responder works perfectly with real applications!