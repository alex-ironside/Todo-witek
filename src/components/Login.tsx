import { useState, type FormEvent } from 'react';
import { login } from '../firebase/auth';
import StorageModeToggle from './StorageModeToggle';
import InstallButton from './InstallButton';
import type { StorageMode } from '../services/storageMode';
import { t } from '../i18n';

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
      setError(err instanceof Error ? err.message : t.loginFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>{t.loginTitle}</h1>
        <div className="row">
          <InstallButton />
          <StorageModeToggle mode={mode} onChange={onModeChange} />
        </div>
      </div>
      <p className="muted">{t.loginHint}</p>
      <form className="col" onSubmit={onSubmit}>
        <input
          type="email"
          autoComplete="email"
          placeholder={t.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          autoComplete="current-password"
          placeholder={t.passwordPlaceholder}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div className="error">{error}</div>}
        <button className="primary" type="submit" disabled={busy}>
          {busy ? t.loginSubmitBusy : t.loginSubmit}
        </button>
      </form>
    </div>
  );
}
