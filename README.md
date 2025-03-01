# HTTP Client TS

A flexible and powerful HTTP client for TypeScript applications with a clean, Promise-based API.

## Features

- 🔄 Consistent error handling with standardized response format
- ⏱️ Request timeouts and cancellation
- 🔁 Automatic request retries with exponential backoff
- 🚦 Request/response/error interceptors
- 📊 Progress tracking for uploads and downloads
- 📁 File download utilities
- 🛡️ TypeScript support with strong typing
- 🔄 Rate limiting for API requests
- 🚀 Compatible with browsers and Node.js

## Installation

```bash
npm install cios
```

## Basic Usage

```typescript
import { ApiClient } from 'cios';

// Create an API client instance
const api = new ApiClient('https://api.example.com');

// Make a GET request
const [error, data] = await api.get('/users');

if (error) {
  console.error('Error fetching users:', error.message);
} else {
  console.log('Users:', data);
}
```

## Making Different Types of Requests

```typescript
// GET request with parameters
const [, users] = await api.get('/users', { 
  params: { page: 1, limit: 10 } 
});

// POST request with JSON body
const [, newUser] = await api.post('/users', { 
  name: 'John Doe', 
  email: 'john@example.com' 
});

// PUT request
const [, updatedUser] = await api.put('/users/1', { 
  name: 'John Smith' 
});

// DELETE request
const [, deleteResult] = await api.delete('/users/1');

// Form submission (multipart/form-data)
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('description', 'My file');

const [, uploadResult] = await api.postForm('/upload', formData);

// Form submission (application/x-www-form-urlencoded)
const [, loginResult] = await api.postUrlEncoded('/login', {
  username: 'john',
  password: 'secret'
});
```

## Error Handling

The API client returns a tuple with `[error, data]` for all requests:

```typescript
const [error, data] = await api.get('/users');

if (error) {
  if (error.statusCode === 404) {
    console.error('Resource not found');
  } else if (error.isNetworkError()) {
    console.error('Network error. Please check your connection.');
  } else if (error.isTimeoutError()) {
    console.error('Request timed out. Please try again.');
  } else {
    console.error('An error occurred:', error.message);
  }
} else {
  // Process data
  console.log(data);
}
```

## Request Configuration

```typescript
const [, data] = await api.get('/users', {
  // Query parameters
  params: { page: 1, limit: 10 },
  
  // Request timeout (milliseconds)
  timeout: 5000,
  
  // Retry configuration
  retries: 3,
  retryDelay: 1000,
  retryStatusCodes: [429, 503],
  
  // Custom headers
  headers: {
    'X-Custom-Header': 'value'
  },
  
  // Response type (default is 'json')
  responseType: 'text',
  
  // Override base URL for this request
  baseUrl: 'https://api2.example.com',
  
  // Progress tracking
  onUploadProgress: (event) => {
    const percent = Math.round((event.loaded / event.total) * 100);
    console.log(`Upload progress: ${percent}%`);
  },
  
  onDownloadProgress: (event) => {
    const percent = Math.round((event.loaded / event.total) * 100);
    console.log(`Download progress: ${percent}%`);
  }
});
```

## Using Interceptors

```typescript
// Add a request interceptor
const removeRequestInterceptor = api.addRequestInterceptor(request => {
  // Add a timestamp to each request
  const url = new URL(request.url);
  url.searchParams.append('_t', Date.now().toString());
  
  return new Request(url.toString(), request);
});

// Add a response interceptor
const removeResponseInterceptor = api.addResponseInterceptor(response => {
  console.log(`Response received from ${response.url}`);
  return response;
});

// Add an error interceptor
const removeErrorInterceptor = api.addErrorInterceptor(error => {
  // Log all errors
  console.error('API Error:', error.message);
  return error;
});

// Remove interceptors when no longer needed
removeRequestInterceptor();
removeResponseInterceptor();
removeErrorInterceptor();

// Or clear all interceptors
api.clearInterceptors();
```

## Request Cancellation

```typescript
// Create a cancel token
const { token, cancel } = CancelToken.source();

// Start a request with the token
const fetchUsers = async () => {
  const [error, data] = await api.get('/users', {
    cancelToken: token
  });
  
  if (error) {
    if (error.isCancellationError()) {
      console.log('Request was cancelled');
    } else {
      console.error('Error:', error.message);
    }
  } else {
    console.log('Users:', data);
  }
};

// Start the request
const requestPromise = fetchUsers();

// Cancel the request after 2 seconds
setTimeout(() => {
  cancel('Operation took too long');
}, 2000);

await requestPromise;
```

## Downloading Files

```typescript
// Download a file
await api.downloadFile('/files/report.pdf', 'monthly-report.pdf');

// Specify additional options for the download
await api.downloadFile('/files/large-data.xlsx', 'data.xlsx', {
  timeout: 30000, // Longer timeout for large files
  onDownloadProgress: (event) => {
    const percent = Math.round((event.loaded / event.total) * 100);
    console.log(`Download progress: ${percent}%`);
  }
});
```

## Parallel Requests

```typescript
// Make multiple requests in parallel
const [error, results] = await api.all([
  () => api.get('/users'),
  () => api.get('/products'),
  () => api.get('/orders')
]);

if (error) {
  console.error('One or more requests failed:', error.message);
} else {
  const [users, products, orders] = results;
  console.log('Users:', users);
  console.log('Products:', products);
  console.log('Orders:', orders);
}
```

## Creating Multiple Client Instances

```typescript
// Create the base client
const baseClient = new ApiClient('https://api.example.com');

// Create a client for a different API
const otherClient = baseClient.create({
  baseUrl: 'https://api2.example.com',
  options: {
    timeout: 20000,
    headers: {
      'X-API-Key': 'your-api-key'
    }
  }
});

// Use different clients for different APIs
const [, userData] = await baseClient.get('/users');
const [, analyticsData] = await otherClient.get('/analytics');
```

## Setting Default Headers

```typescript
// Set multiple headers at once
api.setHeaders({
  'X-API-Key': 'your-api-key',
  'Accept-Language': 'en-US'
});

// Set a single header
api.setHeader('Authorization', `Bearer ${token}`);
```

## TypeScript Support

The library provides full TypeScript support for request and response types:

```typescript
// Define your data types
interface User {
  id: number;
  name: string;
  email: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
}

// Use with type parameters
const [error, users] = await api.get<User[]>('/users');
if (!error && users) {
  users.forEach(user => {
    console.log(`User: ${user.name} (${user.email})`);
  });
}

// With request body type
const newUser: CreateUserRequest = {
  name: 'John Doe',
  email: 'john@example.com',
  password: 'secure-password'
};

const [, createdUser] = await api.post<User>('/users', newUser);
```

## Advanced Configuration

### Custom Default Options

```typescript
const api = new ApiClient('https://api.example.com', {
  timeout: 15000,
  retries: 2,
  retryDelay: 500,
  headers: {
    'X-Client-ID': 'your-client-id',
    'Accept': 'application/json'
  },
  validateStatus: (status) => status >= 200 && status < 500
});
```

### Using with XMLHttpRequest for Accurate Progress

```typescript
const [, data] = await api.get('/large-file', {
  useXMLHttpRequest: true,
  onDownloadProgress: (event) => {
    const percent = Math.round((event.loaded / event.total) * 100);
    console.log(`Download progress: ${percent}%`);
  }
});
```

## Browser Compatibility

This library works in all modern browsers that support Fetch API, Promises, and other ES2015+ features. For older browsers, you may need to include polyfills for:

- Fetch API
- Promise
- URL and URLSearchParams
- AbortController

## Node.js Compatibility

To use in Node.js environments, you'll need to provide polyfills for browser-specific APIs:

```typescript
// Set up for Node.js environment
import nodeFetch from 'node-fetch';
import { AbortController } from 'abort-controller';
import { URL, URLSearchParams } from 'url';

// Polyfill globals
global.fetch = nodeFetch;
global.Request = nodeFetch.Request;
global.Response = nodeFetch.Response;
global.Headers = nodeFetch.Headers;
global.AbortController = AbortController;
global.URL = URL;
global.URLSearchParams = URLSearchParams;

// Now you can use the client
import { ApiClient } from 'cios';
const api = new ApiClient('https://api.example.com');
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.