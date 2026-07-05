import { useState } from 'react';
import { cn } from 'cnfast';
import { db } from '../db.ts';
import { useUndoDelete } from '../hooks/useUndoDelete.ts';
import { useAvatarURLs } from '../hooks/useAvatarURLs.ts';
import { PageLayout } from './PageLayout.tsx';
import { ScoringRows } from './ScoringRows.tsx';
import { POSITIONS, POSITION_LABELS } from '../types.ts';
import { formatSpeakerName, scoringTotal } from '../utils.ts';
import { Avatar } from './Avatar.tsx';
import { DebateCard } from './DebateCard.tsx';
import { SpeakerNotes } from './SpeakerNotes.tsx';

type TabView = 'debate' | 'student' | 'stranded';

export function AdminBallots(): React.JSX.Element {
  const [view, setView] = useState<TabView>('debate');

  return (
    <PageLayout>
      <div className="flex gap-2 mb-5">
        {(['debate', 'student', 'stranded'] as const).map((t) => (
          <button
            key={t}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer border transition-colors',
              view === t
                ? 'bg-nf-blue dark:bg-nf-blue-d text-white border-nf-blue dark:border-nf-blue-d'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-nf-accent',
            )}
            onClick={() => setView(t)}
          >
            {t === 'debate' ? 'By Debate' : t === 'student' ? 'By Student' : 'Stranded'}
          </button>
        ))}
      </div>

      {view === 'debate' ? <ByDebate /> : view === 'student' ? <ByStudent /> : <Stranded />}
    </PageLayout>
  );
}

function ByDebate(): React.JSX.Element {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading } = db.useQuery({
    debates: {
      $: { order: { serverCreatedAt: 'desc' } },
      ballots: {
        judge: {},
        speakerEvals: { speaker: {} },
      },
    },
  });

  if (isLoading) {
    return <p className="text-slate-500 dark:text-slate-400 text-sm">Loading…</p>;
  }

  const debates = data?.debates ?? [];

  if (debates.length === 0) {
    return (
      <p className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
        No debates yet.
      </p>
    );
  }

  function toggle(id: string): void {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {debates.map((d) => {
        const submittedBallots = (d.ballots ?? []).filter((b) => b.submittedAt != null);
        const isOpen = expanded.has(d.id);
        return (
          <div
            key={d.id}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
          >
            <DebateCard
              id={`debate-btn-${d.id}`}
              debateId={d.id}
              badge={`${submittedBallots.length} ballot${submittedBallots.length !== 1 ? 's' : ''}`}
              isExpanded={isOpen}
              onClick={() => toggle(d.id)}
              ariaControls={`debate-panel-${d.id}`}
              className="rounded-none border-0 hover:border-0 hover:shadow-none hover:bg-slate-50 dark:hover:bg-slate-700/50"
            />

            <div
              id={`debate-panel-${d.id}`}
              role="region"
              aria-labelledby={`debate-btn-${d.id}`}
              hidden={!isOpen}
              className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 flex flex-col gap-4"
            >
              {submittedBallots.length === 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  No submitted ballots yet.
                </p>
              )}
              {submittedBallots.map((ballot) => (
                <BallotSummary key={ballot.id} ballot={ballot} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ByStudent(): React.JSX.Element {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading } = db.useQuery({
    speakerEvals: {
      speaker: {},
      ballot: {
        debate: {},
        judge: {},
      },
    },
  });

  const avatarURLs = useAvatarURLs((data?.speakerEvals ?? []).map((e) => e.speaker?.id));

  if (isLoading) {
    return <p className="text-slate-500 dark:text-slate-400 text-sm">Loading…</p>;
  }

  const allEvals = (data?.speakerEvals ?? []).filter((e) => e.ballot?.submittedAt != null);

  // Group by student id
  const byStudent = new Map<string, { name: string | null | undefined; evals: typeof allEvals }>();
  for (const ev of allEvals) {
    if (!ev.speaker) continue;
    const sid = ev.speaker.id;
    const entry = byStudent.get(sid) ?? { name: ev.speaker.name, evals: [] };
    entry.evals.push(ev);
    byStudent.set(sid, entry);
  }

  const students = [...byStudent.entries()].sort((a, b) => {
    const an = a[1].name ?? '';
    const bn = b[1].name ?? '';
    return an.localeCompare(bn);
  });

  if (students.length === 0) {
    return (
      <p className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
        No submitted ballots yet.
      </p>
    );
  }

  function toggle(id: string): void {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {students.map(([sid, { name, evals }]) => {
        const isOpen = expanded.has(sid);
        const displayName = name ? formatSpeakerName(name) : sid;

        // Group evals by debate/ballot
        const byGroup = new Map<string, typeof evals>();
        for (const ev of evals) {
          const key = ev.ballot?.debate?.id ?? ev.ballot?.id;
          if (!key) continue;
          const arr = byGroup.get(key) ?? [];
          arr.push(ev);
          byGroup.set(key, arr);
        }

        return (
          <div
            key={sid}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
          >
            <button
              id={`student-btn-${sid}`}
              className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              onClick={() => toggle(sid)}
              aria-expanded={isOpen}
              aria-controls={`student-panel-${sid}`}
            >
              <div className="flex items-center gap-3">
                <Avatar name={name ?? sid} imageURL={avatarURLs[sid]} size="sm" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {displayName}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {byGroup.size} debate{byGroup.size !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-slate-400 text-xs shrink-0" aria-hidden="true">
                {isOpen ? '▲' : '▼'}
              </span>
            </button>

            <div
              id={`student-panel-${sid}`}
              role="region"
              aria-labelledby={`student-btn-${sid}`}
              hidden={!isOpen}
              className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 flex flex-col gap-4"
            >
              {[...byGroup.entries()].map(([groupKey, groupEvals]) => {
                const ballot = groupEvals[0]?.ballot;
                const debate = ballot?.debate;

                // Sub-group evals by judge so each judge's name sits above their ballot
                const byJudge = new Map<string, typeof groupEvals>();
                for (const ev of groupEvals) {
                  const jkey = ev.ballot?.judge?.id ?? ev.ballot?.judge?.name ?? '—';
                  const arr = byJudge.get(jkey) ?? [];
                  arr.push(ev);
                  byJudge.set(jkey, arr);
                }

                return (
                  <div key={groupKey}>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {debate?.date ?? '—'}
                      </span>
                      {debate?.room && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {debate.room}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
                      {[...byJudge.entries()].map(([jkey, judgeEvals]) => {
                        const judgeName = judgeEvals[0]?.ballot?.judge?.name;
                        return (
                          <div key={jkey}>
                            {judgeName && (
                              <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                                Judge: {judgeName}
                              </span>
                            )}
                            {judgeEvals.map((ev) => (
                              <StudentEvalCard key={ev.id} ev={ev} />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type StrandedBallotPayload = {
  id: string;
  judgeName?: string;
  submittedAt: number;
};

function Stranded(): React.JSX.Element {
  const { data, isLoading } = db.useQuery({
    ballots: {
      debate: {},
      judge: {},
    },
  });

  const strandedBallots = (data?.ballots ?? [])
    .filter((b) => b.submittedAt != null && b.debate == null)
    .sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0));

  const avatarURLs = useAvatarURLs(strandedBallots.map((b) => b.judge?.id));

  const { pendingDeletes, softDelete, undo } = useUndoDelete<StrandedBallotPayload>(
    (payload) => db.transact([db.tx.ballots[payload.id]!.update({ deletedAt: Date.now() })]),
    (payload) => {
      void db.transact([db.tx.ballots[payload.id]!.update({ deletedAt: null })]);
    },
  );

  if (isLoading) {
    return <p className="text-slate-500 dark:text-slate-400 text-sm">Loading…</p>;
  }

  const pendingList = [...pendingDeletes.values()];

  if (strandedBallots.length === 0 && pendingList.length === 0) {
    return (
      <p className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
        No stranded ballots.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {pendingList.map((pd) => (
        <div
          key={pd.id}
          className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500 dark:text-slate-400"
        >
          <span>Ballot deleted.</span>
          <button
            className="shrink-0 text-nf-blue dark:text-nf-blue-d font-semibold hover:underline cursor-pointer border-none bg-transparent text-sm"
            onClick={() => undo(pd.id)}
          >
            Undo
          </button>
        </div>
      ))}
      {strandedBallots.map((b) => (
        <div
          key={b.id}
          className="flex items-center justify-between gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              name={b.judge?.name ?? 'Unknown judge'}
              imageURL={b.judge?.id ? avatarURLs[b.judge.id] : undefined}
              size="sm"
            />
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {b.judge?.name ?? 'Unknown judge'}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Submitted {new Date(b.submittedAt!).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button
            className="shrink-0 px-3 py-1.5 text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-200 font-medium cursor-pointer border-none bg-transparent transition-colors"
            onClick={() =>
              void softDelete(b.id, {
                id: b.id,
                ...(b.judge?.name != null && { judgeName: b.judge.name }),
                submittedAt: b.submittedAt!,
              })
            }
            aria-label="Delete ballot"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

type BallotWithDetails = {
  id: string;
  winner?: string;
  reasonForDecision?: string;
  judge: { name?: string } | undefined;
  speakerEvals: Array<{
    id: string;
    position: string;
    rank?: number;
    notes?: string;
    speaker: { id: string; name?: string } | undefined;
    delivery?: number;
    organization?: number;
    evidenceAndSupport?: number;
    refutation?: number;
    crossExamination?: number;
    conduct?: number;
  }>;
};

function BallotSummary({ ballot }: { ballot: BallotWithDetails }): React.JSX.Element {
  const evals = ballot.speakerEvals ?? [];
  const avatarURLs = useAvatarURLs(evals.map((e) => e.speaker?.id));
  const evalsByPos = Object.fromEntries(
    POSITIONS.map((pos) => [pos, evals.find((e) => e.position === pos)]),
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          Judge: {ballot.judge?.name ?? '—'}
        </span>
        <span
          className={cn(
            'text-xs font-semibold px-2 py-0.5 rounded-full',
            ballot.winner === 'aff'
              ? 'bg-aff-bg dark:bg-aff-bg-d text-aff dark:text-aff-d'
              : ballot.winner === 'neg'
                ? 'bg-neg-bg dark:bg-neg-bg-d text-neg dark:text-neg-d'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500',
          )}
        >
          {ballot.winner === 'aff'
            ? 'Aff wins'
            : ballot.winner === 'neg'
              ? 'Neg wins'
              : 'No decision'}
        </span>
      </div>
      {ballot.reasonForDecision && (
        <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 whitespace-pre-wrap">
          {ballot.reasonForDecision}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(['aff', 'neg'] as const).map((side) => (
          <div key={side}>
            <div
              className={cn(
                'text-xs font-bold uppercase tracking-wider px-2 py-1 rounded mb-2',
                side === 'aff'
                  ? 'bg-aff-bg dark:bg-aff-bg-d text-aff dark:text-aff-d'
                  : 'bg-neg-bg dark:bg-neg-bg-d text-neg dark:text-neg-d',
              )}
            >
              {side === 'aff' ? 'Affirmative' : 'Negative'}
            </div>
            {([`${side}1`, `${side}2`] as const).map((pos) => {
              const ev = evalsByPos[pos];
              if (!ev) return null;
              const total = scoringTotal(ev);
              return (
                <div
                  key={pos}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2 mb-2"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      {ev.speaker?.id && (
                        <Avatar
                          name={ev.speaker.name ?? ev.speaker.id}
                          imageURL={avatarURLs[ev.speaker.id]}
                          size="xs"
                        />
                      )}
                      <span>
                        {POSITION_LABELS[pos]}
                        {ev.speaker?.name && (
                          <span className="ml-1.5 text-slate-700 dark:text-slate-200 font-semibold">
                            {formatSpeakerName(ev.speaker.name)}
                          </span>
                        )}
                        {ev.rank != null && (
                          <span className="ml-1.5 text-slate-400 dark:text-slate-500 font-normal">
                            · #{ev.rank}
                          </span>
                        )}
                      </span>
                    </span>
                    {total > 0 && (
                      <span className="text-xs font-bold text-nf-blue dark:text-nf-blue-d">
                        {total}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <ScoringRows scores={ev} />
                  </div>
                  {ev.notes && <SpeakerNotes notes={ev.notes} />}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

type EvalWithDetails = {
  id: string;
  position?: string | null;
  rank?: number | null;
  notes?: string | null;
  delivery?: number | null;
  organization?: number | null;
  evidenceAndSupport?: number | null;
  refutation?: number | null;
  crossExamination?: number | null;
  conduct?: number | null;
};

function StudentEvalCard({ ev }: { ev: EvalWithDetails }): React.JSX.Element {
  const total = scoringTotal(ev);
  const pos = ev.position as (typeof POSITIONS)[number] | undefined;

  return (
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2 mb-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {pos ? POSITION_LABELS[pos] : ev.position}
          {ev.rank != null && (
            <span className="ml-1.5 text-slate-400 dark:text-slate-500"> · #{ev.rank}</span>
          )}
        </span>
        {total > 0 && (
          <span className="text-xs font-bold text-nf-blue dark:text-nf-blue-d">{total}</span>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <ScoringRows scores={ev} />
      </div>
      {ev.notes && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 whitespace-pre-wrap">
          {ev.notes}
        </p>
      )}
    </div>
  );
}
