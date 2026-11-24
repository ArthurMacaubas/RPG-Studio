'use client';

import { useEffect } from 'react';
import { themeConfigToStyle, type CampaignThemeConfig } from '@/lib/campaignTheme';

export function CampaignThemeRuntime({ config, faviconUrl }: { config: CampaignThemeConfig; faviconUrl?: string }) {
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>('[data-campaign-theme]');
    const root = document.documentElement;
    if (!shell) return;

    const applyMode = () => {
      const mode = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      const style = themeConfigToStyle(config, mode);
      for (const [property, value] of Object.entries(style)) {
        if (property.startsWith('--')) shell.style.setProperty(property, String(value));
        else if (property === 'colorScheme') shell.style.colorScheme = String(value);
      }
    };

    applyMode();
    const observer = new MutationObserver(applyMode);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [config]);

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
