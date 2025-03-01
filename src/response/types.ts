/**
 * Type definitions for API responses
 */

/**
 * Response tuple format for all API calls
 * First element is error (if any), second is the data (if successful)
 *
 * @template T The type of the response data
 */
export type ApiResponse<T> = [Error | null, T | null];
