import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('showup_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) return undefined;
    api.me(token).then(setUser).catch(() => { localStorage.removeItem('showup_token'); setToken(null); }).finally(() => setLoading(false));
    return undefined;
  }, [token]);

  const login = async (credentials) => { const result = await api.login(credentials); localStorage.setItem('showup_token', result.token); setToken(result.token); setUser(result); };
  const signup = async (details) => { await api.signup(details); await login({ email: details.email, password: details.password }); };
  const logout = () => { localStorage.removeItem('showup_token'); setToken(null); setUser(null); };

  return <AuthContext.Provider value={{ token, user, loading, login, signup, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
