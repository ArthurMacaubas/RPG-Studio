import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export function Badge({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'; className?: string }) {
  return <span className={`${styles.badge} ${styles[tone]} ${className}`}>{children}</span>;
}
