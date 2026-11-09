import { useAssignedDebates, useSubmittedBallots } from '../../hooks/data.ts';
import { navigate } from '@/hooks/useHashRoute.ts';
import { DebateCard } from '../DebateCard.tsx';
import { Card } from '../ui/Card.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { Heading } from '../ui/Heading.tsx';
import { Muted } from '../ui/Muted.tsx';

export function ParentDashboard({ userId }: { userId: string }): React.JSX.Element {
  const debatesLive = useAssignedDebates();
  const submittedLive = useSubmittedBallots();
  const debates = debatesLive.read();
  const submittedBallots = submittedLive.read();
  const submittedDebateIds = new Set(
    submittedBallots.flatMap((ballot) => (ballot.debate ? [ballot.debate.id] : [])),
  );
  const openDebates = debates.filter((debate) => !submittedDebateIds.has(debate.id));
  const hasOpenAssigned = openDebates.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {hasOpenAssigned && (
        <section>
          <Heading>Your Debates</Heading>
          <div className="flex flex-col gap-3">
            {openDebates.map((d) => (
              <DebateCard
                key={d.id}
                debateId={d.id}
                debate={d}
                onClick={() => navigate(`judge/${d.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {debates.length === 0 && (
        <EmptyState>
          No debates assigned yet. A club admin sets up each round before you can judge it.
        </EmptyState>
      )}

      {submittedBallots.length > 0 && (
        <section>
          <Heading>Your Submitted Ballots</Heading>
          <div className="flex flex-col gap-3">
            {submittedBallots.map((b) => {
              if (b.debate) {
                return (
                  <DebateCard
                    key={b.id}
                    debateId={b.debate.id}
                    debate={b.debate}
                    judgeId={userId}
                    winner={b.winner}
                    onClick={() => navigate(`ballot/${b.id}`)}
                  />
                );
              }
              const displayDate =
                b.submittedAt != null ? new Date(b.submittedAt).toLocaleDateString() : '—';
              const winnerText =
                b.winner === 'aff'
                  ? 'Affirmative wins'
                  : b.winner === 'neg'
                    ? 'Negative wins'
                    : '—';
              return (
                <Card
                  key={b.id}
                  as="button"
                  interactive
                  padding="sm"
                  className="flex w-full flex-col gap-1"
                  onClick={() => navigate(`ballot/${b.id}`)}
                >
                  <Heading as="span" variant="name">
                    {displayDate}
                  </Heading>
                  <Muted as="span" size="xs">
                    {winnerText}
                  </Muted>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
