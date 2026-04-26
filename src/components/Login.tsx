import { useState, type FormEvent } from 'react';
import { login } from '../firebase/auth';
import StorageModeToggle from './StorageModeToggle';
import type { StorageMode } from '../services/storageMode';

interface Props {
  mode: StorageMode;
  onModeChange: (mode: StorageMode) => void;
}

export default function Login({ mode, onModeChange }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Sign in</h1>
        <StorageModeToggle mode={mode} onChange={onModeChange} />
      </div>
      <p className="muted">
        Existing accounts only. No public sign-up. Switch to <strong>Local</strong>{' '}
        to use the app without an account.
      </p>
      <form className="col" onSubmit={onSubmit}>
        <input
          type="email"
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div className="error">{error}</div>}
        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
