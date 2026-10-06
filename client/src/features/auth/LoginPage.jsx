import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/Button.jsx';

const DEMO = [
  ['Advisor · Alpha', 'advisor@alpha.test'],
  ['Admin · Alpha', 'admin@alpha.test'],
  ['Advisor · Beta', 'advisor@beta.test'],
  ['Platform admin', 'platform@leadflow.test'],
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password); // once the user is set, the line above redirects
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
  <div className="flex min-h-screen items-center justify-center px-4">
    <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-indigo-600">LeadFlow</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to your brokerage workspace</p>
      </div>

      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <Button className="w-full" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</Button>

      <div className="border-t border-slate-100 pt-4">
        <p className="mb-2 text-xs text-slate-500">Demo accounts (password: Password123!)</p>
        <div className="flex flex-wrap gap-2">
          {DEMO.map(([label, mail]) => (
            <Button
              type="button"
              key={mail}
              variant="secondary"
              size="sm"
              onClick={() => { setEmail(mail); setPassword('Password123!'); }}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
    </form>
  </div>
);
}