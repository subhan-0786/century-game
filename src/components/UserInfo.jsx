// src/components/UserInfo.jsx
import { supabase } from '../lib/supabase';

export default function UserInfo({ user, onLogout, showToast }) {
  const handleLogout = async () => {
    if (!confirm('Are you sure you want to logout?')) return;
    
    try {
      await supabase.auth.signOut();
      onLogout();
      showToast('Logged out successfully', 'info');
    } catch (error) {
      console.error('Logout error:', error);
      showToast('Logout failed', 'error');
    }
  };

  return (
    <div className="user-info">
      <span className="user-email">{user.email}</span>
      <button onClick={handleLogout} className="logout-btn">Logout</button>
    </div>
  );
}