import { RequestOptions } from '../request';

/**
 * Execute fetch with a timeout
 * 
 * @param request - The request to execute
 * @param timeout - Timeout in milliseconds
 * @returns Promise resolving to a Response object
 */
export async function fetchWithTimeout(
  request: Request, 
  timeout?: number
): Promise<Response> {
  if (!timeout) {
    return fetch(request);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    // Create new request with abort signal
    const requestWithSignal = new Request(request, {
      signal: controller.signal
    });
    
    const response = await fetch(requestWithSignal);
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Execute fetch with progress tracking
 * 
 * @param request - The request to execute
 * @param options - Request options with progress callbacks and timeout
 * @returns Promise resolving to a Response object
 */
export async function fetchWithProgressTracking(
  request: Request,
  options: RequestOptions
): Promise<Response> {
  const { timeout, onUploadProgress, onDownloadProgress } = options;
  
  if (onUploadProgress && request.body) {
    // This is a simplified approximation as fetch API doesn't provide upload progress
    const contentLength = request.headers.get('Content-Length');
    if (contentLength) {
      const total = parseInt(contentLength, 10);
      onUploadProgress(new ProgressEvent('upload', { lengthComputable: true, loaded: 0, total }));
      
      // Simulate upload complete
      setTimeout(() => {
        onUploadProgress(new ProgressEvent('upload', { lengthComputable: true, loaded: total, total }));
      }, 10);
    }
  }
  
  let controller: AbortController | undefined;
  let timeoutId: number | undefined;
  
  if (timeout) {
    controller = new AbortController();
    timeoutId = window.setTimeout(() => controller?.abort(), timeout);
  }
  
  try {
    const requestWithSignal = controller 
      ? new Request(request, { signal: controller.signal }) 
      : request;
    
    const response = await fetch(requestWithSignal);
    
    if (onDownloadProgress) {
      // This implementation provides real download progress tracking
      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      
      onDownloadProgress(new ProgressEvent('download', { 
        lengthComputable: !!contentLength, 
        loaded: 0, 
        total 
      }));
      
      // Clone response to avoid consuming the body
      const clonedResponse = response.clone();
      
      // Read response as it streams to track progress
      const reader = clonedResponse.body?.getReader();
      let loaded = 0;
      
      if (reader && total > 0) {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }
          
          loaded += value.length;
          onDownloadProgress(new ProgressEvent('download', { 
            lengthComputable: true, 
            loaded, 
            total 
          }));
        }
      }
    }
    
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw error;
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}