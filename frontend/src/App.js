import './App.css';
import AuthScreen from './components/AuthScreen';
import Planner from './components/Planner';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { user, loading, logout } = useAuth();
  if (loading) return <div className="loading">Loading your workspace...</div>;
  if (!user) return <AuthScreen />;
  return <><nav className="top-nav"><div className="brand-mark">SHOW<span>UP</span></div><div className="nav-user"><span>{user.name || user.email}</span><b>{user.plan || 'Free'} plan</b><button className="text-button" onClick={logout}>Log out</button></div></nav><Planner /><footer>Built with The Show Up System methodology</footer></>;
}

function App() { return <AuthProvider><AppContent /></AuthProvider>; }

export default App;
