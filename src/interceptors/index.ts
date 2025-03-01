/**
 * Type definitions for interceptors
 */

/**
 * Request interceptor function type
 * Takes a request and returns a potentially modified request
 */
export type RequestInterceptor = (request: Request) => Promise<Request> | Request;

/**
 * Response interceptor function type
 * Takes a response and returns a potentially modified response
 */
export type ResponseInterceptor = (response: Response) => Promise<Response> | Response;

/**
 * Error interceptor function type
 * Takes an error and returns a potentially modified error
 */
export type ErrorInterceptor = (error: Error) => Promise<Error> | Error;