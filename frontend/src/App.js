import './App.css';
import logo from './Assets/Images/showupp-logo.png';
import AuthScreen from './components/AuthScreen';
import Planner from './components/Planner';
import InvitationRegistration from './components/InvitationRegistration';
import AdminDashboard from './components/AdminDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { user, loading, logout } = useAuth();
  const invitationToken = new URLSearchParams(window.location.search).get('token');
  if (loading) return <div className="loading">Loading your workspace...</div>;
  if (!user && window.location.pathname === '/register' && invitationToken) return <InvitationRegistration token={invitationToken} />;
  if (window.location.pathname === '/admin') { if (!user) return <AuthScreen />; if (user.role !== 'ADMIN') return <div className="auth-page"><section className="auth-card"><h1>Access denied</h1><p className="muted">You do not have permission to access the admin area.</p></section></div>; return <AdminDashboard />; }
  if (!user) return <AuthScreen />;
  return <><nav className="top-nav"><img className="brand-logo" src={logo} alt="ShowUpp" /><div className="nav-user"><span>{user.name || user.email}</span><b>{user.plan || 'Free'} plan</b><button className="text-button" onClick={logout}>Log out</button></div></nav><Planner /><footer>Built with The Show Up System methodology</footer></>;
}

function App() { return <AuthProvider><AppContent /></AuthProvider>; }

export default App;
