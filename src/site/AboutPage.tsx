import { useEffect } from 'react';
import aboutHtml from './content/about.html?raw';
import { PageHero } from './PageHero.tsx';
import { SiteLayout } from './SiteLayout.tsx';
import { navigate } from '../hooks/useHashRoute.ts';

export function AboutPage(): React.JSX.Element {
  useEffect(() => {
    document.title = 'About — North Florida Wavemakers';
  }, []);

  return (
    <SiteLayout current="about">
      <PageHero lead="Who we are, what we run, and answers to common questions." title="About" />
      <div
        dangerouslySetInnerHTML={{ __html: aboutHtml }}
        onClick={(event) => {
          const target = event.target;
          if (!(target instanceof Element)) return;
          const anchor = target.closest('a');
          if (!anchor) return;
          const href = anchor.getAttribute('href');
          if (!href) return;
          if (href === '/schedule' || href === '/lessons' || href.startsWith('/lessons/')) {
            event.preventDefault();
            navigate(href.replace(/^\//, ''));
          }
        }}
      />
    </SiteLayout>
  );
}
