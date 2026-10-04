import { useState } from 'react';
import { api, setSession } from './api.js';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('advisor@alpha.test');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token, user } = await api('/auth/login', { method: 'POST', body: { email, password } });
      setSession(token, user);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="login" onSubmit={submit}>
      <h1>LeadFlow</h1>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
      {error && <p className="error">{error}</p>}
      <button disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
    </form>
  );
}