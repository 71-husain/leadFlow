import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { SocketProvider, useSocket } from '../context/SocketContext.jsx';

function Shell() {
  const { user, logout } = useAuth();
  const { status } = useSocket();
  const isStaff = ['brokerage_admin', 'advisor'].includes(user.role);

  return (
    <div className="app">
      <header>
        <strong>LeadFlow</strong>
        <nav>
          {isStaff && (
            <>
              <NavLink to="/board">Board</NavLink>
              <NavLink to="/dashboard">Dashboard</NavLink>
            </>
          )}
          {user.role === 'client' && <NavLink to="/portal">My case</NavLink>}
        </nav>
        <span className="who">
          <span className={`dot ${status}`} title={status} />
          {user.name} ({user.role.replace('_', ' ')})
        </span>
        <button onClick={logout}>Log out</button>
      </header>
      <main><Outlet /></main>
    </div>
  );
}

// The live connection exists only while someone is logged in
export default function AppLayout() {
  return <SocketProvider><Shell /></SocketProvider>;
}