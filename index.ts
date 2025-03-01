/**
 * Main entry point for the HTTP client library
 * Exports all public components and types
 */

// Export the main client
export { ApiClient } from './client';

// Export error handling
export { ApiError } from './error';

// Export request related types and classes
export { 
  CancelToken,
  RequestOptions,
} from './request';

// Export response types
export { 
  ApiResponse,
} from './response';

// Export interceptor types
export {
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
} from './interceptors';

// Create and export a default instance
import { ApiClient } from './client';
const defaultInstance = new ApiClient();
export default defaultInstance;