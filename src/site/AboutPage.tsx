import { useEffect } from 'react';
import aboutHtml from './content/about.html?raw';
import { SiteLayout } from './SiteLayout.tsx';
import { navigate } from '../hooks/useHashRoute.ts';

export function AboutPage(): React.JSX.Element {
  useEffect(() => {
    document.title = 'About — North Florida Wavemakers';
  }, []);

  return (
    <SiteLayout current="about">
      <div className="bg-gradient-to-br from-nf-blue to-nf-blue-mid px-5 py-14 text-center text-white">
        <h1 className="text-4xl font-extrabold tracking-tight">About</h1>
        <p className="mx-auto mt-3 max-w-xl text-sky-100">
          Who we are, what we run, and answers to common questions.
        </p>
      </div>
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
