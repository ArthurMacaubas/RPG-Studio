import styles from './Skeleton.module.css';

export function Skeleton({ width = '100%', height = 16, radius = 'md', className = '' }: { width?: string | number; height?: string | number; radius?: 'sm' | 'md' | 'lg' | 'pill'; className?: string }) {
  return <span aria-hidden="true" className={`${styles.skeleton} ${styles[radius]} ${className}`} style={{ width, height }} />;
}
