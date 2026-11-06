import { useEffect } from 'react';
import { navigate } from '../hooks/useHashRoute.ts';
import { HeroLink } from './HeroLink.tsx';
import { PageHero } from './PageHero.tsx';
import { SiteLayout } from './SiteLayout.tsx';

export function HomePage(): React.JSX.Element {
  useEffect(() => {
    document.title = 'North Florida Wavemakers — Speech & Debate Club';
  }, []);

  return (
    <SiteLayout current="home">
      <PageHero
        lead="A student speech & debate club in St. Johns County built on critical thinking, communication, truth, grace, and collaboration."
        spacious
        title={
          <>
            Make Waves.
            <br />
            Make Your Case.
          </>
        }
      >
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
          <HeroLink
            href="/about"
            onClick={(event) => {
              event.preventDefault();
              navigate('about');
            }}
          >
            About the Club
          </HeroLink>
          <HeroLink
            href="/join"
            variant="outline"
            onClick={(event) => {
              event.preventDefault();
              navigate('join');
            }}
          >
            Get in Touch
          </HeroLink>
        </div>
      </PageHero>

      <div className="bg-gradient-to-b from-nf-blue to-[#0d2347] px-6 py-12 text-center text-white">
        <img
          src="/images/logo.svg"
          alt=""
          className="mx-auto mb-4 h-16 brightness-0 invert opacity-80"
        />
        <blockquote>
          <p className="text-xl leading-relaxed">
            &ldquo;For I am the{' '}
            <span className="text-[0.85em] font-semibold tracking-wide">Lord</span> your God,
            <br />
            who stirs up the sea so that its waves roar&rdquo;
          </p>
          <cite className="mt-3 block text-sm text-nf-accent not-italic">Isaiah 51:15</cite>
        </blockquote>
      </div>
    </SiteLayout>
  );
}
