/**
 * Custom API error class with enhanced error information
 */
export class ApiError extends Error {
  /**
   * Creates a new API error
   *
   * @param message - Error message
   * @param statusCode - HTTP status code (if applicable)
   * @param responseData - Response data from the server
   * @param request - The original request object
   * @param response - The response object
   */
  constructor(
    message: string,
    public statusCode?: number,
    public responseData?: unknown,
    public request?: Request,
    public response?: Response
  ) {
    super(message);
    this.name = "ApiError";

    // Ensures proper stack trace in modern JS engines
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Check if error is a network error
   */
  isNetworkError(): boolean {
    return this.message.includes("network") || this.message.includes("fetch");
  }

  /**
   * Check if error is a timeout error
   */
  isTimeoutError(): boolean {
    return (
      this.message.includes("timeout") || this.message.includes("timed out")
    );
  }

  /**
   * Check if error is a cancellation error
   */
  isCancellationError(): boolean {
    return this.message.includes("cancel") || this.message.includes("abort");
  }
}
