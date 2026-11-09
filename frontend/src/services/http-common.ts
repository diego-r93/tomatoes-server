import axios from 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuth?: boolean;
    skipUnauthorized?: boolean;
  }
}

const configuration = { baseURL: `${window.location.origin}/server`, headers: { 'Content-Type': 'application/json' } };
const http = axios.create(configuration);
const httpWithAuthorization = axios.create(configuration);

for (const client of [http, httpWithAuthorization]) {
  client.interceptors.request.use(config => {
    const token = localStorage.getItem('tomatoesAccessToken');
    if (!config.skipAuth && token) config.headers.set('Authorization', `Bearer ${token}`);
    return config;
  });
  client.interceptors.response.use(response => response, (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && !error.config?.skipAuth && !error.config?.skipUnauthorized) {
      window.dispatchEvent(new Event('tomatoes:unauthorized'));
    }
    return Promise.reject(error);
  });
}

export function setAuthorizationHeader(token?: string) {
  if (token) httpWithAuthorization.defaults.headers.common.Authorization = `Bearer ${String(token).replace(/^Bearer\s+/i, '')}`;
  else delete httpWithAuthorization.defaults.headers.common.Authorization;
}
export function clearAuthorizationHeaders() {
  delete http.defaults.headers.common.Authorization;
  delete httpWithAuthorization.defaults.headers.common.Authorization;
}
export { http, httpWithAuthorization };
