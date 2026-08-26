import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import styles from './Breadcrumb.module.css';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className={styles.crumbs} aria-label="breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {item.href && !isLast ? (
              <Link href={item.href as never} className={styles.crumb}>
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? styles.crumbCurrent : styles.crumb}>{item.label}</span>
            )}
            {!isLast && <ChevronRight size={12} className={styles.sep} />}
          </span>
        );
      })}
    </nav>
  );
}
