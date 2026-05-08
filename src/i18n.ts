// Single source of truth for UI strings. Polish only for now —
// when a second locale is needed, swap this object for a map keyed by locale.

export const t = {
  brand: 'Todo',

  // App bar
  menuOpen: 'Otwórz menu',
  settingsOpen: 'Otwórz ustawienia',

  // Drawer
  categories: 'Kategorie',
  settings: 'Ustawienia',
  drawerClose: 'Zamknij menu',
  manageCategories: 'Zarządzaj kategoriami',

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

  // Transfer local → cloud
  transferTitle: 'Przenieś z urządzenia',
  transferHelper:
    'Skopiuj zadania zapisane lokalnie do chmury i usuń je z tego urządzenia.',
  transferAction: (count: number) => `Przenieś (${count})`,
  transferBusy: 'Przenoszenie…',
  transferDone: (count: number) =>
    count === 1 ? 'Przeniesiono 1 zadanie.' : `Przeniesiono ${count} zadań.`,
  transferFailed: 'Nie udało się przenieść zadań.',

  // Auth (Phase 9 redesign — auth flow)
  loginTitle: 'Zaloguj się',
  loginHint: 'Bez publicznej rejestracji.',
  loginSubmit: 'Zaloguj',
  loginFailed: 'Logowanie nie powiodło się',
  loginEmail: 'E-mail',
  loginPassword: 'Hasło',
  loginForgot: 'Nie pamiętasz hasła?',
  loginUseLocal: 'Użyj trybu lokalnego',
  authEmptyEmail: 'Podaj adres e-mail',
  authEmptyPassword: 'Podaj hasło',
  resetTitle: 'Resetuj hasło',
  resetHint:
    'Podaj adres e-mail powiązany z kontem. Wyślemy link do zresetowania hasła.',
  resetSubmit: 'Wyślij link resetujący',
  resetSubmitBusy: 'Wysyłanie…',
  resetEmptyError: 'Podaj adres e-mail',
  resetSentTitle: 'Sprawdź skrzynkę',
  resetSentBody:
    'Wysłaliśmy link do zresetowania hasła na podany adres. Link wygasa po godzinie.',
  resetBack: 'Wróć do logowania',

  // Firebase not configured
  notConfigured:
    'Firebase nie jest jeszcze skonfigurowany. Wpisz swoją konfigurację SDK Web w pliku',
  notConfiguredAndIn: 'oraz odpowiadające jej wartości w',
  notConfiguredEnd:
    ', a następnie odśwież stronę — albo przełącz na tryb Lokalny, aby używać aplikacji bez Firebase.',

  // Tabs (categories) — labels for the legacy seed categories. Newly
  // created categories use whatever name the user typed.
  tabPrywatne: 'Prywatne',
  tabSluzbowe: 'Służbowe',
  tabUncategorized: 'Bez kategorii',
  categoryGroupLabel: 'Kategoria',

  // Manage categories sheet
  manageCategoriesTitle: 'Zarządzaj kategoriami',
  manageCategoriesEmpty: 'Brak kategorii.',
  categoryNamePlaceholder: 'Nazwa kategorii',
  categoryAdd: 'Dodaj kategorię',
  categoryRename: (name: string) => `Zmień nazwę „${name}"`,
  categoryDelete: (name: string) => `Usuń kategorię „${name}"`,
  categoryDeleteLast: 'Musi pozostać co najmniej jedna kategoria.',
  categoryDuplicateName: 'Kategoria o takiej nazwie już istnieje.',

  // TodoForm / AddTodoRow
  todoPlaceholder: 'Co dziś robisz?',
  todoAdd: 'Dodaj',
  empty: 'Brak zadań.',
  emptyHint: 'Dodaj pierwsze powyżej.',
  done: 'Wykonane',
  todoSaveError: 'Nie udało się zapisać',

  // TodoList
  todosLoadError: 'Nie udało się załadować zadań. Odśwież stronę lub spróbuj ponownie później.',
  firestoreNotEnabled:
    'Firestore nie jest włączony — włącz go na console.firebase.google.com',
  categoriesPermissionDenied:
    'Reguły Firestore blokują dostęp do kategorii. Wdróż reguły z firestore.rules:  firebase deploy --only firestore:rules',
  categoriesLoadError:
    'Nie udało się załadować kategorii. Odśwież stronę lub spróbuj ponownie później.',

  // TodoItem / TodoRow
  dragHandle: 'Przeciągnij, aby zmienić kolejność',
  markDone: (title: string) => `Oznacz „${title}" jako wykonane`,
  moreActions: 'Więcej akcji',
  showReminders: 'Przypomnienia',
  hideReminders: 'Ukryj',
  edit: 'Edytuj',
  save: 'Zapisz',
  cancel: 'Anuluj',
  delete: 'Usuń',
  deleteConfirm: 'Na pewno?',
  remind: 'Przypomnij',
  move: 'Przenieś',

  // Move-to-category sheet
  moveToCategoryTitle: 'Przenieś do kategorii',
  moveToCategoryHere: 'Tutaj',

  // Reminders sheet
  reminderSheetTitle: 'Przypomnienia',
  reminderSheetSubtitle: (title: string) => `Dla zadania: „${title}"`,
  reminderEmpty: 'Bez przypomnień.',
  reminderFiredLabel: 'wysłane',
  reminderRemove: (when: string) => `Usuń przypomnienie ${when}`,
  reminderAdd: 'Dodaj termin',
  reminderPick: 'Wybierz termin',

  // Push
  pushEnable: 'Włącz powiadomienia push na wielu urządzeniach',
  pushHint:
    'Zapisuje token FCM tego urządzenia, aby Cloud Function mogła dostarczać przypomnienia, nawet gdy aplikacja jest zamknięta.',
  pushSetupFailed: 'Konfiguracja powiadomień nie powiodła się',

  // Settings sheet (Phase 8)
  signedInAs: 'Zalogowany jako',
  appearance: 'Wygląd',
  accentLabel: 'Kolor akcentu',
  storage: 'Przechowywanie',
  pushTitle: 'Powiadomienia push',
  pushHelper: 'Przypomnienia działają, gdy aplikacja jest zamknięta.',
  pushOn: 'Włączone',
  pushOff: 'Wyłączone',
  installTitle: 'Zainstaluj aplikację',
  installHelper: 'Dodaj do ekranu początkowego, aby otwierać szybciej.',

  // Update available (PWA new SW waiting)
  updateAvailable: 'Dostępna jest nowa wersja',
  updateApply: 'Zaktualizuj',
  updateDismiss: 'Później',

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
