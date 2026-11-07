import { useSpeakerBallots } from '../../hooks/data.ts';
import { navigate } from '@/hooks/useHashRoute.ts';
import { compareByLastName } from '../../utils/format.ts';
import { Card } from '../ui/Card.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { Heading } from '../ui/Heading.tsx';
import { Muted } from '../ui/Muted.tsx';

export function StudentDashboard({ userId: _userId }: { userId: string }): React.JSX.Element {
  const ballots = useSpeakerBallots().read();

  const byGroup = new Map<string, typeof ballots>();
  for (const b of ballots) {
    const key = b.debate?.id ?? b.id;
    const arr = byGroup.get(key) ?? [];
    arr.push(b);
    byGroup.set(key, arr);
  }

  return (
    <div>
      <Heading>My Feedback</Heading>
      {byGroup.size === 0 && <EmptyState>No submitted ballots yet.</EmptyState>}
      <div className="flex flex-col gap-3">
        {[...byGroup.entries()].map(([groupKey, evs]) => {
          const ballot = evs[0];
          const debate = ballot?.debate;
          const displayDate =
            debate?.date ??
            (ballot?.submittedAt != null ? new Date(ballot.submittedAt).toLocaleDateString() : '—');
          const viewRoute = debate?.id ? `debate/${debate.id}` : `ballot/${ballot?.id}`;
          const judgeNames = [
            ...new Set(
              evs.map((ev) => ev.judge?.name).filter((name): name is string => name != null),
            ),
          ].sort((a, b) => compareByLastName({ name: a }, { name: b }));
          return (
            <Card
              key={groupKey}
              as="button"
              interactive
              padding="sm"
              className="flex w-full flex-col gap-1"
              onClick={() => navigate(viewRoute)}
            >
              <strong className="text-sm text-slate-800 dark:text-slate-100">
                {displayDate}
                {debate?.room && (
                  <Muted as="span" className="ml-2 font-normal">
                    · {debate.room}
                  </Muted>
                )}
              </strong>
              {judgeNames.map((name) => (
                <Muted key={name} as="span" size="xs" className="italic">
                  Judge: {name}
                </Muted>
              ))}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
