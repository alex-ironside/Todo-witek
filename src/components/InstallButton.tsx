import { usePwaInstall } from '../hooks/usePwaInstall';
import { t } from '../i18n';

export default function InstallButton() {
  const { canInstall, promptInstall } = usePwaInstall();
  if (!canInstall) return null;
  return (
    <button className="ghost" onClick={() => promptInstall()}>
      {t.installApp}
    </button>
  );
}
