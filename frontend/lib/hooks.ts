'use client';
import { useState, useEffect, useCallback } from 'react';
import { api, getToken, setToken, clearToken } from './api';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api.me()
      .then((u) => { setUser(u); setLoading(false); })
      .catch(() => { clearToken(); setLoading(false); });
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.login({ username, password });
    setToken(res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    setUser(res.user);
    return res;
  };

  const register = async (username: string, password: string, email: string) => {
    await api.register({ username, password, email });
  };

  const logout = () => {
    clearToken();
    setUser(null);
    window.location.href = '/login';
  };

  return { user, loading, login, register, logout };
}

export function useFetch<T>(fetcher: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    fetcher()
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, deps);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, error, refetch };
}
