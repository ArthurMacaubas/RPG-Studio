'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconOnly?: boolean;
}

export function Button({ variant = 'primary', size = 'md', loading = false, icon, iconOnly = false, children, className = '', disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${styles.button} ${styles[variant]} ${styles[size]} ${iconOnly ? styles.iconOnly : ''} ${className}`}
    >
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      {!loading && icon}
      {children}
    </button>
  );
}
