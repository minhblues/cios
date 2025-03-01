import { ApiError } from "../error";

/**
 * Cancel token class for request cancellation
 * Implements a mechanism to cancel pending requests
 */
export class CancelToken {
  private _reason?: string;
  private _callbacks: Array<(reason?: string) => void> = [];

  /**
   * Get the cancellation reason
   */
  get reason(): string | undefined {
    return this._reason;
  }

  /**
   * Throws an error if this token has been cancelled
   * @throws {ApiError} If token has been cancelled
   */
  throwIfRequested(): void {
    if (this._reason) {
      throw new ApiError(
        `Request canceled: ${this._reason}`,
        undefined,
        this._reason
      );
    }
  }

  /**
   * Cancel requests that use this token
   *
   * @param reason - Optional reason for cancellation
   */
  cancel(reason?: string): void {
    this._reason = reason || "Operation canceled by user";
    this._callbacks.forEach((callback) => callback(this._reason));
    this._callbacks = [];
  }

  /**
   * Register a cancellation callback
   *
   * @param callback - Function to call if the request is cancelled
   */
  register(callback: (reason?: string) => void): void {
    if (this._reason) {
      callback(this._reason);
      return;
    }
    this._callbacks.push(callback);
  }

  /**
   * Create a new CancelToken and its cancel function
   * @returns Object containing the token and cancel function
   */
  static source(): { token: CancelToken; cancel: (reason?: string) => void } {
    let cancel: (reason?: string) => void = () => {};
    const token = new CancelToken();

    cancel = (reason?: string) => {
      token.cancel(reason);
    };

    return {
      token,
      cancel,
    };
  }
}
