/**
 * Examples demonstrating the use of interceptors
 */
import { ApiClient } from '../src';

async function interceptorExamples() {
  // Create a client instance
  const api = new ApiClient('https://jsonplaceholder.typicode.com');
  
  // Add a request interceptor to add a timestamp to all requests
  api.addRequestInterceptor(request => {
    const url = new URL(request.url);
    url.searchParams.append('_t', Date.now().toString());
    
    console.log(`[Request Interceptor] Adding timestamp to request: ${url.toString()}`);
    
    return new Request(url.toString(), request);
  });
  
  // Add a request interceptor to log all outgoing requests
  api.addRequestInterceptor(request => {
    console.log(`[Request Interceptor] Outgoing ${request.method} request to ${request.url}`);
    return request;
  });
  
  // Add a response interceptor to log all incoming responses
  api.addResponseInterceptor(response => {
    console.log(`[Response Interceptor] Received response from ${response.url} with status ${response.status}`);
    return response;
  });
  
  // Add an error interceptor to handle specific errors
  api.addErrorInterceptor(error => {
    console.log(`[Error Interceptor] Handling error: ${error.message}`);
    
    // You could modify the error or perform additional actions here
    return error;
  });
  
  // Make a request to see the interceptors in action
  console.log('\nMaking a request with interceptors active...');
  const [error, posts] = await api.get('/posts');
  
  if (error) {
    console.error('Error fetching posts:', error.message);
  } else {
    console.log(`Successfully fetched ${posts?.length} posts`);
  }
  
  // Example of removing an interceptor
  console.log('\nAdding and then removing an interceptor...');
  
  // Add a temporary interceptor
  const removeInterceptor = api.addRequestInterceptor(request => {
    console.log('[Temporary Interceptor] This interceptor will be removed');
    return request;
  });
  
  // Make a request with the temporary interceptor
  await api.get('/posts/1');
  
  // Remove the interceptor
  removeInterceptor();
  console.log('Interceptor removed');
  
  // Make another request to verify the interceptor is gone
  console.log('\nMaking a request after removing the temporary interceptor...');
  await api.get('/posts/2');
  
  // Clear all interceptors
  console.log('\nClearing all interceptors...');
  api.clearInterceptors();
  
  // Make a final request with no interceptors
  console.log('\nMaking a request with no interceptors...');
  const [finalError, finalPosts] = await api.get('/posts/3');
  
  if (finalError) {
    console.error('Error fetching post:', finalError.message);
  } else {
    console.log('Successfully fetched post');
  }
}

// Run the examples
interceptorExamples().catch(err => {
  console.error('Unhandled error occurred:', err);
});