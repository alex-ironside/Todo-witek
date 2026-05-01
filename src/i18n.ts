// Single source of truth for UI strings. Polish only for now —
// when a second locale is needed, swap this object for a map keyed by locale.

export const t = {
  brand: 'Todo Witek',

  // Header / shell
  signOut: 'Wyloguj',
  loading: 'Ładowanie…',
  identityLocal: 'Lokalnie',
  offlineBanner:
    'Tryb offline — zmiany są zapisywane lokalnie i zostaną zsynchronizowane po przywróceniu połączenia.',

  // Storage mode toggle
  modeLocal: 'Lokalnie',
  modeCloud: 'Chmura',
  modeGroupLabel: 'Tryb przechowywania',

  // Login
  loginTitle: 'Zaloguj się',
  loginHint:
    'Tylko istniejące konta. Brak publicznej rejestracji. Przełącz na tryb Lokalny, aby używać aplikacji bez konta.',
  emailPlaceholder: 'E-mail',
  passwordPlaceholder: 'Hasło',
  loginSubmit: 'Zaloguj',
  loginSubmitBusy: 'Logowanie…',
  loginFailed: 'Logowanie nie powiodło się',

  // Reset password
  resetPasswordTitle: 'Resetuj hasło',
  resetPasswordHint:
    'Podaj adres e-mail powiązany z kontem. Wyślemy link do zresetowania hasła.',
  resetPasswordSubmit: 'Wyślij link resetujący',
  resetPasswordSubmitBusy: 'Wysyłanie…',
  resetPasswordSuccess:
    'Wysłaliśmy link do zresetowania hasła. Sprawdź skrzynkę odbiorczą.',
  resetPasswordFailed: 'Nie udało się wysłać linku resetującego',
  resetPasswordEmailRequired: 'Podaj adres e-mail',
  resetPasswordOpen: 'Nie pamiętasz hasła?',
  resetPasswordBackToLogin: 'Wróć do logowania',

  // Firebase not configured
  notConfigured:
    'Firebase nie jest jeszcze skonfigurowany. Wpisz swoją konfigurację SDK Web w pliku',
  notConfiguredAndIn: 'oraz odpowiadające jej wartości w',
  notConfiguredEnd:
    ', a następnie odśwież stronę — albo przełącz na tryb Lokalny, aby używać aplikacji bez Firebase.',

  // TodoForm
  todoPlaceholder: 'Dodaj zadanie…',
  todoAdd: 'Dodaj',
  todoSaveError: 'Nie udało się zapisać',
  keepInputToggle: 'Zachowaj tekst po dodaniu',

  // TodoList
  todosEmpty: 'Brak zadań. Dodaj jedno powyżej.',
  todosLoadError: 'Nie udało się załadować zadań. Odśwież stronę lub spróbuj ponownie później.',
  firestoreNotEnabled:
    'Firestore nie jest włączony — włącz go na console.firebase.google.com',

  // TodoItem
  dragHandle: 'Przeciągnij, aby zmienić kolejność',
  markDone: (title: string) => `Oznacz „${title}" jako wykonane`,
  showReminders: 'Przypomnienia',
  hideReminders: 'Ukryj',
  edit: 'Edytuj',
  cancel: 'Anuluj',
  delete: 'Usuń',
  deleteConfirm: 'Potwierdź usunięcie',

  // ReminderEditor
  reminderFiredLabel: 'wysłane',
  reminderRemove: (when: string) => `Usuń przypomnienie ${when}`,
  reminderAdd: 'Dodaj przypomnienie',

  // Push
  pushEnable: 'Włącz powiadomienia push na wielu urządzeniach',
  pushHint:
    'Zapisuje token FCM tego urządzenia, aby Cloud Function mogła dostarczać przypomnienia, nawet gdy aplikacja jest zamknięta.',
  pushSetupFailed: 'Konfiguracja powiadomień nie powiodła się',

  // Install (PWA)
  installApp: 'Zainstaluj aplikację',
  installIosTitle: 'Zainstaluj na iOS',
  installIosStep1:
    'Stuknij ikonę „Udostępnij" w pasku Safari (kwadrat ze strzałką w górę).',
  installIosStep2: 'Wybierz „Dodaj do ekranu początkowego".',
  installIosStep3: 'Stuknij „Dodaj" w prawym górnym rogu.',
  installClose: 'Zamknij',
};

export type Strings = typeof t;
