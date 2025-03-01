/**
 * Configuration options for API requests
 */
export interface RequestOptions extends RequestInit {
    /**
     * Base URL to use for the request
     * Overrides the client's baseUrl if provided
     */
    baseUrl?: string;
    
    /**
     * Request timeout in milliseconds
     */
    timeout?: number;
    
    /**
     * Number of times to retry the request if it fails
     */
    retries?: number;
    
    /**
     * Delay between retries in milliseconds
     */
    retryDelay?: number;
    
    /**
     * HTTP status codes that should trigger a retry
     */
    retryStatusCodes?: number[];
    
    /**
     * Query parameters to append to the URL
     */
    params?: Record<string, any>;
    
    /**
     * Custom function to serialize the params object into a query string
     */
    paramsSerializer?: (params: Record<string, any>) => string;
    
    /**
     * Expected response type
     */
    responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData';
    
    /**
     * Function to determine if a response status should be considered successful
     */
    validateStatus?: (status: number) => boolean;
    
    /**
     * Token for cancelling the request
     */
    cancelToken?: import('./CancelToken').CancelToken;
    
    /**
     * Whether to use XMLHttpRequest instead of fetch for accurate progress tracking
     */
    useXMLHttpRequest?: boolean;
    
    /**
     * Callback for tracking upload progress
     */
    onUploadProgress?: (progressEvent: ProgressEvent) => void;
    
    /**
     * Callback for tracking download progress
     */
    onDownloadProgress?: (progressEvent: ProgressEvent) => void;
    
    /**
     * Whether to include credentials in cross-origin requests
     */
    withCredentials?: boolean;
  }