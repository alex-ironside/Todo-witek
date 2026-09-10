export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

const baseUrl = (): string => import.meta.env.VITE_API_URL ?? '';

const codeForStatus = (status: number): string =>
  status === 401 ? 'permission-denied' : `http-${status}`;

export const apiRequest = async <T>(
  method: Method,
  path: string,
  body?: unknown
): Promise<T> => {
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    throw new ApiError(
      res.status,
      codeForStatus(res.status),
      `Request failed: ${method} ${path} (${res.status})`
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
};
