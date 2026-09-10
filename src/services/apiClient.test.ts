import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest, ApiError } from './apiClient';

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const emptyResponse = (status: number): Response => new Response(null, { status });

describe('apiRequest', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prefixes the path with VITE_API_URL and returns the parsed JSON body', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8080');
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(jsonResponse(200, { id: '1' }));

    const result = await apiRequest<{ id: string }>('GET', '/todos');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/todos',
      expect.objectContaining({ method: 'GET', credentials: 'include' })
    );
    expect(result).toEqual({ id: '1' });
  });

  it('falls back to an empty base URL when VITE_API_URL is unset', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(jsonResponse(200, []));

    await apiRequest('GET', '/todos');

    expect(fetchMock).toHaveBeenCalledWith('/todos', expect.anything());
  });

  it('does not send a body or Content-Type header for a bodyless request', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(jsonResponse(200, []));

    await apiRequest('GET', '/todos');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBeUndefined();
    expect(init.headers).toBeUndefined();
  });

  it('JSON-encodes the body and sets Content-Type for a write request', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(jsonResponse(201, { id: '1' }));

    await apiRequest('POST', '/todos', { title: 'Buy milk' });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(init.body).toBe(JSON.stringify({ title: 'Buy milk' }));
  });

  it('resolves to undefined for a 204 No Content response', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(emptyResponse(204));

    const result = await apiRequest('DELETE', '/todos/1');

    expect(result).toBeUndefined();
  });

  it('throws an ApiError mapping 401 to permission-denied', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(emptyResponse(401));

    await expect(apiRequest('GET', '/todos')).rejects.toMatchObject({
      status: 401,
      code: 'permission-denied',
    });
    await expect(apiRequest('GET', '/todos')).rejects.toBeInstanceOf(ApiError);
  });

  it('throws an ApiError with an http-<status> code for other failures', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(emptyResponse(500));

    await expect(apiRequest('POST', '/todos', {})).rejects.toMatchObject({
      status: 500,
      code: 'http-500',
    });
  });
});
