/**
 * Basic usage examples for the HTTP client
 */
import { ApiClient } from '../src'

async function basicExamples() {
  // Create a client instance
  const api = new ApiClient('https://jsonplaceholder.typicode.com');
  
  // Basic GET request
  console.log('Making GET request...');
  const [getError, posts] = await api.get('/posts');
  
  if (getError) {
    console.error('Error fetching posts:', getError.message);
  } else {
    console.log(`Successfully fetched ${posts?.length} posts`);
    console.log('First post:', posts?.[0]);
  }
  
  // POST request with JSON body
  console.log('\nMaking POST request...');
  const newPost = {
    title: 'My New Post',
    body: 'This is the content of my post.',
    userId: 1
  };
  
  const [postError, createdPost] = await api.post('/posts', newPost);
  
  if (postError) {
    console.error('Error creating post:', postError.message);
  } else {
    console.log('Successfully created post:');
    console.log(createdPost);
  }
  
  // Request with query parameters
  console.log('\nFetching filtered posts...');
  const [filterError, filteredPosts] = await api.get('/posts', {
    params: { userId: 1 }
  });
  
  if (filterError) {
    console.error('Error fetching filtered posts:', filterError.message);
  } else {
    console.log(`Successfully fetched ${filteredPosts?.length} posts for user 1`);
  }
  
  // Using a different response type
  console.log('\nFetching post as text...');
  const [textError, textResponse] = await api.get('/posts/1', {
    responseType: 'text'
  });
  
  if (textError) {
    console.error('Error fetching post as text:', textError.message);
  } else {
    console.log('Text response preview:', textResponse?.substring(0, 100) + '...');
  }
}

// Run the examples
basicExamples().catch(err => {
  console.error('Unhandled error occurred:', err);
});