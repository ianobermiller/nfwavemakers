import { DEBATE_EVENT_LABELS, positionLabel, positionsForEvent, type Position } from '../types.ts';
import { useDebateDetail } from '../hooks/data.ts';
import { formatSpeakerName, scoringTotal } from '../utils/format.ts';
import { BackLink } from './BackLink.tsx';
import { PageLayout } from '@/site/PageLayout.tsx';
import { SpeakerSeatCard } from './SpeakerSeatCard.tsx';
import { Heading } from './ui/Heading.tsx';
import { Muted } from './ui/Muted.tsx';
import { SideLabel } from './ui/SideLabel.tsx';

interface Props {
  debateId: string;
  currentUserId: string;
}

export function DebateView({ debateId, currentUserId }: Props): React.JSX.Element {
  const dataLive = useDebateDetail(debateId);
  const data = dataLive.read();

  const debate = data?.debate;
  if (!debate) {
    return (
      <PageLayout>
        <BackLink to="dashboard" label="Dashboard" />
        <p className="text-slate-500 dark:text-slate-400 text-sm">Debate not found.</p>
      </PageLayout>
    );
  }

  const affIds = debate.affTeam.map((user) => user.id);
  const negIds = debate.negTeam.map((user) => user.id);
  const isMember = affIds.includes(currentUserId) || negIds.includes(currentUserId);
  if (!isMember) {
    return (
      <PageLayout>
        <BackLink to="dashboard" label="Dashboard" />
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          You don't have access to this debate.
        </p>
      </PageLayout>
    );
  }

  const ballots = data.ballots;
  const seats = positionsForEvent(debate.event);

  function seatsForSide(side: 'aff' | 'neg'): Position[] {
    return seats.filter((pos) => pos.startsWith(side));
  }

  return (
    <PageLayout>
      <BackLink to="dashboard" label="Dashboard" />
      <h1 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3">
        {debate.date ? `Debate — ${debate.date}, Room ${debate.room}` : 'Debate'}
      </h1>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mb-6 flex flex-col gap-1 text-sm">
        <div>
          <strong>Event:</strong> {DEBATE_EVENT_LABELS[debate.event]}
        </div>
        <div>
          <strong>Date:</strong> {debate.date}
        </div>
        <div>
          <strong>Room:</strong> {debate.room}
        </div>
        {debate.caseTitle && (
          <div>
            <strong>Case:</strong> {debate.caseTitle}
          </div>
        )}
      </div>

      {ballots.length === 0 && (
        <p className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
          No submitted ballots yet.
        </p>
      )}

      {ballots.map((ballot) => {
        const evals = ballot.speakerEvals;
        const evalsByPos = Object.fromEntries(
          seats.map((pos) => [pos, evals.find((e) => e.position === pos)]),
        );
        return (
          <div
            key={ballot.id}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 mb-5 shadow-sm"
          >
            <Heading variant="card">Judge: {ballot.judge?.name ?? '—'}</Heading>
            <Muted as="p" size="xs" className="mb-4">
              Winner:{' '}
              {ballot.winner === 'aff' ? 'Affirmative' : ballot.winner === 'neg' ? 'Negative' : '—'}
            </Muted>

            {ballot.reasonForDecision && (
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 whitespace-pre-wrap">
                {ballot.reasonForDecision}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(['aff', 'neg'] as const).map((side) => (
                <div key={side}>
                  <SideLabel side={side} as="h3">
                    {side === 'aff' ? 'Affirmative' : 'Negative'}
                  </SideLabel>
                  {seatsForSide(side).map((pos) => {
                    const ev = evalsByPos[pos];
                    const total = scoringTotal(ev ?? {});
                    const role =
                      debate.event === 'ld' ? 'Debater' : positionLabel(debate.event, pos);
                    const name = ev?.speaker?.name ? formatSpeakerName(ev.speaker.name) : undefined;
                    return (
                      <SpeakerSeatCard
                        key={pos}
                        role={role}
                        name={name}
                        rank={ev?.rank}
                        total={total}
                        scores={ev ?? {}}
                        notes={ev?.notes}
                        isYou={ev?.speaker?.id === currentUserId}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </PageLayout>
  );
}
