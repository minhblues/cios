/**
 * Examples demonstrating request cancellation
 */
import { ApiClient, CancelToken } from '../src';

async function cancellationExamples() {
  // Create a client instance
  const api = new ApiClient('https://jsonplaceholder.typicode.com');
  
  // Example 1: Basic cancellation
  console.log('Example 1: Basic cancellation');
  
  // Create a cancel token
  const source = CancelToken.source();
  
  // Create a promise that we can await
  const requestPromise = (async () => {
    const [error, data] = await api.get('/posts', {
      cancelToken: source.token
    });
    
    if (error) {
      console.log(`Request result: ${error.message}`);
      if (error.message.includes('cancel')) {
        console.log('✓ Request was successfully cancelled');
      }
    } else {
      console.log(`Request completed with ${data?.length} items`);
    }
  })();
  
  // Cancel the request after a short delay
  setTimeout(() => {
    console.log('Cancelling the request...');
    source.cancel('Operation cancelled by user');
  }, 50);
  
  // Wait for the request to complete (or be cancelled)
  await requestPromise;
  
  // Example 2: Cancellation with reason
  console.log('\nExample 2: Cancellation with custom reason');
  
  const source2 = CancelToken.source();
  
  const request2Promise = (async () => {
    try {
      const [error, data] = await api.get('/comments', {
        cancelToken: source2.token
      });
      
      if (error) {
        console.log(`Request result: ${error.message}`);
      } else {
        console.log(`Request completed with ${data?.length} items`);
      }
    } catch (e) {
      console.log(`Caught exception: ${e instanceof Error ? e.message : String(e)}`);
    }
  })();
  
  // Cancel with custom reason
  setTimeout(() => {
    console.log('Cancelling with custom reason...');
    source2.cancel('User navigated away from page');
  }, 50);
  
  await request2Promise;
  
  // Example 3: Multiple requests with the same token
  console.log('\nExample 3: Multiple requests with the same cancel token');
  
  const source3 = CancelToken.source();
  
  // Start multiple requests with the same token
  const request3Promise1 = api.get('/posts/1', { cancelToken: source3.token });
  const request3Promise2 = api.get('/posts/2', { cancelToken: source3.token });
  const request3Promise3 = api.get('/posts/3', { cancelToken: source3.token });
  
  // Cancel all requests at once
  setTimeout(() => {
    console.log('Cancelling all requests at once...');
    source3.cancel('Batch cancellation');
  }, 50);
  
  // Wait for all requests and check their outcomes
  const results = await Promise.all([
    request3Promise1.catch(e => ['caught', e]),
    request3Promise2.catch(e => ['caught', e]),
    request3Promise3.catch(e => ['caught', e])
  ]);
  
  results.forEach((result, index) => {
    if (result[0] === 'caught') {
      console.log(`Request ${index + 1} caught exception`);
    } else {
      const [error, data] = result;
      if (error) {
        console.log(`Request ${index + 1} returned error: ${error.message}`);
      } else {
        console.log(`Request ${index + 1} completed successfully`);
      }
    }
  });
  
  // Example 4: Checking if a token has been cancelled
  console.log('\nExample 4: Checking if a token has been cancelled');
  
  const source4 = CancelToken.source();
  
  // Cancel the token immediately
  source4.cancel('Pre-cancelled token');
  
  try {
    // This will throw an exception
    source4.token.throwIfRequested();
    console.log('Token was not cancelled (this should not be printed)');
  } catch (e) {
    console.log(`✓ Token was already cancelled: ${e instanceof Error ? e.message : String(e)}`);
  }
  
  // Try to make a request with the already-cancelled token
  const [error4] = await api.get('/posts/4', {
    cancelToken: source4.token
  });
  
  console.log(`Request with pre-cancelled token: ${error4?.message}`);
}

// Run the examples
cancellationExamples().catch(err => {
  console.error('Unhandled error occurred:', err);
});