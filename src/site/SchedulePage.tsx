import { useEffect } from 'react';
import { navigate } from '../hooks/useHashRoute.ts';
import { SiteLayout } from './SiteLayout.tsx';

const CHURCH =
  'https://www.google.com/maps/place/Cross+Creek+Presbyterian+Church/data=!4m2!3m1!1s0x0:0x6081a76fd27dbafc?sa=X&ved=1t:2428&ictx=111';

const MEETINGS = [
  ['Speech', '3:30 – 5:30 PM'],
  ['Dinner', '5:30 – 6:15 PM'],
  ['Clean Up', '6:15 – 6:30 PM'],
  ['Debate', '6:30 – 9:00 PM'],
] as const;

interface Tournament {
  date: string;
  name: string;
  loc: string;
  href?: string;
}

const REGIONAL: Tournament[] = [
  { date: 'Jan 5–7, 2027', name: 'West Palm Beach Qualifier', loc: 'Palm Beach Atlantic' },
  { date: 'Feb 16–18, 2027', name: 'Jacksonville Qualifier', loc: 'Aspire Church' },
  {
    date: 'Mar 3–5, 2027',
    name: 'Sanford Qualifier',
    loc: 'Reformation Bible College',
    href: 'https://ncfca.org/tournaments/sanford-fl-qualifier/',
  },
  {
    date: 'Apr 8–9, 2027',
    name: 'Starke Qualifier',
    loc: 'Madison Street Baptist Church',
    href: 'https://ncfca.org/tournaments/starke-fl-qualifier/',
  },
  { date: 'May 11–13, 2027', name: 'Regional Championship', loc: 'Florida College, Tampa' },
];

const NATIONAL: Tournament[] = [
  {
    date: 'Nov 7, 2026',
    name: 'Sarasota Practice',
    loc: 'The Tabernacle Church',
    href: 'https://ncfca.org/tournaments/sarasota-fl-practice-touranment/',
  },
  {
    date: 'Nov 10, 2026',
    name: 'Online Fall Speech Practice',
    loc: 'Online',
    href: 'https://ncfca.org/tournaments/online-fall-speech-practice/',
  },
  {
    date: 'Nov 12, 2026',
    name: 'Online Fall Debate Practice',
    loc: 'Online',
    href: 'https://ncfca.org/tournaments/online-fall-debate-practice/',
  },
  {
    date: 'Dec 8–11, 2026',
    name: 'Online National Fall Open',
    loc: 'Online · Debate / Limited Prep',
    href: 'https://ncfca.org/tournaments/online-national-fall-open/',
  },
  {
    date: 'Jan 20–23, 2027',
    name: 'Online National Winter Open',
    loc: 'Online · Speech & Debate',
    href: 'https://ncfca.org/tournaments/online-national-winter-open/',
  },
  {
    date: 'Feb 1–4, 2027',
    name: 'Black Mountain National Open',
    loc: 'Ridgecrest Conference Center',
    href: 'https://ncfca.org/tournaments/black-mountain-nc-open/',
  },
  {
    date: 'Mar 3–6, 2027',
    name: 'Cedarville National Open',
    loc: 'Cedarville University',
    href: 'https://ncfca.org/tournaments/cedarville-oh-national-open/',
  },
  {
    date: 'Apr 20–23, 2027',
    name: 'Online National Spring Open',
    loc: 'Online · Speech & Debate',
    href: 'https://ncfca.org/tournaments/online-national-spring-open/',
  },
  {
    date: 'Jun 13–18, 2027',
    name: 'National Championship',
    loc: 'Anderson University, SC',
    href: 'https://ncfca.org/tournaments/national-championship-2027/',
  },
];

function EventList({ events }: { events: Tournament[] }): React.JSX.Element {
  return (
    <ul className="mt-4 divide-y divide-slate-200 dark:divide-white/10">
      {events.map((event) => (
        <li key={event.name} className="flex gap-4 py-3">
          <span className="w-36 shrink-0 text-sm font-semibold text-nf-accent">{event.date}</span>
          <span>
            {event.href ? (
              <a
                href={event.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-800 hover:underline dark:text-slate-100"
              >
                {event.name}
              </a>
            ) : (
              <span className="text-slate-800 dark:text-slate-100">{event.name}</span>
            )}
            <span className="block text-xs text-slate-500 dark:text-slate-400">{event.loc}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function SchedulePage(): React.JSX.Element {
  useEffect(() => {
    document.title = 'Schedule — North Florida Wavemakers';
  }, []);

  return (
    <SiteLayout current="schedule">
      <div className="bg-gradient-to-br from-nf-blue to-nf-blue-mid px-5 py-14 text-center text-white">
        <h1 className="text-4xl font-extrabold tracking-tight">Schedule</h1>
        <p className="mx-auto mt-3 max-w-xl text-sky-100">
          Tuesday meetings at Cross Creek, and the 2026–27 tournaments our members attend.
        </p>
      </div>

      <section className="px-5 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-nf-blue dark:text-white">Weekly meetings</h2>
          <p className="mt-4 max-w-3xl leading-relaxed text-slate-600 dark:text-slate-300">
            Meetings are held <strong>every Tuesday</strong> from September through May at{' '}
            <a
              href={CHURCH}
              target="_blank"
              rel="noopener noreferrer"
              className="text-nf-blue-mid hover:underline"
            >
              Cross Creek Presbyterian Church
            </a>{' '}
            in north St. Johns County, near Race Track Road off Route 13.
          </p>
          <table className="mt-6 w-full max-w-md text-sm [&_td]:border-b [&_td]:border-slate-200 [&_td]:py-2 dark:[&_td]:border-white/10 [&_td:first-child]:font-semibold [&_td:first-child]:text-nf-blue dark:[&_td:first-child]:text-white [&_td:last-child]:text-right [&_td:last-child]:text-slate-500 [&_tr:last-child_td]:border-b-0">
            <tbody>
              {MEETINGS.map(([label, time]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td>{time}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            First meeting of the 2026–27 year: <strong>Tuesday, September 15, 2026</strong>
          </p>
          <p className="mt-2 text-sm">
            <a
              href="/lessons"
              className="text-nf-blue-mid hover:underline"
              onClick={(event) => {
                event.preventDefault();
                navigate('lessons');
              }}
            >
              Lesson topics and homework →
            </a>
          </p>

          <h2 className="mt-16 text-3xl font-bold text-nf-blue dark:text-white">
            2026–27 tournaments
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-slate-800">
              <h3 className="text-lg font-bold text-nf-blue dark:text-white">Regional</h3>
              <EventList events={REGIONAL} />
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Dates not yet linked are tentative.{' '}
                <a
                  href="https://ncfca.org/tournaments?_region=region-15"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-nf-blue-mid hover:underline"
                >
                  Region 15 on NCFCA →
                </a>
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-slate-800">
              <h3 className="text-lg font-bold text-nf-blue dark:text-white">National</h3>
              <EventList events={NATIONAL} />
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                <a
                  href="https://ncfca.org/tournaments?_e=0&_region=national"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-nf-blue-mid hover:underline"
                >
                  National events on NCFCA →
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
