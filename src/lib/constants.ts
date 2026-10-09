export const ASSIGNMENT_STATUSES = ['To do', 'In progress', 'Done'] as const;
export const ASSIGNMENT_PRIORITIES = ['High', 'Medium', 'Low'] as const;

export const TRANSACTION_TYPES = ['income', 'expense'] as const;

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

/** The four schedule tints, in the order classes cycle through them. */
export const CLASS_THEMES = ['#7c9cff', '#5fd0b0', '#e8a76b', '#c08cf0'] as const;

export const CHART_PERIODS = ['daily', 'weekly', 'monthly'] as const;

export const CURRENCIES = ['IDR', 'USD', 'EUR', 'GBP', 'SGD', 'MYR', 'JPY', 'AUD'] as const;

export const DEFAULT_CURRENCY = 'IDR';

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_BUCKET = 'avatars';

/** Notes autosave debounce, in milliseconds. */
export const NOTE_AUTOSAVE_MS = 800;

/** nav items, in the order the sidebar lists them */
export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/cashflow', label: 'Cashflow', icon: 'Wallet' },
  { href: '/assignments', label: 'Assignments', icon: 'ClipboardList' },
  { href: '/schedule', label: 'Schedule', icon: 'Calendar' },
  { href: '/notes', label: 'Notes', icon: 'StickyNote' },
] as const;