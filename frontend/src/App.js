import './App.css';
import logo from './Assets/Images/showupp-logo.png';
import AuthScreen from './components/AuthScreen';
import Planner from './components/Planner';
import InvitationRegistration from './components/InvitationRegistration';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { user, loading, logout } = useAuth();
  const invitationToken = new URLSearchParams(window.location.search).get('token');
  if (loading) return <div className="loading">Loading your workspace...</div>;
  if (!user && window.location.pathname === '/register' && invitationToken) return <InvitationRegistration token={invitationToken} />;
  if (!user) return <AuthScreen />;
  return <><nav className="top-nav"><img className="brand-logo" src={logo} alt="ShowUpp" /><div className="nav-user"><span>{user.name || user.email}</span><b>{user.plan || 'Free'} plan</b><button className="text-button" onClick={logout}>Log out</button></div></nav><Planner /><footer>Built with The Show Up System methodology</footer></>;
}

function App() { return <AuthProvider><AppContent /></AuthProvider>; }

export default App;
