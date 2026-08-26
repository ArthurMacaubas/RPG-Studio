'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import styles from './Toast.module.css';

type ToastTone = 'success' | 'error' | 'warning' | 'info';
type ToastItem = { id: number; tone: ToastTone; title: string; message?: string };

type ToastContextValue = { toast: (input: Omit<ToastItem, 'id'>) => void };
const ToastContext = createContext<ToastContextValue | null>(null);
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = useCallback((input: Omit<ToastItem, 'id'>) => {
    const id = nextId++;
    setItems((current) => [...current, { ...input, id }]);
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 4200);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  return <ToastContext.Provider value={value}>{children}<div className={styles.viewport} aria-live="polite" aria-atomic="true">{items.map((item) => <div key={item.id} className={`${styles.toast} ${styles[item.tone]}`}><strong>{item.title}</strong>{item.message && <span>{item.message}</span>}</div>)}</div></ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast precisa estar dentro de ToastProvider.');
  return context;
}
