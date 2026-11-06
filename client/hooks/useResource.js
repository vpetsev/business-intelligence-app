import { useEffect, useState } from 'react';
import { apiRequest } from '../utils/Api';
export default function useResource(path) {
  const [state, setState] = useState({ path: null, data: null, error: '', loading: true });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    setState({ path, data: null, error: '', loading: true });
    apiRequest(path, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setState({ path, data, error: '', loading: false });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ path, data: null, error: error.message || 'Unable to load data.', loading: false });
    });
    return () => controller.abort();
  }, [path, attempt]);
  return { ...(state.path === path ? state : { data: null, error: '', loading: true }), retry: () => setAttempt(value => value + 1) };
}
