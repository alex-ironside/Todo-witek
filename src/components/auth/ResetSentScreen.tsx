import AuthShell from './AuthShell';
import { t } from '../../i18n';

interface Props {
  onBackToLogin: () => void;
}

// Confirmation screen shown after a reset link has been dispatched.
export default function ResetSentScreen({ onBackToLogin }: Props) {
  return (
    <AuthShell>
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-semibold text-text">{t.resetSentTitle}</h1>
        <p className="text-textDim text-sm">{t.resetSentBody}</p>
        <button
          type="button"
          onClick={onBackToLogin}
          className="w-full border border-hairline text-accent rounded-field py-3 font-semibold"
        >
          {t.resetBack}
        </button>
      </div>
    </AuthShell>
  );
}
