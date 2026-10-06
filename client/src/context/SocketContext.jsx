import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API } from '../api/client.js';
import { getToken } from '../lib/session.js';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext({ socket: null, status: 'connecting', reconnects: 0 });

export function SocketProvider({ children }) {
  const { logout } = useAuth();
  const [socket, setSocket] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [reconnects, setReconnects] = useState(0); // goes up each time we reconnect after a drop

  useEffect(() => {
    const s = io(API, { auth: { token: getToken() } });
    let first = true;

    s.on('connect', () => {
      setStatus('live');
      if (!first) setReconnects((n) => n + 1); // screens watch this and refetch
      first = false;
    });
    s.on('disconnect', () => setStatus('offline'));
    s.on('connect_error', (err) => {
      setStatus('offline');
      if (err.message === 'Not authenticated') logout();
    });

    setSocket(s);
    return () => { s.disconnect(); setSocket(null); };
  }, [logout]);

  return <SocketContext.Provider value={{ socket, status, reconnects }}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);