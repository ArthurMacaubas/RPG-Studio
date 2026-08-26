'use client';

import type { InputHTMLAttributes } from 'react';
import styles from './Input.module.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, id, className = '', ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <label className={styles.field} htmlFor={inputId}>
      {label && <span className={styles.label}>{label}</span>}
      <input {...props} id={inputId} className={`${styles.input} ${error ? styles.hasError : ''} ${className}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined} />
      {error ? <span id={`${inputId}-error`} className={styles.error} role="alert">{error}</span> : hint ? <span id={`${inputId}-hint`} className={styles.hint}>{hint}</span> : null}
    </label>
  );
}
