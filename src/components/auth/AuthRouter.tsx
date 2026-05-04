import { useState } from 'react';
import LoginScreen from './LoginScreen';
import ResetPasswordScreen from './ResetPasswordScreen';
import ResetSentScreen from './ResetSentScreen';

interface Props {
  onUseLocal: () => void;
}

type Mode = 'login' | 'reset' | 'reset-sent';

// Three-screen auth state machine. No router dep — auth is ephemeral UI
// that exists only while the user is unauthenticated.
export default function AuthRouter({ onUseLocal }: Props) {
  const [mode, setMode] = useState<Mode>('login');

  if (mode === 'reset') {
    return (
      <ResetPasswordScreen
        onBack={() => setMode('login')}
        onSent={() => setMode('reset-sent')}
      />
    );
  }
  if (mode === 'reset-sent') {
    return <ResetSentScreen onBackToLogin={() => setMode('login')} />;
  }
  return (
    <LoginScreen onForgot={() => setMode('reset')} onUseLocal={onUseLocal} />
  );
}
