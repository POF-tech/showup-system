import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import logo from '../Assets/Images/showupp-logo.png';

export default function InvitationRegistration({ token }) {
  const { registerInvitation } = useAuth();
  const [invite, setInvite] = useState(null);
  const [form, setForm] = useState({ name: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.validateInvitation(token).then(setInvite).catch((err) => setError(err.message)); }, [token]);
  const submit = async (event) => { event.preventDefault(); if (form.password !== form.confirmPassword) return setError('Passwords do not match'); setBusy(true); setError(''); try { await registerInvitation({ token, name: form.name, password: form.password }); window.history.replaceState({}, '', '/'); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  if (error || (invite && !invite.valid)) return <div className="auth-page"><div className="auth-intro"><img className="auth-logo" src={logo} alt="ShowUpp" /></div><section className="auth-card"><h1>This invitation is unavailable</h1><p className="muted">{error || `This invitation is ${invite.reason}. Please contact the Growth Academy team.`}</p></section></div>;
  if (!invite) return <div className="loading">Checking your invitation...</div>;
  return <div className="auth-page"><div className="auth-intro"><img className="auth-logo" src={logo} alt="ShowUpp" /><p>Unlimited ShowUpp access through Growth Academy.</p></div><form className="auth-card" onSubmit={submit}><p className="eyebrow">GROWTH ACADEMY ACCESS</p><h1>You are in</h1><p className="muted">Create your ShowUpp account using your invited email.</p><label>Email address<input value={invite.email} readOnly /></label><label>Your name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength="8" /></label><label>Confirm password<input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required minLength="8" /></label>{error && <div className="error">{error}</div>}<button className="primary wide" disabled={busy}>{busy ? <><span className="spinner" aria-hidden="true" />Setting up your account...</> : 'Create account'}</button>{busy && <p className="progress-note">This only takes a few seconds - please keep this page open.</p>}</form></div>;
}