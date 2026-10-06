import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

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
    <form className="login" onSubmit={submit}>
      <h1>LeadFlow</h1>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
      {error && <p className="error">{error}</p>}
      <button disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>

      <div className="demo">
        <small>Demo accounts (password: Password123!)</small>
        {DEMO.map(([label, mail]) => (
          <button type="button" key={mail} onClick={() => { setEmail(mail); setPassword('Password123!'); }}>
            {label}
          </button>
        ))}
      </div>
    </form>
  );
}