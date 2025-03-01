import fetchMock from 'jest-fetch-mock';
import { ApiClient } from '../src/client/ApiClient';
import { ApiError } from '../src/error/ApiError';

describe('ApiClient', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient('https://api.example.com');
  });

  describe('constructor', () => {
    it('should create an instance with default options', () => {
      expect(client).toBeInstanceOf(ApiClient);
    });

    it('should create an instance with custom options', () => {
      const customClient = new ApiClient('https://custom.example.com', {
        timeout: 5000,
        headers: {
          'X-Custom-Header': 'value'
        }
      });

      expect(customClient).toBeInstanceOf(ApiClient);
    });
  });

  describe('request methods', () => {
    it('should make a GET request', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ data: 'test' }));

      const [error, data] = await client.get('/test');

      expect(error).toBeNull();
      expect(data).toEqual({ data: 'test' });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/https:\/\/api\.example\.com\/test/),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should make a POST request with JSON body', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ id: 1 }));

      const [error, data] = await client.post('/test', { name: 'test' });

      expect(error).toBeNull();
      expect(data).toEqual({ id: 1 });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/https:\/\/api\.example\.com\/test/),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' })
        })
      );
    });

    it('should handle query parameters', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ data: 'test' }));

      await client.get('/test', {
        params: { page: 1, filter: 'active' }
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/https:\/\/api\.example\.com\/test\?page=1&filter=active/),
        expect.any(Object)
      );
    });

    it('should handle array query parameters', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ data: 'test' }));

      await client.get('/test', {
        params: { ids: [1, 2, 3] }
      });

      const url = fetchMock?.mock?.calls[0][0]?.toString()||'';
      expect(url).toMatch(/ids=1&ids=2&ids=3/);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      fetchMock.mockReject(new TypeError('Failed to fetch'));

      const [error, data] = await client.get('/test');

      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toContain('Failed to fetch');
      expect(data).toBeNull();
    });

    it('should handle API errors with JSON response', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ message: 'Not found' }), {
        status: 404
      });

      const [error, data] = await client.get('/test');

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).statusCode).toBe(404);
      expect(data).toBeNull();
    });

    it('should retry failed requests when configured', async () => {
      // First call fails, second succeeds
      fetchMock
        .mockRejectOnce(new TypeError('Failed to fetch'))
        .mockResponseOnce(JSON.stringify({ data: 'success' }));

      const [error, data] = await client.get('/test', {
        retries: 1
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(error).toBeNull();
      expect(data).toEqual({ data: 'success' });
    });
  });

  describe('interceptors', () => {
    it('should apply request interceptors', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ data: 'test' }));

      client.addRequestInterceptor(request => {
        const newRequest = new Request(request);
        newRequest.headers.set('X-Test', 'intercepted');
        return newRequest;
      });

      await client.get('/test');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Test': 'intercepted'
          })
        })
      );
    });

    it('should apply response interceptors', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ data: 'test' }));

      let interceptorCalled = false;
      client.addResponseInterceptor(response => {
        interceptorCalled = true;
        return response;
      });

      await client.get('/test');

      expect(interceptorCalled).toBe(true);
    });

    it('should apply error interceptors', async () => {
      fetchMock.mockReject(new Error('Test error'));

      let interceptedError: Error | null = null;
      client.addErrorInterceptor(error => {
        interceptedError = error;
        return error;
      });

      await client.get('/test');

      expect(interceptedError).not.toBeNull();
      // @ts-ignore
      expect(interceptedError?.message).toBe('Test error');
    });

    it('should remove interceptors when the removal function is called', async () => {
      const removeInterceptor = client.addRequestInterceptor(() => {
        throw new Error('This should not be called');
      });

      // Remove the interceptor
      removeInterceptor();

      fetchMock.mockResponseOnce(JSON.stringify({ data: 'test' }));
      
      // This should not throw an error
      const [error] = await client.get('/test');
      
      expect(error).toBeNull();
    });
  });

  describe('parallel requests', () => {
    it('should handle multiple requests in parallel', async () => {
      fetchMock
        .mockResponseOnce(JSON.stringify({ id: 1 }))
        .mockResponseOnce(JSON.stringify({ id: 2 }))
        .mockResponseOnce(JSON.stringify({ id: 3 }));

      const [error, results] = await client.all([
        () => client.get('/test/1'),
        () => client.get('/test/2'),
        () => client.get('/test/3')
      ]);

      expect(error).toBeNull();
      expect(results).toEqual([
        { id: 1 },
        { id: 2 },
        { id: 3 }
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('should handle errors in parallel requests', async () => {
      fetchMock
        .mockResponseOnce(JSON.stringify({ id: 1 }))
        .mockRejectOnce(new Error('Failed'))
        .mockResponseOnce(JSON.stringify({ id: 3 }));

      const [error, results] = await client.all([
        () => client.get('/test/1'),
        () => client.get('/test/2'),
        () => client.get('/test/3')
      ]);

      expect(error).not.toBeNull();
      expect(error?.message).toContain('Failed');
      expect(results).toBeNull();
    });
  });
});