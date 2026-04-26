import { useState } from 'react';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { t } from '../i18n';

export default function InstallButton() {
  const { canInstall, promptInstall, isIos } = usePwaInstall();
  const [showIosTip, setShowIosTip] = useState(false);

  if (!canInstall) return null;

  return (
    <>
      <button
        className="ghost"
        onClick={() => (isIos ? setShowIosTip(true) : promptInstall())}
      >
        {t.installApp}
      </button>
      {showIosTip && <IosInstallTip onClose={() => setShowIosTip(false)} />}
    </>
  );
}

function IosInstallTip({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="ios-install-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-install-title"
      onClick={onClose}
    >
      <div className="ios-install-card" onClick={(e) => e.stopPropagation()}>
        <h2 id="ios-install-title">{t.installIosTitle}</h2>
        <ol>
          <li>{t.installIosStep1}</li>
          <li>{t.installIosStep2}</li>
          <li>{t.installIosStep3}</li>
        </ol>
        <button className="primary" onClick={onClose}>
          {t.installClose}
        </button>
      </div>
    </div>
  );
}
