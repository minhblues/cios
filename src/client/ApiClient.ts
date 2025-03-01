import { RequestOptions, CancelToken } from '../request';
import { ApiResponse } from '../response';
import { ApiError } from '../error';
import { RequestInterceptor, ResponseInterceptor, ErrorInterceptor } from '../interceptors';
import { 
  buildUrlWithParams, 
  resolveUrl, 
  requestWithXHR,
  fetchWithTimeout,
  fetchWithProgressTracking
} from '../utils';

/**
 * Main API client class for making HTTP requests
 */
export class ApiClient {
  private baseUrl: string;
  private defaultOptions: RequestOptions;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];
  private rateLimitQueue: Map<string, Promise<any>> = new Map();

  /**
   * Create a new API client instance
   * 
   * @param baseUrl - Base URL for API requests
   * @param defaultOptions - Default options for all requests
   */
  constructor(baseUrl: string = '', defaultOptions: RequestOptions = {}) {
    this.baseUrl = baseUrl;
    this.defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 seconds default timeout
      retries: 0,
      retryDelay: 1000,
      retryStatusCodes: [408, 429, 500, 502, 503, 504],
      responseType: 'json',
      validateStatus: (status) => status >= 200 && status < 300,
      ...defaultOptions,
    };

    // Add default error interceptor for logging
    this.addErrorInterceptor((error) => {
      if (error instanceof ApiError) {
        console.error(`[ApiClient] ${error.name}: ${error.message}`, {
          statusCode: error.statusCode,
          responseData: error.responseData
        });
      } else {
        console.error(`[ApiClient] Error: ${error.message}`);
      }
      return error;
    });
  }

  /**
   * Create a new instance with custom configuration
   * 
   * @param config - Configuration for the new instance
   * @returns New ApiClient instance with the specified configuration
   */
  create(config: { baseUrl?: string; options?: RequestOptions }): ApiClient {
    return new ApiClient(
      config.baseUrl || this.baseUrl,
      { ...this.defaultOptions, ...config.options }
    );
  }

  /**
   * Set default headers for all requests
   * 
   * @param headers - Headers to set
   */
  setHeaders(headers: Record<string, string>): void {
    this.defaultOptions.headers = {
      ...this.defaultOptions.headers,
      ...headers
    };
  }

  /**
   * Set a specific default header
   * 
   * @param name - Header name
   * @param value - Header value
   */
  setHeader(name: string, value: string): void {
    if (!this.defaultOptions.headers) {
      this.defaultOptions.headers = {};
    }
    this.defaultOptions.headers[name] = value;
  }

  /**
   * Add a request interceptor
   * 
   * @param interceptor - Function to intercept requests
   * @returns Function to remove the interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      this.requestInterceptors = this.requestInterceptors.filter(i => i !== interceptor);
    };
  }

  /**
   * Add a response interceptor
   * 
   * @param interceptor - Function to intercept responses
   * @returns Function to remove the interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      this.responseInterceptors = this.responseInterceptors.filter(i => i !== interceptor);
    };
  }

  /**
   * Add an error interceptor
   * 
   * @param interceptor - Function to intercept errors
   * @returns Function to remove the interceptor
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
    this.errorInterceptors.push(interceptor);
    return () => {
      this.errorInterceptors = this.errorInterceptors.filter(i => i !== interceptor);
    };
  }

  /**
   * Clear all interceptors
   */
  clearInterceptors(): void {
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.errorInterceptors = [];
  }

  /**
   * Make a GET request to the specified endpoint
   * 
   * @param endpoint - API endpoint
   * @param options - Request options
   * @returns Promise resolving to an ApiResponse tuple
   */
  async get<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
      ...options,
    });
  }

  /**
   * Make a POST request to the specified endpoint
   * 
   * @param endpoint - API endpoint
   * @param data - Request body data
   * @param options - Request options
   * @returns Promise resolving to an ApiResponse tuple
   */
  async post<T>(
    endpoint: string, 
    data?: unknown, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data !== undefined ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  /**
   * Make a PUT request to the specified endpoint
   * 
   * @param endpoint - API endpoint
   * @param data - Request body data
   * @param options - Request options
   * @returns Promise resolving to an ApiResponse tuple
   */
  async put<T>(
    endpoint: string, 
    data?: unknown, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data !== undefined ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  /**
   * Make a PATCH request to the specified endpoint
   * 
   * @param endpoint - API endpoint
   * @param data - Request body data
   * @param options - Request options
   * @returns Promise resolving to an ApiResponse tuple
   */
  async patch<T>(
    endpoint: string, 
    data?: unknown, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data !== undefined ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  /**
   * Make a DELETE request to the specified endpoint
   * 
   * @param endpoint - API endpoint
   * @param options - Request options
   * @returns Promise resolving to an ApiResponse tuple
   */
  async delete<T>(
    endpoint: string, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      ...options,
    });
  }

  /**
   * Make a HEAD request to the specified endpoint
   * 
   * @param endpoint - API endpoint
   * @param options - Request options
   * @returns Promise resolving to an ApiResponse tuple
   */
  async head<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'HEAD',
      ...options,
    });
  }

  /**
   * Make an OPTIONS request to the specified endpoint
   * 
   * @param endpoint - API endpoint
   * @param options - Request options
   * @returns Promise resolving to an ApiResponse tuple
   */
  async options<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'OPTIONS',
      ...options,
    });
  }

  /**
   * Post form data (multipart/form-data)
   * 
   * @param endpoint - API endpoint
   * @param formData - Form data to send
   * @param options - Request options
   * @returns Promise resolving to an ApiResponse tuple
   */
  async postForm<T>(
    endpoint: string,
    formData: FormData,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    // Remove Content-Type header as browser will set it with boundary
    const { headers, ...restOptions } = options;
    const formOptions = {
      ...restOptions,
      headers: { ...headers }
    };
    
    if (formOptions.headers && 'Content-Type' in formOptions.headers) {
      delete formOptions.headers['Content-Type'];
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      ...formOptions,
    });
  }

  /**
   * Post URL-encoded form data
   * 
   * @param endpoint - API endpoint
   * @param data - Form data as key-value pairs
   * @param options - Request options
   * @returns Promise resolving to an ApiResponse tuple
   */
  async postUrlEncoded<T>(
    endpoint: string,
    data: Record<string, string>,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const formData = new URLSearchParams();
    for (const key in data) {
      formData.append(key, data[key]);
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...options.headers,
      },
      body: formData.toString(),
      ...options,
    });
  }

  /**
   * Download a file to the browser
   * 
   * @param endpoint - API endpoint for the file
   * @param filename - Optional filename for the download
   * @param options - Request options
   * @returns Promise resolving to an ApiResponse tuple
   */
  async downloadFile(
    endpoint: string, 
    filename?: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<void>> {
    try {
      const [error, blob] = await this.request<Blob>(endpoint, {
        method: 'GET',
        responseType: 'blob',
        ...options,
      });

      if (error || !blob) {
        return [error || new Error('Download failed'), null];
      }

      // Create a download link and trigger it
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or use provided filename
      if (!filename) {
        // This information would be in a real Response object's headers
        // but since we're working with the blob directly, we'd need to 
        // capture the headers before converting to blob
        filename = 'download';
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Clean up the URL object
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
      
      return [null, null];
    } catch (error) {
      return [error instanceof Error ? error : new Error(String(error)), null];
    }
  }

  /**
   * Make multiple requests in parallel and handle errors appropriately
   * 
   * @param requests - Array of request functions to execute
   * @returns Promise resolving to an ApiResponse tuple with array of results
   */
  async all<T extends any[]>(
    requests: (() => Promise<ApiResponse<any>>)[]
  ): Promise<[Error | null, T | null]> {
    try {
      const results = await Promise.all(
        requests.map(request => 
          request().catch(error => {
            // Convert rejections to ApiResponse format to prevent Promise.all from failing early
            return [error instanceof Error ? error : new Error(String(error)), null] as ApiResponse<any>;
          })
        )
      );
      
      // Check if any request failed
      const errors = results.filter(([error]) => error !== null).map(([error]) => error);
      
      if (errors.length > 0) {
        // If multiple errors occurred, create an aggregate error
        if (errors.length > 1) {
          const combinedMessage = errors
            .map((err, index) => `Request ${index}: ${err?.message || 'Unknown error'}`)
            .join('; ');
            
          return [new ApiError(`Multiple requests failed: ${combinedMessage}`), null];
        }
        
        // Return the single error
        return [errors[0] || new Error('Unknown error'), null];
      }
      
      // Extract data from all successful responses
      const data = results.map(([, data]) => data) as T;
      return [null, data];
    } catch (error) {
      if (error instanceof Error) {
        return [error, null];
      }
      return [new Error(String(error)), null];
    }
  }

  /**
   * Make a request to the specified endpoint with the given options
   * 
   * @param endpoint - API endpoint
   * @param options - Request options
   * @returns Promise resolving to an ApiResponse tuple
   */
  private async request<T>(
    endpoint: string, 
    options: RequestOptions
  ): Promise<ApiResponse<T>> {
    const mergedOptions: RequestOptions = this.mergeOptions(options);
    
    // Handle query parameters
    const url = buildUrlWithParams(
      resolveUrl(endpoint, mergedOptions.baseUrl || this.baseUrl),
      mergedOptions.params, 
      mergedOptions.paramsSerializer
    );
    
    let retries = mergedOptions.retries || 0;

    try {
      // Handle cancel token
      const cancelToken = mergedOptions.cancelToken;
      if (cancelToken) {
        cancelToken.throwIfRequested();
      }

      // Choose between fetch and XMLHttpRequest based on options
      if (mergedOptions.useXMLHttpRequest && (mergedOptions.onUploadProgress || mergedOptions.onDownloadProgress)) {
        return requestWithXHR<T>(url, mergedOptions);
      }

      // Create the request object for interceptors (without the body for proper type handling)
      const { body, ...requestOptions } = mergedOptions;
      let request = new Request(url, {
        ...requestOptions,
        body: body as BodyInit | null | undefined,
      });
      
      // Apply request interceptors
      request = await this.applyRequestInterceptors(request);

      // Register cancel token callback if present
      let abortController: AbortController | undefined;
      if (cancelToken) {
        abortController = new AbortController();
        request = new Request(request, {
          signal: abortController.signal
        });
        
        cancelToken.register(reason => {
          if (abortController) {
            abortController.abort();
          }
        });
      }

      // Rate limiting for specific endpoints
      if (mergedOptions.method === 'GET') {
        // Check if we need to throttle this request (only for GETs for simplicity)
        const domain = new URL(url).hostname;
        
        if (this.rateLimitQueue.has(domain)) {
          // Wait for the previous request to complete
          await this.rateLimitQueue.get(domain);
        }
        
        // Create a new promise for this request
        let resolveRateLimit: () => void;
        const rateLimitPromise = new Promise<void>(resolve => {
          resolveRateLimit = resolve;
        });
        
        this.rateLimitQueue.set(domain, rateLimitPromise);
        
        // After this request is done, resolve the promise and remove it after a delay
        setTimeout(() => {
          resolveRateLimit!();
          this.rateLimitQueue.delete(domain);
        }, 100); // 100ms between requests to the same domain
      }

      // Perform the fetch with timeout and progress tracking
      let response;
      if (mergedOptions.onUploadProgress || mergedOptions.onDownloadProgress) {
        response = await fetchWithProgressTracking(request, mergedOptions);
      } else {
        response = await fetchWithTimeout(request, mergedOptions.timeout);
      }
      
      // Apply response interceptors
      response = await this.applyResponseInterceptors(response);
      
      // Check if the status is considered valid
      const validateStatus = mergedOptions.validateStatus || this.defaultOptions.validateStatus;
      if (validateStatus && !validateStatus(response.status)) {
        let errorData: unknown;
        try {
          // Clone the response before consuming its body
          const responseClone = response.clone();
          
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorData = await responseClone.json();
          } else {
            errorData = await responseClone.text();
          }
        } catch {
          // If response cannot be processed, use status text
          errorData = response.statusText;
        }

        throw new ApiError(
          `Request failed with status ${response.status}`,
          response.status,
          errorData,
          request,
          response
        );
      }

      // Process response based on responseType
      let responseData: T;
      const responseType = mergedOptions.responseType || 'json';
      
      try {
        switch (responseType) {
          case 'text':
            responseData = await response.text() as unknown as T;
            break;
          case 'blob':
            responseData = await response.blob() as unknown as T;
            break;
          case 'arrayBuffer':
            responseData = await response.arrayBuffer() as unknown as T;
            break;
          case 'formData':
            responseData = await response.formData() as unknown as T;
            break;
          case 'json':
          default:
            // Handle empty responses gracefully
            const text = await response.text();
            
            try {
              responseData = text ? JSON.parse(text) : null as unknown as T;
            } catch (parseError) {
              throw new ApiError(
                `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
                response.status,
                text,
                request,
                response
              );
            }
            break;
        }
      } catch (processingError) {
        throw new ApiError(
          `Failed to process response: ${processingError instanceof Error ? processingError.message : String(processingError)}`,
          response.status,
          undefined,
          request,
          response
        );
      }

      return [null, responseData];
    } catch (error) {
      // Handle retries if configured
      if (retries > 0 && this.shouldRetry(error, mergedOptions.retryStatusCodes)) {
        return this.retryRequest<T>(endpoint, options, retries);
      }

      // Apply error interceptors
      let processedError: Error;
      
      if (error instanceof Error) {
        processedError = await this.applyErrorInterceptors(error);
      } else {
        processedError = await this.applyErrorInterceptors(new Error(String(error)));
      }
      
      return [processedError, null];
    }
  }

  /**
   * Apply all request interceptors in sequence
   * 
   * @param request - The request to intercept
   * @returns Promise resolving to the intercepted request
   */
  private async applyRequestInterceptors(request: Request): Promise<Request> {
    let interceptedRequest = request;
    
    for (const interceptor of this.requestInterceptors) {
      interceptedRequest = await interceptor(interceptedRequest);
    }
    
    return interceptedRequest;
  }

  /**
   * Apply all response interceptors in sequence
   * 
   * @param response - The response to intercept
   * @returns Promise resolving to the intercepted response
   */
  private async applyResponseInterceptors(response: Response): Promise<Response> {
    let interceptedResponse = response;
    
    for (const interceptor of this.responseInterceptors) {
      interceptedResponse = await interceptor(interceptedResponse);
    }
    
    return interceptedResponse;
  }

  /**
   * Apply all error interceptors in sequence
   * 
   * @param error - The error to intercept
   * @returns Promise resolving to the intercepted error
   */
  private async applyErrorInterceptors(error: Error): Promise<Error> {
    let interceptedError = error;
    
    for (const interceptor of this.errorInterceptors) {
      interceptedError = await interceptor(interceptedError);
    }
    
    return interceptedError;
  }

  /**
   * Retry a failed request
   * 
   * @param endpoint - API endpoint
   * @param options - Request options
   * @param retriesLeft - Number of retries remaining
   * @returns Promise resolving to an ApiResponse tuple
   */
  private async retryRequest<T>(
    endpoint: string,
    options: RequestOptions,
    retriesLeft: number
  ): Promise<ApiResponse<T>> {
    const delay = options.retryDelay || this.defaultOptions.retryDelay || 1000;
    
    // Use exponential backoff for retries
    const adjustedDelay = delay * Math.pow(2, (this.defaultOptions.retries || 0) - retriesLeft);
    
    await new Promise(resolve => setTimeout(resolve, adjustedDelay));
    
    const newOptions = {
      ...options,
      retries: retriesLeft - 1,
    };
    
    return this.request<T>(endpoint, newOptions);
  }

  /**
   * Determine if a request should be retried based on the error
   * 
   * @param error - The error that occurred
   * @param retryStatusCodes - HTTP status codes that should trigger a retry
   * @returns Whether the request should be retried
   */
  private shouldRetry(error: unknown, retryStatusCodes?: number[]): boolean {
    // Retry network errors and timeout errors
    if (error instanceof TypeError) {
      return true;
    }
    
    if (error instanceof ApiError) {
      // Retry specific status codes
      if (error.statusCode && retryStatusCodes?.includes(error.statusCode)) {
        return true;
      }
      
      // Retry server errors (5xx)
      if (error.statusCode && error.statusCode >= 500 && error.statusCode < 600) {
        return true;
      }
      
      // Retry timeout errors
      if (error.isTimeoutError()) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Merge default options with request-specific options
   * 
   * @param options - Request-specific options
   * @returns Merged options
   */
  private mergeOptions(options: RequestOptions): RequestOptions {
    return {
      ...this.defaultOptions,
      ...options,
      headers: {
        ...this.defaultOptions.headers,
        ...options.headers,
      },
    };
  }
}