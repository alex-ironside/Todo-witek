// Todo Witek — Polished mobile redesign (Polish UI)
// Embodies: refined dark theme, single warm accent, balanced density,
// drawer-based categories, sheet-based reminders/settings, • • • per-row menu,
// auto-collapsed "Wykonane" section, quiet empty state.

const { useState, useEffect, useMemo, useRef } = React;

// ─────────────────────────────────────────────────────────────
// Polish copy (source of truth)
// ─────────────────────────────────────────────────────────────
const PL = {
  brand: 'Todo',
  tabPrywatne: 'Prywatne',
  tabSluzbowe: 'Służbowe',
  todoPlaceholder: 'Co dziś robisz?',
  add: 'Dodaj',
  empty: 'Brak zadań.',
  emptyHint: 'Dodaj pierwsze powyżej.',
  done: 'Wykonane',
  edit: 'Edytuj',
  delete: 'Usuń',
  deleteConfirm: 'Na pewno?',
  remind: 'Przypomnij',
  cancel: 'Anuluj',
  save: 'Zapisz',
  reminderTitle: 'Przypomnienie',
  reminderEmpty: 'Bez przypomnień.',
  reminderAdd: 'Dodaj termin',
  reminderFired: 'wysłane',
  settings: 'Ustawienia',
  signedInAs: 'Zalogowany jako',
  signOut: 'Wyloguj',
  modeLocal: 'Lokalnie',
  modeCloud: 'Chmura',
  storage: 'Przechowywanie',
  pushTitle: 'Powiadomienia push',
  pushHint: 'Przypomnienia działają, gdy aplikacja jest zamknięta.',
  pushOn: 'Włączone',
  pushOff: 'Wyłączone',
  install: 'Zainstaluj aplikację',
  installHint: 'Dodaj do ekranu początkowego, aby otwierać szybciej.',
  categories: 'Kategorie',
  loginTitle: 'Zaloguj się',
  loginHint: 'Bez publicznej rejestracji.',
  email: 'E-mail',
  password: 'Hasło',
  loginSubmit: 'Zaloguj',
  forgotPassword: 'Nie pamiętasz hasła?',
  useLocal: 'Użyj trybu lokalnego',
  reminders: 'Przypomnienia',
  // Appearance / accents
  appearance: 'Wygląd',
  accentLabel: 'Kolor akcentu',
  accentAmber: 'Bursztyn',
  accentRose: 'Róż',
  accentMint: 'Mięta',
  accentViolet: 'Fiolet',
  accentSky: 'Błękit',
  // Reset password
  resetTitle: 'Resetuj hasło',
  resetHint: 'Podaj adres e-mail powiązany z kontem. Wyślemy link do zresetowania hasła.',
  resetSubmit: 'Wyślij link resetujący',
  resetSubmitBusy: 'Wysyłanie…',
  resetSuccessTitle: 'Sprawdź skrzynkę',
  resetSuccessBody: 'Wysłaliśmy link do zresetowania hasła na podany adres. Link wygasa po godzinie.',
  resetBack: 'Wróć do logowania',
  resetEmailRequired: 'Podaj adres e-mail',
};

// ─────────────────────────────────────────────────────────────
// Sample data
// ─────────────────────────────────────────────────────────────
const SEED = [
  { id: '1', title: 'Zadzwonić do księgowej', done: false, category: 'sluzbowe', reminders: [{ id: 'r1', remindAt: Date.now() + 3600 * 1000 * 4, fired: false }] },
  { id: '2', title: 'Przygotować slajdy na poniedziałek', done: false, category: 'sluzbowe', reminders: [] },
  { id: '3', title: 'Przejrzeć PR Marcina', done: false, category: 'sluzbowe', reminders: [] },
  { id: '4', title: 'Rezerwacja stolika na sobotę', done: false, category: 'prywatne', reminders: [{ id: 'r2', remindAt: Date.now() + 3600 * 1000 * 26, fired: false }] },
  { id: '5', title: 'Kupić kawę', done: false, category: 'prywatne', reminders: [] },
  { id: '6', title: 'Trening — basen', done: false, category: 'prywatne', reminders: [] },
  { id: '7', title: 'Odebrać paczkę', done: true, category: 'prywatne', reminders: [] },
  { id: '8', title: 'Wysłać fakturę', done: true, category: 'sluzbowe', reminders: [] },
];

// ─────────────────────────────────────────────────────────────
// Tokens (consumed via inline styles + CSS vars on the root)
// ─────────────────────────────────────────────────────────────
const tokens = (accent) => ({
  // warm-toned near-black + ink scale
  bg: 'oklch(0.18 0.008 60)',
  bgRaised: 'oklch(0.22 0.009 60)',
  bgSheet: 'oklch(0.24 0.010 60)',
  hairline: 'oklch(0.30 0.008 60)',
  hairlineSoft: 'oklch(0.26 0.008 60)',
  text: 'oklch(0.96 0.005 80)',
  textDim: 'oklch(0.72 0.012 70)',
  textMute: 'oklch(0.55 0.010 70)',
  accent,
  accentInk: 'oklch(0.20 0.020 60)',
  danger: 'oklch(0.65 0.18 25)',
});

// ─────────────────────────────────────────────────────────────
// Tiny icon set (stroked, 1.5px, 22px)
// ─────────────────────────────────────────────────────────────
const Icon = ({ name, size = 22, color = 'currentColor' }) => {
  const s = { width: size, height: size, fill: 'none', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'menu': return <svg viewBox="0 0 24 24" style={s}><line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="16" x2="14" y2="16"/></svg>;
    case 'gear': return <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
    case 'bell': return <svg viewBox="0 0 24 24" style={s}><path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16l-2-2z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
    case 'plus': return <svg viewBox="0 0 24 24" style={s}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
    case 'dots': return <svg viewBox="0 0 24 24" style={s}><circle cx="6" cy="12" r="1.2" fill={color} stroke="none"/><circle cx="12" cy="12" r="1.2" fill={color} stroke="none"/><circle cx="18" cy="12" r="1.2" fill={color} stroke="none"/></svg>;
    case 'x': return <svg viewBox="0 0 24 24" style={s}><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>;
    case 'check': return <svg viewBox="0 0 24 24" style={s}><polyline points="5 12 10 17 19 7"/></svg>;
    case 'chev': return <svg viewBox="0 0 24 24" style={s}><polyline points="9 6 15 12 9 18"/></svg>;
    case 'chevDown': return <svg viewBox="0 0 24 24" style={s}><polyline points="6 9 12 15 18 9"/></svg>;
    case 'drag': return <svg viewBox="0 0 24 24" style={{ ...s, strokeWidth: 1.4 }}><circle cx="9" cy="6" r="1" fill={color} stroke="none"/><circle cx="15" cy="6" r="1" fill={color} stroke="none"/><circle cx="9" cy="12" r="1" fill={color} stroke="none"/><circle cx="15" cy="12" r="1" fill={color} stroke="none"/><circle cx="9" cy="18" r="1" fill={color} stroke="none"/><circle cx="15" cy="18" r="1" fill={color} stroke="none"/></svg>;
    case 'cloud': return <svg viewBox="0 0 24 24" style={s}><path d="M17.5 19a4.5 4.5 0 0 0 .5-9 6.5 6.5 0 0 0-12.5 1.5A4 4 0 0 0 6 19h11.5z"/></svg>;
    case 'home': return <svg viewBox="0 0 24 24" style={s}><path d="M5 11l7-6 7 6v8a1 1 0 0 1-1 1h-4v-6h-4v6H6a1 1 0 0 1-1-1z"/></svg>;
    case 'briefcase': return <svg viewBox="0 0 24 24" style={s}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>;
    case 'download': return <svg viewBox="0 0 24 24" style={s}><path d="M12 4v12"/><polyline points="7 11 12 16 17 11"/><line x1="5" y1="20" x2="19" y2="20"/></svg>;
    case 'logout': return <svg viewBox="0 0 24 24" style={s}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><polyline points="10 8 14 12 10 16"/><line x1="14" y1="12" x2="4" y2="12"/></svg>;
    default: return null;
  }
};

// ─────────────────────────────────────────────────────────────
// Format helpers (Polish-localized)
// ─────────────────────────────────────────────────────────────
const formatRemindAt = (ms) => {
  const d = new Date(ms);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `Dziś, ${time}`;
  if (isTomorrow) return `Jutro, ${time}`;
  return d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' }) + `, ${time}`;
};

// ─────────────────────────────────────────────────────────────
// Sheet primitive (bottom sheet w/ scrim)
// ─────────────────────────────────────────────────────────────
function Sheet({ open, onClose, children, title, T }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: open ? 'auto' : 'none',
      zIndex: 50,
    }}>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
        opacity: open ? 1 : 0, transition: 'opacity 220ms ease',
      }}/>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: T.bgSheet, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: '10px 0 0', borderTop: `1px solid ${T.hairline}`,
        transform: open ? 'translateY(0)' : 'translateY(110%)',
        transition: 'transform 280ms cubic-bezier(.2,.9,.25,1)',
        maxHeight: '85%', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 8px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: T.hairline }}/>
        </div>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 14px' }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: T.text, letterSpacing: '-0.01em' }}>{title}</div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: T.textDim, padding: 4, cursor: 'pointer' }}>
              <Icon name="x" size={20}/>
            </button>
          </div>
        )}
        <div style={{ overflow: 'auto', paddingBottom: 28 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Drawer primitive (left side, for categories)
// ─────────────────────────────────────────────────────────────
function Drawer({ open, onClose, children, T }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: open ? 'auto' : 'none',
      zIndex: 40,
    }}>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
        opacity: open ? 1 : 0, transition: 'opacity 220ms ease',
      }}/>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '78%',
        background: T.bgSheet, borderRight: `1px solid ${T.hairline}`,
        transform: open ? 'translateX(0)' : 'translateX(-105%)',
        transition: 'transform 280ms cubic-bezier(.2,.9,.25,1)',
        display: 'flex', flexDirection: 'column',
      }}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Popover menu (anchored, simple)
// ─────────────────────────────────────────────────────────────
function PopoverMenu({ open, onClose, items, T, anchorTop }) {
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 30 }}/>
      <div style={{
        position: 'absolute', right: 16, top: anchorTop, zIndex: 31,
        background: T.bgSheet, border: `1px solid ${T.hairline}`,
        borderRadius: 14, minWidth: 180, padding: 6,
        boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
      }}>
        {items.map((it, i) => (
          <button key={i} onClick={() => { it.onClick(); onClose(); }} style={{
            width: '100%', textAlign: 'left', background: 'transparent', border: 'none',
            color: it.danger ? T.danger : T.text, padding: '10px 12px', fontSize: 15,
            borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
          }} onMouseEnter={e => e.currentTarget.style.background = T.bgRaised}
             onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <Icon name={it.icon} size={18} color={it.danger ? T.danger : T.textDim}/>
            <span>{it.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// One todo row (the heart of the UI — kept very quiet)
// ─────────────────────────────────────────────────────────────
function TodoRow({ todo, T, onToggle, onMenu, onOpenReminders, density }) {
  const [pressed, setPressed] = useState(false);
  const reminderCount = (todo.reminders || []).filter(r => !r.fired).length;
  const padY = density === 'compact' ? 10 : density === 'airy' ? 16 : 13;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: `${padY}px 18px`, borderBottom: `1px solid ${T.hairlineSoft}`,
      background: pressed ? T.bgRaised : 'transparent', transition: 'background 120ms',
    }}>
      {/* Custom checkbox */}
      <button
        onClick={() => onToggle(todo.id)}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        aria-label={`Oznacz „${todo.title}"`}
        style={{
          width: 22, height: 22, borderRadius: '50%',
          border: `1.6px solid ${todo.done ? T.accent : T.hairline}`,
          background: todo.done ? T.accent : 'transparent',
          padding: 0, cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 160ms',
        }}
      >
        {todo.done && <Icon name="check" size={14} color={T.accentInk}/>}
      </button>

      {/* Title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15.5, lineHeight: 1.35, color: todo.done ? T.textMute : T.text,
          textDecoration: todo.done ? 'line-through' : 'none',
          textDecorationColor: T.textMute,
          letterSpacing: '-0.005em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{todo.title}</div>
        {reminderCount > 0 && !todo.done && (
          <button onClick={() => onOpenReminders(todo)} style={{
            background: 'transparent', border: 'none', padding: 0, marginTop: 4,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            color: T.accent, fontSize: 12.5, cursor: 'pointer',
            letterSpacing: '0.01em',
          }}>
            <Icon name="bell" size={13} color={T.accent}/>
            <span>{formatRemindAt(todo.reminders.find(r => !r.fired).remindAt)}</span>
          </button>
        )}
      </div>

      {/* Overflow */}
      <button onClick={(e) => onMenu(todo, e.currentTarget.getBoundingClientRect())} style={{
        background: 'transparent', border: 'none', padding: 8, cursor: 'pointer',
        color: T.textMute, borderRadius: 8, flexShrink: 0,
      }} aria-label="Więcej opcji">
        <Icon name="dots" size={18}/>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Reminder editor sheet
// ─────────────────────────────────────────────────────────────
function ReminderSheet({ todo, T, onClose, onAdd, onRemove }) {
  const [when, setWhen] = useState('');
  const reminders = (todo && todo.reminders) || [];
  return (
    <Sheet open={!!todo} onClose={onClose} title={PL.reminderTitle} T={T}>
      <div style={{ padding: '0 20px 8px', color: T.textDim, fontSize: 13.5, lineHeight: 1.4 }}>
        {todo && (<>Dla zadania: <span style={{ color: T.text }}>„{todo.title}"</span></>)}
      </div>
      <div style={{ padding: '14px 20px 8px' }}>
        {reminders.length === 0 ? (
          <div style={{
            padding: '22px 16px', textAlign: 'center', color: T.textMute,
            fontSize: 14, border: `1px dashed ${T.hairline}`, borderRadius: 12,
          }}>{PL.reminderEmpty}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reminders.map(r => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', background: T.bgRaised, borderRadius: 12,
                border: `1px solid ${T.hairlineSoft}`,
                opacity: r.fired ? 0.55 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon name="bell" size={16} color={T.accent}/>
                  <div>
                    <div style={{ color: T.text, fontSize: 14.5 }}>{formatRemindAt(r.remindAt)}</div>
                    {r.fired && <div style={{ color: T.textMute, fontSize: 12, marginTop: 2 }}>{PL.reminderFired}</div>}
                  </div>
                </div>
                <button onClick={() => onRemove(r.id)} style={{
                  background: 'transparent', border: 'none', color: T.textDim, cursor: 'pointer', padding: 6,
                }}><Icon name="x" size={16}/></button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ padding: '14px 20px 8px', display: 'flex', gap: 8 }}>
        <input
          type="datetime-local"
          value={when}
          onChange={e => setWhen(e.target.value)}
          style={{
            flex: 1, background: T.bgRaised, border: `1px solid ${T.hairline}`,
            borderRadius: 10, padding: '11px 12px', color: T.text, fontSize: 14,
            colorScheme: 'dark', fontFamily: 'inherit',
          }}
        />
        <button
          onClick={() => { if (when) { onAdd(when); setWhen(''); } }}
          disabled={!when}
          style={{
            background: when ? T.accent : T.bgRaised, color: when ? T.accentInk : T.textMute,
            border: 'none', borderRadius: 10, padding: '0 16px',
            fontWeight: 600, cursor: when ? 'pointer' : 'not-allowed', fontSize: 14,
          }}
        >{PL.reminderAdd}</button>
      </div>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────
// Settings sheet
// ─────────────────────────────────────────────────────────────
function SettingsSheet({ open, onClose, T, identity, mode, onModeChange, push, onTogglePush, onInstall, onSignOut, accentName, onAccentChange }) {
  // Row uses a div + an inner clickable area so we can place real <button> controls
  // (segmented toggle, pill) on the right without nesting buttons.
  const Row = ({ icon, title, hint, right, onClick, danger, interactive = true }) => {
    const hitProps = onClick && interactive ? {
      onClick,
      role: 'button',
      tabIndex: 0,
      onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } },
    } : {};
    return (
      <div style={{
        display: 'flex', alignItems: 'center', width: '100%',
        padding: '14px 20px', gap: 14,
        borderTop: `1px solid ${T.hairlineSoft}`,
      }}>
        <div {...hitProps} style={{
          display: 'flex', alignItems: 'center', gap: 14, flex: 1,
          cursor: onClick && interactive ? 'pointer' : 'default',
          minWidth: 0,
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: T.bgRaised, display: 'flex', alignItems: 'center', justifyContent: 'center', color: danger ? T.danger : T.textDim, flexShrink: 0 }}>
            <Icon name={icon} size={17}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: danger ? T.danger : T.text, fontSize: 15 }}>{title}</div>
            {hint && <div style={{ color: T.textMute, fontSize: 12.5, marginTop: 2, lineHeight: 1.4 }}>{hint}</div>}
          </div>
        </div>
        {right}
      </div>
    );
  };

  const SegToggle = ({ value, onChange, options }) => (
    <div style={{ display: 'flex', background: T.bg, borderRadius: 8, padding: 2, border: `1px solid ${T.hairlineSoft}` }}>
      {options.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)} style={{
          padding: '5px 10px', fontSize: 12.5, fontWeight: 500,
          background: value === o.v ? T.bgRaised : 'transparent',
          color: value === o.v ? T.text : T.textDim,
          border: 'none', borderRadius: 6, cursor: 'pointer',
        }}>{o.label}</button>
      ))}
    </div>
  );

  const ACCENT_OPTIONS = [
    { v: 'amber',  label: PL.accentAmber,  swatch: 'oklch(0.78 0.13 70)'  },
    { v: 'rose',   label: PL.accentRose,   swatch: 'oklch(0.74 0.13 18)'  },
    { v: 'mint',   label: PL.accentMint,   swatch: 'oklch(0.78 0.11 165)' },
    { v: 'violet', label: PL.accentViolet, swatch: 'oklch(0.72 0.13 290)' },
    { v: 'sky',    label: PL.accentSky,    swatch: 'oklch(0.78 0.10 235)' },
  ];

  const AccentPicker = (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {ACCENT_OPTIONS.map(o => {
        const active = o.v === accentName;
        return (
          <button key={o.v} onClick={() => onAccentChange && onAccentChange(o.v)}
            aria-label={o.label}
            title={o.label}
            style={{
              width: 26, height: 26, borderRadius: '50%',
              background: o.swatch,
              border: active
                ? `2px solid ${T.text}`
                : `1px solid ${T.hairline}`,
              boxShadow: active ? `0 0 0 2px ${T.bgSheet}` : 'none',
              outlineOffset: 2,
              padding: 0, cursor: 'pointer', flexShrink: 0,
              transition: 'all 140ms',
            }}/>
        );
      })}
    </div>
  );

  const PushPill = (
    <span style={{
      fontSize: 12, color: push ? T.accent : T.textMute,
      padding: '3px 10px', borderRadius: 999,
      background: push ? `color-mix(in oklch, ${T.accent} 15%, transparent)` : T.bg,
      border: `1px solid ${push ? T.accent : T.hairlineSoft}`,
    }}>{push ? PL.pushOn : PL.pushOff}</span>
  );

  return (
    <Sheet open={open} onClose={onClose} title={PL.settings} T={T}>
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{ color: T.textMute, fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {PL.signedInAs}
        </div>
        <div style={{ color: T.text, fontSize: 15, marginTop: 4 }}>{identity}</div>
      </div>
      <Row icon="gear" title={PL.accentLabel} right={AccentPicker} interactive={false}/>
      <Row icon="cloud" title={PL.storage} hint={mode === 'cloud' ? 'Synchronizacja z chmurą.' : 'Tylko na tym urządzeniu.'}
           right={<SegToggle value={mode} onChange={onModeChange} options={[{ v: 'local', label: PL.modeLocal }, { v: 'cloud', label: PL.modeCloud }]}/>}/>
      <Row icon="bell" title={PL.pushTitle} hint={PL.pushHint} right={PushPill} onClick={onTogglePush}/>
      <Row icon="download" title={PL.install} hint={PL.installHint} right={<Icon name="chev" size={16} color={T.textMute}/>} onClick={onInstall}/>
      <Row icon="logout" title={PL.signOut} onClick={onSignOut} danger right={<Icon name="chev" size={16} color={T.danger}/>}/>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────
// Categories drawer
// ─────────────────────────────────────────────────────────────
function CategoriesDrawer({ open, onClose, T, current, onSelect, counts, onOpenSettings, identity }) {
  const Cat = ({ id, icon, label, count }) => {
    const active = id === current;
    return (
      <button onClick={() => { onSelect(id); onClose(); }} style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px',
        background: active ? T.bgRaised : 'transparent',
        border: 'none', borderLeft: `3px solid ${active ? T.accent : 'transparent'}`,
        color: active ? T.text : T.textDim, width: '100%', textAlign: 'left', cursor: 'pointer',
        fontSize: 15,
      }}>
        <Icon name={icon} size={18} color={active ? T.accent : T.textDim}/>
        <span style={{ flex: 1 }}>{label}</span>
        <span style={{ color: T.textMute, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
      </button>
    );
  };
  return (
    <Drawer open={open} onClose={onClose} T={T}>
      <div style={{ padding: '64px 22px 24px' }}>
        <div style={{ fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.textMute }}>{PL.brand}</div>
        <div style={{ fontSize: 22, fontWeight: 600, color: T.text, letterSpacing: '-0.02em', marginTop: 6 }}>Kategorie</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <Cat id="prywatne" icon="home" label={PL.tabPrywatne} count={counts.prywatne}/>
        <Cat id="sluzbowe" icon="briefcase" label={PL.tabSluzbowe} count={counts.sluzbowe}/>
      </div>
      <div style={{ flex: 1 }}/>
      <button onClick={() => { onClose(); setTimeout(onOpenSettings, 240); }} style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 22px', borderTop: `1px solid ${T.hairlineSoft}`,
        background: 'transparent', border: 'none', color: T.textDim, cursor: 'pointer',
        textAlign: 'left',
      }}>
        <Icon name="gear" size={18}/>
        <div style={{ flex: 1 }}>
          <div style={{ color: T.text, fontSize: 14 }}>{PL.settings}</div>
          <div style={{ color: T.textMute, fontSize: 12, marginTop: 2 }}>{identity}</div>
        </div>
        <Icon name="chev" size={16} color={T.textMute}/>
      </button>
    </Drawer>
  );
}

// ─────────────────────────────────────────────────────────────
// Main app screen content (used by both iOS and Android frames)
// ─────────────────────────────────────────────────────────────
function TodoApp({ T, density, screen = 'main', identity = 'witek@example.com', accentName, onAccentChange }) {
  const [todos, setTodos] = useState(SEED);
  const [category, setCategory] = useState('prywatne');
  const [drawerOpen, setDrawerOpen] = useState(screen === 'drawer');
  const [settingsOpen, setSettingsOpen] = useState(screen === 'settings');
  const [reminderTodo, setReminderTodo] = useState(screen === 'reminder' ? SEED[0] : null);
  const [menuFor, setMenuFor] = useState(null);
  const [menuTop, setMenuTop] = useState(0);
  const [doneOpen, setDoneOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState('cloud');
  const [push, setPush] = useState(true);

  const visible = todos.filter(t => t.category === category);
  const open = visible.filter(t => !t.done);
  const done = visible.filter(t => t.done);
  const counts = {
    prywatne: todos.filter(t => t.category === 'prywatne' && !t.done).length,
    sluzbowe: todos.filter(t => t.category === 'sluzbowe' && !t.done).length,
  };

  const toggle = id => setTodos(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const remove = id => setTodos(ts => ts.filter(t => t.id !== id));
  const addTodo = () => {
    const title = draft.trim();
    if (!title) return;
    setTodos(ts => [{ id: String(Date.now()), title, done: false, category, reminders: [] }, ...ts]);
    setDraft('');
  };
  const openMenu = (todo, rect) => {
    setMenuFor(todo);
    // Position popover beneath the dots button (fudge for frame offsets)
    setMenuTop((rect && rect.top) ? rect.top - rect.height + 32 : 100);
  };

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%', background: T.bg,
      color: T.text, overflow: 'hidden',
      fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 14px 8px',
      }}>
        <button onClick={() => setDrawerOpen(true)} style={{
          background: 'transparent', border: 'none', color: T.text, padding: 8, cursor: 'pointer',
        }}><Icon name="menu" size={22}/></button>
        <button onClick={() => setSettingsOpen(true)} style={{
          background: 'transparent', border: 'none', color: T.textDim, padding: 8, cursor: 'pointer',
        }}><Icon name="gear" size={20}/></button>
      </div>

      {/* Title block */}
      <div style={{ padding: '4px 22px 18px' }}>
        <div style={{ color: T.textMute, fontSize: 12.5, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {category === 'prywatne' ? PL.tabPrywatne : PL.tabSluzbowe}
        </div>
        <div style={{
          fontSize: 30, fontWeight: 600, color: T.text, marginTop: 4,
          letterSpacing: '-0.025em', lineHeight: 1.1,
        }}>
          {open.length === 0 ? 'Wszystko zrobione' : `${open.length} ${pluralPL(open.length, 'zadanie', 'zadania', 'zadań')}`}
        </div>
      </div>

      {/* Add input */}
      <div style={{ padding: '0 18px 14px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: T.bgRaised, borderRadius: 14, padding: '4px 4px 4px 14px',
          border: `1px solid ${T.hairlineSoft}`,
        }}>
          <Icon name="plus" size={18} color={T.textDim}/>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addTodo(); }}
            placeholder={PL.todoPlaceholder}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: T.text, fontSize: 15, padding: '12px 0', fontFamily: 'inherit',
            }}
          />
          <button onClick={addTodo} disabled={!draft.trim()} style={{
            background: draft.trim() ? T.accent : 'transparent',
            color: draft.trim() ? T.accentInk : T.textMute,
            border: 'none', borderRadius: 10, padding: '8px 14px',
            fontWeight: 600, fontSize: 14, cursor: draft.trim() ? 'pointer' : 'default',
            transition: 'all 160ms',
          }}>{PL.add}</button>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {open.length === 0 && done.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, color: T.textDim, letterSpacing: '-0.01em' }}>{PL.empty}</div>
            <div style={{ fontSize: 13.5, color: T.textMute, marginTop: 6 }}>{PL.emptyHint}</div>
          </div>
        ) : (
          <>
            <div style={{ borderTop: `1px solid ${T.hairlineSoft}` }}>
              {open.map(t => (
                <TodoRow key={t.id} todo={t} T={T} density={density}
                  onToggle={toggle}
                  onMenu={openMenu}
                  onOpenReminders={setReminderTodo}/>
              ))}
            </div>
            {done.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <button onClick={() => setDoneOpen(o => !o)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  background: 'transparent', border: 'none', padding: '14px 20px',
                  color: T.textDim, fontSize: 13, cursor: 'pointer', textAlign: 'left',
                  letterSpacing: '0.02em',
                }}>
                  <span style={{ transform: doneOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 180ms', display: 'inline-flex' }}>
                    <Icon name="chevDown" size={14} color={T.textMute}/>
                  </span>
                  <span>{PL.done} · {done.length}</span>
                </button>
                {doneOpen && (
                  <div style={{ borderTop: `1px solid ${T.hairlineSoft}` }}>
                    {done.map(t => (
                      <TodoRow key={t.id} todo={t} T={T} density={density}
                        onToggle={toggle}
                        onMenu={openMenu}
                        onOpenReminders={setReminderTodo}/>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Drawer */}
      <CategoriesDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} T={T}
        current={category} onSelect={setCategory} counts={counts}
        onOpenSettings={() => setSettingsOpen(true)} identity={identity}/>

      {/* Settings */}
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} T={T}
        identity={identity} mode={mode} onModeChange={setMode}
        accentName={accentName} onAccentChange={onAccentChange}
        push={push} onTogglePush={() => setPush(p => !p)}
        onInstall={() => {}} onSignOut={() => {}}/>

      {/* Reminder */}
      <ReminderSheet todo={reminderTodo} T={T}
        onClose={() => setReminderTodo(null)}
        onAdd={(when) => {
          const ms = new Date(when).getTime();
          setTodos(ts => ts.map(t => t.id === reminderTodo.id ? { ...t, reminders: [...(t.reminders||[]), { id: String(Date.now()), remindAt: ms, fired: false }] } : t));
          setReminderTodo(rt => ({ ...rt, reminders: [...(rt.reminders||[]), { id: String(Date.now()), remindAt: ms, fired: false }] }));
        }}
        onRemove={(rid) => {
          setTodos(ts => ts.map(t => t.id === reminderTodo.id ? { ...t, reminders: t.reminders.filter(r => r.id !== rid) } : t));
          setReminderTodo(rt => ({ ...rt, reminders: rt.reminders.filter(r => r.id !== rid) }));
        }}/>

      {/* Per-row menu */}
      <PopoverMenu open={!!menuFor} onClose={() => setMenuFor(null)} T={T} anchorTop={menuTop}
        items={menuFor ? [
          { icon: 'bell', label: PL.remind, onClick: () => setReminderTodo(menuFor) },
          { icon: 'drag', label: 'Zmień kolejność', onClick: () => {} },
          { icon: 'check', label: PL.edit, onClick: () => {} },
          { icon: 'x', label: PL.delete, danger: true, onClick: () => remove(menuFor.id) },
        ] : []}/>
    </div>
  );
}

const pluralPL = (n, one, few, many) => {
  if (n === 1) return one;
  const lastTwo = n % 100;
  const last = n % 10;
  if (lastTwo >= 12 && lastTwo <= 14) return many;
  if (last >= 2 && last <= 4) return few;
  return many;
};

// ─────────────────────────────────────────────────────────────
// Login screen (for the "login" state demo)
// ─────────────────────────────────────────────────────────────
function LoginScreen({ T, initialView = 'login' }) {
  // 'login' | 'reset' | 'reset-sent'
  const [view, setView] = useState(initialView);
  const [email, setEmail] = useState('witek@example.com');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submitReset = () => {
    if (!email.trim()) { setError(PL.resetEmailRequired); return; }
    setError('');
    setBusy(true);
    setTimeout(() => { setBusy(false); setView('reset-sent'); }, 700);
  };

  const Shell = ({ children }) => (
    <div style={{
      width: '100%', height: '100%', background: T.bg, color: T.text,
      padding: '40px 28px 28px', display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>{children}</div>
  );

  if (view === 'reset') {
    return (
      <Shell>
        <div style={{ marginBottom: 'auto' }}>
          <button onClick={() => setView('login')} aria-label={PL.resetBack} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'transparent', border: 'none', color: T.textDim,
            padding: '6px 8px 6px 0', cursor: 'pointer', fontSize: 13.5,
            fontFamily: 'inherit',
          }}>
            <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
              <Icon name="chev" size={14} color={T.textDim}/>
            </span>
            <span>{PL.resetBack}</span>
          </button>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: T.bgRaised,
            border: `1px solid ${T.hairlineSoft}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: 22,
          }}>
            <Icon name="bell" size={20} color={T.accent}/>
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, color: T.text, letterSpacing: '-0.025em', marginTop: 22, lineHeight: 1.15 }}>
            {PL.resetTitle}
          </div>
          <div style={{ fontSize: 14, color: T.textDim, marginTop: 10, lineHeight: 1.5 }}>{PL.resetHint}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 28 }}>
          <input placeholder={PL.email} value={email} onChange={e => setEmail(e.target.value)}
            style={inputStyle(T)} type="email" autoFocus/>
          {error && <div style={{ color: T.danger, fontSize: 13 }}>{error}</div>}
          <button onClick={submitReset} disabled={busy} style={{
            background: T.accent, color: T.accentInk, border: 'none',
            borderRadius: 12, padding: '14px 0', fontSize: 15, fontWeight: 600,
            cursor: busy ? 'wait' : 'pointer', marginTop: 6, opacity: busy ? 0.7 : 1,
            fontFamily: 'inherit',
          }}>{busy ? PL.resetSubmitBusy : PL.resetSubmit}</button>
        </div>
      </Shell>
    );
  }

  if (view === 'reset-sent') {
    return (
      <Shell>
        <div style={{ marginBottom: 'auto' }}>
          <button onClick={() => setView('login')} aria-label={PL.resetBack} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'transparent', border: 'none', color: T.textDim,
            padding: '6px 8px 6px 0', cursor: 'pointer', fontSize: 13.5,
            fontFamily: 'inherit',
          }}>
            <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
              <Icon name="chev" size={14} color={T.textDim}/>
            </span>
            <span>{PL.resetBack}</span>
          </button>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: `color-mix(in oklch, ${T.accent} 18%, transparent)`,
            border: `1px solid color-mix(in oklch, ${T.accent} 35%, transparent)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: 22,
          }}>
            <Icon name="check" size={22} color={T.accent}/>
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, color: T.text, letterSpacing: '-0.025em', marginTop: 22, lineHeight: 1.15 }}>
            {PL.resetSuccessTitle}
          </div>
          <div style={{ fontSize: 14, color: T.textDim, marginTop: 10, lineHeight: 1.5 }}>
            {PL.resetSuccessBody}
          </div>
          <div style={{
            marginTop: 18, padding: '12px 14px', borderRadius: 12,
            background: T.bgRaised, border: `1px solid ${T.hairlineSoft}`,
            fontSize: 14, color: T.text,
          }}>{email}</div>
        </div>
        <button onClick={() => setView('login')} style={{
          background: T.accent, color: T.accentInk, border: 'none',
          borderRadius: 12, padding: '14px 0', fontSize: 15, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>{PL.resetBack}</button>
      </Shell>
    );
  }

  // Default: login
  return (
    <Shell>
      <div style={{ marginBottom: 'auto' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 22 }}>
          <Icon name="check" size={22} color={T.accentInk}/>
        </div>
        <div style={{ fontSize: 32, fontWeight: 600, color: T.text, letterSpacing: '-0.025em', marginTop: 22 }}>{PL.loginTitle}</div>
        <div style={{ fontSize: 14, color: T.textDim, marginTop: 8, lineHeight: 1.5 }}>{PL.loginHint}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 32 }}>
        <input placeholder={PL.email} style={inputStyle(T)} value={email} onChange={e => setEmail(e.target.value)}/>
        <input placeholder={PL.password} type="password" style={inputStyle(T)} defaultValue="••••••••"/>
        <button style={{
          background: T.accent, color: T.accentInk, border: 'none',
          borderRadius: 12, padding: '14px 0', fontSize: 15, fontWeight: 600,
          cursor: 'pointer', marginTop: 6, fontFamily: 'inherit',
        }}>{PL.loginSubmit}</button>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
          <button onClick={() => setView('reset')} style={linkBtn(T)}>{PL.forgotPassword}</button>
          <button style={linkBtn(T)}>{PL.useLocal}</button>
        </div>
      </div>
    </Shell>
  );
}

const inputStyle = (T) => ({
  background: T.bgRaised, border: `1px solid ${T.hairlineSoft}`,
  borderRadius: 12, padding: '14px 14px', color: T.text, fontSize: 15,
  outline: 'none', fontFamily: 'inherit',
});
const linkBtn = (T) => ({
  background: 'transparent', border: 'none', color: T.textDim,
  fontSize: 13, cursor: 'pointer', padding: 4,
});

// ─────────────────────────────────────────────────────────────
// Frame wrappers — host TodoApp inside iOS / Android shells
// ─────────────────────────────────────────────────────────────
function pickScreenNode(T, density, screen, accentName, onAccentChange) {
  if (screen === 'login') return <LoginScreen T={T} initialView="login"/>;
  if (screen === 'reset') return <LoginScreen T={T} initialView="reset"/>;
  if (screen === 'reset-sent') return <LoginScreen T={T} initialView="reset-sent"/>;
  return <TodoApp T={T} density={density} screen={screen}
           accentName={accentName} onAccentChange={onAccentChange}/>;
}

function IOSPhone({ T, density, screen, label, accentName, onAccentChange }) {
  const node = pickScreenNode(T, density, screen, accentName, onAccentChange);
  return (
    <IOSDevice dark={true} width={390} height={760}>
      <div style={{ width: '100%', height: '100%', background: T.bg, paddingTop: 54 }}>
        {node}
      </div>
    </IOSDevice>
  );
}

function AndroidPhone({ T, density, screen, label, accentName, onAccentChange }) {
  const node = pickScreenNode(T, density, screen, accentName, onAccentChange);
  return (
    <AndroidDevice dark={true} width={390} height={760}>
      <div style={{ width: '100%', height: '100%', background: T.bg, paddingTop: 8 }}>
        {node}
      </div>
    </AndroidDevice>
  );
}

Object.assign(window, { TodoApp, LoginScreen, IOSPhone, AndroidPhone, tokens, PL });
