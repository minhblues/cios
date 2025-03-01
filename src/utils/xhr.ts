import { ApiError } from '../error';
import { ApiResponse } from '../response';
import { RequestOptions } from '../request';
import { CancelToken } from '../request/CancelToken';

/**
 * Make a request using XMLHttpRequest for accurate progress tracking
 *
 * @param url - The URL to request
 * @param options - Request options
 * @returns Promise resolving to an ApiResponse tuple
 */
export function requestWithXHR<T>(url: string, options: RequestOptions): Promise<ApiResponse<T>> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    
    // Set up progress handlers
    if (options.onUploadProgress) {
      xhr.upload.onprogress = options.onUploadProgress;
    }
    
    if (options.onDownloadProgress) {
      xhr.onprogress = options.onDownloadProgress;
    }
    
    // Open the request
    xhr.open(options.method || 'GET', url, true);
    
    // Set request headers
    if (options.headers) {
      const headers = options.headers as Record<string, string>;
      for (const key in headers) {
        xhr.setRequestHeader(key, headers[key]);
      }
    }
    
    // Set withCredentials for CORS requests
    if (options.withCredentials) {
      xhr.withCredentials = true;
    }
    
    // Set timeout
    if (options.timeout) {
      xhr.timeout = options.timeout;
    }
    
    // Handle response
    xhr.onload = function() {
      let responseData: any = null;
      
      try {
        const responseType = options.responseType || 'json';
        
        switch (responseType) {
          case 'text':
            responseData = xhr.responseText;
            break;
          case 'blob':
            responseData = xhr.response;
            break;
          case 'arrayBuffer':
            responseData = xhr.response;
            break;
          case 'formData':
            // FormData is not directly supported in XHR response
            throw new Error('formData responseType is not supported with XMLHttpRequest');
          case 'json':
          default:
            // Handle empty responses
            if (xhr.responseText) {
              responseData = JSON.parse(xhr.responseText);
            }
            break;
        }
        
        // Validate status
        const validateStatus = options.validateStatus || ((status) => status >= 200 && status < 300);
        
        if (!validateStatus(xhr.status)) {
          resolve([new ApiError(
            `Request failed with status ${xhr.status}`,
            xhr.status,
            responseData
          ), null]);
          return;
        }
        
        resolve([null, responseData]);
      } catch (error) {
        resolve([error instanceof Error ? error : new Error(String(error)), null]);
      }
    };
    
    // Handle errors
    xhr.onerror = function() {
      resolve([new ApiError('Network error occurred', xhr.status), null]);
    };
    
    xhr.ontimeout = function() {
      resolve([new ApiError(`Request timed out after ${options.timeout}ms`, xhr.status), null]);
    };
    
    // Handle cancellation
    if (options.cancelToken) {
      options.cancelToken.register(() => {
        xhr.abort();
        resolve([new ApiError('Request canceled', undefined, options.cancelToken?.reason), null]);
      });
    }
    
    // Send the request
    xhr.send(options.body as Document | XMLHttpRequestBodyInit | null | undefined);
  });
}