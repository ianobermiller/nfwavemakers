import { useEffect } from 'react';
import { HeroLink } from './HeroLink.tsx';
import { PageHero } from './PageHero.tsx';
import { SiteLayout } from './SiteLayout.tsx';

export function JoinPage(): React.JSX.Element {
  useEffect(() => {
    document.title = 'Join Us — North Florida Wavemakers';
  }, []);

  return (
    <SiteLayout current="join">
      <PageHero
        lead="Interested in joining, or have questions? Reach out to our club coordinator."
        title="Join Us"
      />
      <section className="bg-nf-blue px-5 py-12 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <HeroLink
              href="https://forms.gle/rQ8qeZQgbuJhdAGq7"
              target="_blank"
              rel="noopener noreferrer"
            >
              Request More Information →
            </HeroLink>
            <HeroLink
              href="https://docs.google.com/forms/d/e/1FAIpQLSdBPD9Ich6SrqcRPW6UxAfQy86RSRtf67yCWMti78QEucDKpg/viewform"
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
            >
              Register for 2026–27 Season →
            </HeroLink>
          </div>
          <div className="mt-6 max-w-md rounded-xl border border-white/15 bg-white/5 p-8">
            <div className="mb-4 text-xl font-bold">Rebekah Behrens</div>
            <div className="flex flex-col gap-3">
              <a
                href="mailto:info@nfwavemakers.com"
                className="flex items-center gap-2 text-sky-200 no-underline hover:text-white hover:no-underline"
              >
                <MailIcon />
                info@nfwavemakers.com
              </a>
              <a
                href="tel:+15597507704"
                className="flex items-center gap-2 text-sky-200 no-underline hover:text-white hover:no-underline"
              >
                <PhoneIcon />
                559-750-7704
              </a>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function MailIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="size-5 shrink-0"
      aria-hidden="true"
    >
      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
    </svg>
  );
}

function PhoneIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="size-5 shrink-0"
      aria-hidden="true"
    >
      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
    </svg>
  );
}
