import { useState, type FormEvent } from 'react';
import AuthShell from './AuthShell';
import Field from './Field';
import BackButton from './BackButton';
import { resetPassword } from '../../firebase/auth';
import { t } from '../../i18n';

interface Props {
  onBack: () => void;
  onSent: () => void;
}

// Reset-password request screen per redesign spec section 6.
export default function ResetPasswordScreen({ onBack, onSent }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleEmailChange = (v: string) => {
    setEmail(v);
    if (error) setError('');
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError(t.resetEmptyError);
      return;
    }
    setBusy(true);
    try {
      await resetPassword(email);
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.resetEmptyError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <BackButton onClick={onBack} label={t.resetBack} />
        <h1 className="text-2xl font-semibold text-text">{t.resetTitle}</h1>
        <p className="text-textDim text-sm">{t.resetHint}</p>
        <div>
          <Field
            label={t.loginEmail}
            type="email"
            value={email}
            onChange={handleEmailChange}
            autoComplete="email"
          />
          {error && (
            <span className="text-danger text-sm mt-1 block">{error}</span>
          )}
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-accent text-accentInk rounded-field py-3 font-semibold disabled:opacity-60"
        >
          {busy ? t.resetSubmitBusy : t.resetSubmit}
        </button>
      </form>
    </AuthShell>
  );
}
