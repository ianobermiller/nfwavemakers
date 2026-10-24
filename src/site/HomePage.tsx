import { useEffect } from 'react';
import { navigate } from '../hooks/useHashRoute.ts';
import { SiteLayout } from './SiteLayout.tsx';

const button =
  'inline-flex items-center justify-center rounded-lg px-6 py-3 text-[0.95rem] font-semibold no-underline hover:no-underline';

export function HomePage(): React.JSX.Element {
  useEffect(() => {
    document.title = 'North Florida Wavemakers — Speech & Debate Club';
  }, []);

  return (
    <SiteLayout current="home">
      <section className="bg-gradient-to-br from-nf-blue to-nf-blue-mid px-5 py-20 text-center text-white">
        <h1 className="text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">
          Make Waves.
          <br />
          Make Your Case.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-sky-100">
          A student speech &amp; debate club in St. Johns County built on critical thinking,
          communication, truth, grace, and collaboration.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a
            href="/about"
            className={`${button} bg-nf-accent text-white shadow-md hover:bg-sky-600`}
            onClick={(event) => {
              event.preventDefault();
              navigate('about');
            }}
          >
            About the Club
          </a>
          <a
            href="/join"
            className={`${button} border-2 border-white/70 text-white hover:border-white hover:bg-white/10`}
            onClick={(event) => {
              event.preventDefault();
              navigate('join');
            }}
          >
            Get in Touch
          </a>
        </div>
      </section>

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
