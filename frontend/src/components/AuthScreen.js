import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import logo from '../Assets/Images/showupp-logo.png';

const signupStages = ['Creating your account...', 'Securing your details...', 'Setting up your workspace...'];

export default function AuthScreen() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  useEffect(() => { api.warmUp(); }, []);
  useEffect(() => { if (!busy) return undefined; setStage(0); const timer = setInterval(() => setStage((current) => Math.min(current + 1, signupStages.length - 1)), 1500); return () => clearInterval(timer); }, [busy]);
  const submit = async (event) => { event.preventDefault(); setBusy(true); setError(''); try { await (mode === 'login' ? login(form) : signup(form)); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  const busyLabel = mode === 'login' ? 'Logging you in...' : signupStages[stage];
  return <div className="auth-page"><div className="auth-intro"><img className="auth-logo" src={logo} alt="ShowUpp" /><p>Search-led content that helps your business show up every single day.</p></div><form className="auth-card" onSubmit={submit}><p className="eyebrow">SHOW UP SYSTEM</p><h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1><p className="muted">{mode === 'login' ? 'Log in to manage your content calendars.' : 'Start generating your search-led content.'}</p>{mode === 'signup' && <label>Your name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>}<label>Email address<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label><label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength="8" /></label>{error && <div className="error">{error}</div>}<button className="primary wide" disabled={busy}>{busy ? <><span className="spinner" aria-hidden="true" />{busyLabel}</> : mode === 'login' ? 'Log in' : 'Create account'}</button>{busy && mode === 'signup' && <p className="progress-note">This only takes a few seconds - please keep this page open.</p>}<button type="button" className="text-button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>{mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in'}</button></form></div>;
}
