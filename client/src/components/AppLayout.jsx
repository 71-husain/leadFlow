import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { SocketProvider, useSocket } from '../context/SocketContext.jsx';
import Button from './Button.jsx';

const DOT = { live: 'bg-emerald-500', connecting: 'bg-amber-400 animate-pulse', offline: 'bg-rose-500' };

const NavItem = ({ to, children }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `rounded-lg px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`
    }
  >
    {children}
  </NavLink>
);

function Shell() {
  const { user, logout } = useAuth();
  const { status } = useSocket();
  const isStaff = ['brokerage_admin', 'advisor'].includes(user.role);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="text-lg font-semibold tracking-tight text-indigo-600">LeadFlow</span>
          <nav className="flex gap-1">
            {isStaff && (
              <>
                <NavItem to="/board">Board</NavItem>
                <NavItem to="/dashboard">Dashboard</NavItem>
              </>
            )}
            {user.role === 'client' && <NavItem to="/portal">My case</NavItem>}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-600">
            <span className="flex items-center gap-1.5" title={`Live connection: ${status}`}>
              <span className={`h-2 w-2 rounded-full ${DOT[status]}`} />
              {status === 'live' ? 'Live' : status === 'connecting' ? 'Connecting' : 'Offline'}
            </span>
            <span className="hidden items-center gap-2 sm:flex">
              {user.name}
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                {user.role.replace('_', ' ')}
              </span>
            </span>
            <Button variant="secondary" size="sm" onClick={logout}>Log out</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

export default function AppLayout() {
  return <SocketProvider><Shell /></SocketProvider>;
}