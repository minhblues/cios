/**
 * URL utility functions
 */

/**
 * Resolve a full URL from a base URL and endpoint
 *
 * @param endpoint - The API endpoint path
 * @param baseUrl - The base URL
 * @returns The resolved URL
 */
export function resolveUrl(endpoint: string, baseUrl: string = ""): string {
  // If no base URL is provided, use the endpoint as is
  if (!baseUrl) {
    return endpoint;
  }

  // Ensure we have proper slash handling between base and endpoint
  const baseWithTrailingSlash = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const endpointWithoutLeadingSlash = endpoint.startsWith("/")
    ? endpoint.substring(1)
    : endpoint;

  return `${baseWithTrailingSlash}${endpointWithoutLeadingSlash}`;
}

/**
 * Build a URL with query parameters
 *
 * @param url - Base URL
 * @param params - Query parameters to append
 * @param paramsSerializer - Optional custom serializer function
 * @returns Full URL with query parameters
 */
export function buildUrlWithParams(
  url: string,
  params?: Record<string, any>,
  paramsSerializer?: (params: Record<string, any>) => string
): string {
  if (!params || Object.keys(params).length === 0) {
    return url;
  }

  try {
    const urlObj = new URL(url);

    if (paramsSerializer) {
      // Use custom serializer if provided
      const serialized = paramsSerializer(params);
      urlObj.search = serialized.startsWith("?")
        ? serialized.substring(1)
        : serialized;
    } else {
      // Default serialization
      for (const key in params) {
        if (params[key] !== undefined && params[key] !== null) {
          const value = params[key];

          if (Array.isArray(value)) {
            // Handle array values (e.g., ?ids=1&ids=2&ids=3)
            value.forEach((item) =>
              urlObj.searchParams.append(key, String(item))
            );
          } else if (typeof value === "object") {
            // Handle object values by stringifying
            urlObj.searchParams.append(key, JSON.stringify(value));
          } else {
            // Handle primitive values
            urlObj.searchParams.append(key, String(value));
          }
        }
      }
    }

    return urlObj.toString();
  } catch (error) {
    // Fallback for environments without URL constructor
    const separator = url.indexOf("?") === -1 ? "?" : "&";
    const prefix = url + separator;

    if (paramsSerializer) {
      return prefix + paramsSerializer(params);
    }

    const parts: string[] = [];

    Object.keys(params).forEach((key) => {
      const value = params[key];

      if (value === null || value === undefined) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => {
          parts.push(
            `${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`
          );
        });
      } else if (typeof value === "object") {
        parts.push(
          `${encodeURIComponent(key)}=${encodeURIComponent(
            JSON.stringify(value)
          )}`
        );
      } else {
        parts.push(
          `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
        );
      }
    });

    return parts.length ? prefix + parts.join("&") : url;
  }
}
