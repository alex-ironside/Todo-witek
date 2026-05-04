import { useState, type FormEvent } from 'react';
import AuthShell from './AuthShell';
import Field from './Field';
import { login } from '../../firebase/auth';
import { t } from '../../i18n';

interface Props {
  onForgot: () => void;
  onUseLocal: () => void;
}

// Login form per redesign spec section 5. Email + password with inline
// per-field validation, Firebase login, two text links beneath.
export default function LoginScreen({ onForgot, onUseLocal }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');

  const handleEmailChange = (v: string) => {
    setEmail(v);
    if (emailError) setEmailError('');
  };
  const handlePasswordChange = (v: string) => {
    setPassword(v);
    if (passwordError) setPasswordError('');
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    let invalid = false;
    if (!email) {
      setEmailError(t.authEmptyEmail);
      invalid = true;
    }
    if (!password) {
      setPasswordError(t.authEmptyPassword);
      invalid = true;
    }
    if (invalid) return;
    try {
      await login(email, password);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t.loginFailed);
    }
  };

  return (
    <AuthShell>
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold text-text">{t.loginTitle}</h1>
        <p className="text-textDim text-sm">{t.loginHint}</p>
        <div>
          <Field
            label={t.loginEmail}
            type="email"
            value={email}
            onChange={handleEmailChange}
            autoComplete="email"
          />
          {emailError && (
            <span className="text-danger text-sm mt-1 block">{emailError}</span>
          )}
        </div>
        <div>
          <Field
            label={t.loginPassword}
            type="password"
            value={password}
            onChange={handlePasswordChange}
            autoComplete="current-password"
          />
          {passwordError && (
            <span className="text-danger text-sm mt-1 block">
              {passwordError}
            </span>
          )}
        </div>
        {formError && (
          <span className="text-danger text-sm block">{formError}</span>
        )}
        <button
          type="submit"
          className="w-full bg-accent text-accentInk rounded-field py-3 font-semibold"
        >
          {t.loginSubmit}
        </button>
        <div className="flex flex-col items-center gap-2 text-textDim text-sm pt-2">
          <button type="button" onClick={onForgot} className="py-1">
            {t.loginForgot}
          </button>
          <button type="button" onClick={onUseLocal} className="py-1">
            {t.loginUseLocal}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
