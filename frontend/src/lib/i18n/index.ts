export type Locale = 'en' | 'ro';

export const defaultLocale: Locale = 'en';

const en = {
  app: {
    name: 'Noxus Panel',
    tagline: 'FiveM QB-Core Server Management',
  },
  nav: {
    dashboard: 'Dashboard',
    console: 'Console',
    resources: 'Resources',
    players: 'Players',
    config: 'Config',
    backups: 'Backups',
    audit: 'Audit Logs',
    settings: 'Settings',
    logout: 'Logout',
  },
  auth: {
    login: 'Sign In',
    username: 'Username',
    password: 'Password',
    invalid: 'Invalid credentials',
  },
  dashboard: {
    title: 'Dashboard',
    online: 'Online',
    offline: 'Offline',
    uptime: 'Uptime',
    players: 'Players',
    cpu: 'CPU',
    ram: 'RAM',
    disk: 'Disk',
    start: 'Start Server',
    stop: 'Stop Server',
    restart: 'Restart Server',
    backup: 'Backup Now',
  },
  common: {
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    search: 'Search',
    notInstalled: 'Not installed',
    confirm: 'Confirm',
    error: 'Error',
    success: 'Success',
  },
};

const ro: typeof en = {
  app: {
    name: 'Noxus Panel',
    tagline: 'Administrare server FiveM QB-Core',
  },
  nav: {
    dashboard: 'Panou',
    console: 'Consolă',
    resources: 'Resurse',
    players: 'Jucători',
    config: 'Config',
    backups: 'Backup-uri',
    audit: 'Jurnal audit',
    settings: 'Setări',
    logout: 'Deconectare',
  },
  auth: {
    login: 'Autentificare',
    username: 'Utilizator',
    password: 'Parolă',
    invalid: 'Date invalide',
  },
  dashboard: {
    title: 'Panou',
    online: 'Online',
    offline: 'Offline',
    uptime: 'Timp activ',
    players: 'Jucători',
    cpu: 'CPU',
    ram: 'RAM',
    disk: 'Disk',
    start: 'Pornește server',
    stop: 'Oprește server',
    restart: 'Repornește server',
    backup: 'Backup acum',
  },
  common: {
    loading: 'Se încarcă...',
    save: 'Salvează',
    cancel: 'Anulează',
    search: 'Caută',
    notInstalled: 'Neinstalat',
    confirm: 'Confirmă',
    error: 'Eroare',
    success: 'Succes',
  },
};

const dictionaries = { en, ro };

export function getDictionary(locale: Locale = defaultLocale) {
  return dictionaries[locale] || dictionaries.en;
}

export function t(locale: Locale, path: string): string {
  const dict = getDictionary(locale);
  const keys = path.split('.');
  let value: unknown = dict;
  for (const key of keys) {
    value = (value as Record<string, unknown>)?.[key];
  }
  return typeof value === 'string' ? value : path;
}
