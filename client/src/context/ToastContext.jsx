import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [message, setMessage] = useState('');
  const timer = useRef();

  const notify = useCallback((text) => {
    setMessage(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(''), 4000);
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      {message && <div className="toast fixed bottom-5 right-5 z-50 max-w-sm rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">{message}</div>}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);