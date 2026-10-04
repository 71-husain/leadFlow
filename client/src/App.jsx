import { useCallback, useState } from 'react';
import Login from './Login.jsx';
import Board from './Board.jsx';
import { getUser, clearSession } from './api.js';

export default function App() {
  const [user, setUser] = useState(getUser());

  // useCallback keeps this function's identity stable, so the Board doesn't reconnect its socket on every render
  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  if (!user) return <Login onLogin={setUser} />;

  const isStaff = ['brokerage_admin', 'advisor'].includes(user.role);

  return (
    <div className="app">
      <header>
        <strong>LeadFlow</strong>
        <span>{user.name} ({user.role.replace('_', ' ')})</span>
        <button onClick={logout}>Log out</button>
      </header>
      {isStaff ? (
        <Board user={user} onLogout={logout} />
      ) : (
        <p className="empty">The {user.role.replace('_', ' ')} area is not built yet.</p>
      )}
    </div>
  );
}