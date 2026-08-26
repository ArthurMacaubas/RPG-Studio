import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Panel.module.css';

export function Panel({ title, eyebrow, action, children, className = '', ...props }: HTMLAttributes<HTMLElement> & { title?: string; eyebrow?: string; action?: ReactNode }) {
  return (
    <section {...props} className={`${styles.panel} ${className}`}>
      {(title || eyebrow || action) && <header className={styles.header}>{<div>{eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}{title && <h2 className={styles.title}>{title}</h2>}</div>}{action}</header>}
      {children}
    </section>
  );
}
