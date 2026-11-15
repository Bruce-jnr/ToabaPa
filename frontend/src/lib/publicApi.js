import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;
if (!API_URL) throw new Error('Set VITE_API_URL in the frontend environment.');

export function publicApiUrl(path) {
  return `${API_URL.replace(/\/$/, '')}${path}`;
}

export async function getJson(path, signal) {
  const response = await fetch(publicApiUrl(path), { signal });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success)
    throw new Error(
      payload?.error?.message || 'Unable to load Toabapa right now.',
    );
  return payload.data;
}

export function usePublicData(path) {
  const [state, setState] = useState({ path: '', data: [], error: '' });
  useEffect(() => {
    const controller = new AbortController();
    getJson(path, controller.signal)
      .then((data) => setState({ path, data, error: '' }))
      .catch((error) => {
        if (error.name !== 'AbortError')
          setState({ path, data: [], error: error.message });
      });
    return () => controller.abort();
  }, [path]);
  return state.path === path
    ? { ...state, loading: false }
    : { data: [], error: '', loading: true };
}


