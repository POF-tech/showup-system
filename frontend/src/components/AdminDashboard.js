import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import logo from '../Assets/Images/showupp-logo.png';

const emptySummary = { total: 0, active: 0, pending: 0, expired: 0, revoked: 0 };
const invitationStatuses = ['PENDING', 'REDEEMED', 'REVOKED', 'EXPIRED'];

function MemberActions({ member, onAction }) {
  return <div className="member-crud-actions">
    <select aria-label={`Plan for ${member.email}`} value={member.plan || 'free'} onChange={(event) => onAction('plan', member.id, event.target.value)}>
      <option value="free">Free</option><option value="premium">Premium</option>
    </select>
    <button onClick={() => onAction('account', member.id, member.accountStatus === 'DEACTIVATED' ? 'ACTIVE' : 'DEACTIVATED')}>
      {member.accountStatus === 'DEACTIVATED' ? 'Activate account' : 'Deactivate account'}
    </button>
    <button onClick={() => onAction(member.access === 'ACTIVE' ? 'revoke' : 'restore', member.id)}>
      {member.access === 'ACTIVE' ? 'Revoke access' : 'Restore access'}
    </button>
    {member.invitation && <select aria-label={`Invitation status for ${member.email}`} value={member.invitation.status} onChange={(event) => onAction('invitation-status', member.invitation.id, event.target.value)}>
      {invitationStatuses.map((status) => <option key={status}>{status}</option>)}
    </select>}
  </div>;
}

export default function AdminDashboard() {
  const { token, logout } = useAuth();
  const [members, setMembers] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ pages: 1 });
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const result = await api.adminMembers(token, { search, status: filter, page, limit: 25 });
      setMembers(result.members); setSummary(result.summary); setPagination(result.pagination);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }, [token, search, filter, page]);

  useEffect(() => { load(); }, [load]);

  const invite = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const result = await api.adminInvite(token, { email, name });
      setMessage(result.emailSent ? 'Invitation sent.' : `Invitation created, but email delivery failed: ${result.emailError || 'email provider is not configured.'}`);
      setEmail(''); setName(''); load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const action = async (kind, id, value) => {
    if (kind === 'revoke' && !window.confirm('Revoke Growth Academy access? The account and saved calendars will remain intact.')) return;
    if (kind === 'account' && value === 'DEACTIVATED' && !window.confirm('Deactivate this account? The user will be unable to log in or generate calendars.')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (kind === 'revoke') await api.adminRevoke(token, id);
      if (kind === 'restore') await api.adminRestore(token, id);
      if (kind === 'plan' || kind === 'account') await api.adminUpdateMember(token, id, kind === 'plan' ? { plan: value } : { accountStatus: value });
      if (kind === 'invitation-status') await api.adminInvitationStatus(token, id, value);
      if (kind === 'resend') await api.adminResend(token, id);
      setMessage(kind === 'revoke' ? 'Access revoked.' : kind === 'restore' ? 'Access restored.' : kind === 'plan' ? 'Plan updated.' : kind === 'account' ? 'Account status updated.' : kind === 'resend' ? 'Invitation resent.' : 'Invitation status updated.');
      load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return <main className="admin-page">
    <header className="admin-header"><img src={logo} alt="ShowUpp" className="brand-logo" /><div><span className="eyebrow">ADMINISTRATION</span><button className="text-button" onClick={logout}>Log out</button></div></header>
    <div className="admin-title"><p className="eyebrow">GROWTH ACADEMY ACCESS</p><h1>Member management</h1><p className="muted">Manage plans, accounts, invitations, and server-side access.</p></div>
    {message && <div className="success">{message}</div>}{error && <div className="error global-error">{error}</div>}
    <section className="admin-grid">{[['Total members', summary.total], ['Active access', summary.active], ['Pending invitations', summary.pending], ['Revoked access', summary.revoked]].map(([label, value]) => <article className="stat-card" key={label}><span>{label}</span><strong>{value}</strong></article>)}</section>
    <section className="admin-panel"><h2>Add Growth Academy member</h2><form className="invite-form" onSubmit={invite}><label>Member email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Name (optional)<input value={name} onChange={(event) => setName(event.target.value)} /></label><button className="primary" disabled={busy}>Send invitation</button></form></section>
    <section className="admin-panel"><div className="member-toolbar"><div><h2>Growth Academy members</h2><p className="muted">Account status, plan, invitation, and access are managed independently.</p></div><div className="member-controls"><input placeholder="Search email or name" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && (setPage(1), load())} /><select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }}>{['ALL', 'ACTIVE', 'PENDING', 'EXPIRED', 'REVOKED', 'DEACTIVATED'].map((item) => <option key={item}>{item}</option>)}</select></div></div>
      <div className="member-table"><div className="member-row member-heading"><span>Member</span><span>Account / plan</span><span>Invitation / access</span><span>Actions</span></div>{members.length ? members.map((member) => <div className="member-row" key={member.id}><span><strong>{member.name || 'Unnamed member'}</strong><small>{member.email}</small></span><span className="status">{member.accountStatus || 'ACTIVE'}<small>{member.plan || 'free'}</small></span><span className="status">{member.invitation?.status || 'NONE'}<small>{member.access || 'NONE'}</small></span><span><MemberActions member={member} onAction={action} />{member.invitation && member.invitation.status !== 'REDEEMED' && <button onClick={() => action('resend', member.invitation.id)}>Resend invitation</button>}</span></div>) : <p className="empty-state">{busy ? 'Loading members...' : 'No members found.'}</p>}</div>
      {pagination.pages > 1 && <div className="pagination"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {pagination.pages}</span><button disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}>Next</button></div>}
    </section>
  </main>;
}
