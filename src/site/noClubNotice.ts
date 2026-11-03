/** Last Eastern calendar day the cancellation stays on the site. */
const VISIBLE_THROUGH = '2026-11-10';

/** Dismissal is stored only for this cancellation, not a later one. */
export const NO_CLUB_NOTICE_STORAGE_KEY = `nfw-no-club-notice:${VISIBLE_THROUGH}`;

const DISMISSED = 'dismissed';

export function readNoClubNoticeDismissed(storage: Pick<Storage, 'getItem'>): boolean {
  try {
    return storage.getItem(NO_CLUB_NOTICE_STORAGE_KEY) === DISMISSED;
  } catch {
    return false;
  }
}

export function writeNoClubNoticeDismissed(storage: Pick<Storage, 'setItem'>): void {
  storage.setItem(NO_CLUB_NOTICE_STORAGE_KEY, DISMISSED);
}

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
