import type { Role } from '../../types.ts';
import { useUpcomingDebates } from '../../hooks/data.ts';
import { formatLocalYmd } from '../../lib/dates.ts';
import { navigate } from '@/hooks/useHashRoute.ts';
import { DebateCard } from '../DebateCard.tsx';

export function UpcomingDebates({ role }: { role: Role }): React.JSX.Element {
  // Local calendar day so debates dated today stay visible after UTC midnight.
  const today = formatLocalYmd(new Date());
  const upcoming = useUpcomingDebates(today).read();

  if (upcoming.length === 0) return <></>;

  const canEdit = role === 'admin';

  return (
    <section>
      <h2 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3">
        Upcoming Debates
      </h2>
      <div className="flex flex-col gap-3">
        {upcoming.map((d) => (
          <DebateCard
            key={d.id}
            debateId={d.id}
            debate={d}
            {...(canEdit ? { onClick: () => navigate(`admin/${d.id}`) } : {})}
          />
        ))}
      </div>
    </section>
  );
}
