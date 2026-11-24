'use client';

import { useEffect } from 'react';

export function CampaignThemeRuntime({ faviconUrl }: { faviconUrl?: string }) {
  useEffect(() => {
    if (!faviconUrl) return;
    const existing = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    const link = existing ?? document.createElement('link');
    const previousHref = existing?.href;
    link.rel = 'icon';
    link.href = faviconUrl;
    if (!existing) document.head.appendChild(link);
    return () => {
      if (existing && previousHref) existing.href = previousHref;
      else link.remove();
    };
  }, [faviconUrl]);

  return null;
}
