export type Category =
    | 'housing'
    | 'utility'
    | 'sub'
    | 'auto'
    | 'health'
    | 'other';

export interface Bill {
    id: string;
    name: string;
    amount: number;
    dueDay: number; // day of month 1-31
    category: Category;
    recurring: boolean;
    monthKey?: string; // "YYYY-M" for one-time bills
    notes?: string;
    notifyDaysBefore: number; // 0 = day of, 1 = 1 day before, 3 = 3 days before, 7 = 1 week before
    color?: string;
}

export interface PaidRecord {
    [billId: string]: boolean;
}

export interface MonthlyPaid {
    [monthKey: string]: PaidRecord;
}

export const CATEGORIES: {
    id: Category;
    label: string;
    icon: string;
    color: string;
}[] = [
    { id: 'housing', label: 'Housing', icon: '🏠', color: '#7B9EF0' },
    { id: 'utility', label: 'Utilities', icon: '💡', color: '#F0C97B' },
    { id: 'sub', label: 'Subscriptions', icon: '📺', color: '#B07BF0' },
    { id: 'auto', label: 'Auto', icon: '🚗', color: '#7BF0C9' },
    { id: 'health', label: 'Health', icon: '💊', color: '#F07B7B' },
    { id: 'other', label: 'Other', icon: '📋', color: '#C8A96E' },
];

export const NOTIFY_OPTIONS = [
    { value: 0, label: 'Day of' },
    { value: 1, label: '1 day before' },
    { value: 3, label: '3 days before' },
    { value: 7, label: '1 week before' },
];

export function getMonthKey(year: number, month: number) {
    return `${year}-${month}`;
}

export function getCategoryInfo(id: Category) {
    return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[5];
}

export function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
    }).format(amount);
}

export function ordinal(n: number) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function isOverdue(
    bill: Bill,
    monthKey: string,
    paid: boolean,
): boolean {
    const today = new Date();
    const [year, month] = monthKey.split('-').map(Number);
    if (year !== today.getFullYear() || month !== today.getMonth())
        return false;
    return !paid && bill.dueDay < today.getDate();
}

export function isDueSoon(
    bill: Bill,
    monthKey: string,
    paid: boolean,
): boolean {
    const today = new Date();
    const [year, month] = monthKey.split('-').map(Number);
    if (year !== today.getFullYear() || month !== today.getMonth())
        return false;
    const daysUntilDue = bill.dueDay - today.getDate();
    return !paid && daysUntilDue >= 0 && daysUntilDue <= 3;
}

// localStorage keys
export const STORAGE_BILLS = 'billfold_bills_v2';
export const STORAGE_PAID_PREFIX = 'billfold_paid_';
export const STORAGE_PUSH_SUB = 'billfold_push_sub';
