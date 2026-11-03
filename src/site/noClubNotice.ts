/** Last Eastern calendar day the cancellation stays on the site. */
const VISIBLE_THROUGH = '2026-11-10';

const easternDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export type NoClubNoticeWhen = 'next-week' | 'today';

/**
 * Which cancellation headline to show, or null once Tuesday, November 10, 2026
 * has ended in Eastern time.
 */
export function noClubNoticeWhen(now: Date = new Date()): NoClubNoticeWhen | null {
  const day = easternDate.format(now);
  if (day > VISIBLE_THROUGH) return null;
  return day === VISIBLE_THROUGH ? 'today' : 'next-week';
}
