import { useCallback, useEffect, useRef, useState } from 'react';
import { id, type TransactionChunk } from '@instantdb/react';
import { db } from '../db.ts';
import { navigate } from '../hooks/useHashRoute.ts';
import { useAutosize } from '../hooks/useAutosize.ts';
import { SpeakerPointGuide } from './SpeakerPointGuide.tsx';
import { StudentPicker } from './StudentPicker.tsx';
import {
  POSITIONS,
  POSITION_LABELS,
  SCORE_CATEGORIES,
  type Position,
  type SpeakerFormState,
  type Winner,
} from '../types.ts';

interface Props {
  debateId?: string;
  judgeId: string;
  judgeName: string;
}

function makeEmptySpeaker(): SpeakerFormState {
  return {
    userId: '',
    delivery: undefined,
    organization: undefined,
    evidenceAndSupport: undefined,
    refutation: undefined,
    crossExamination: undefined,
    conduct: undefined,
    notes: '',
  };
}

function makeEmptySpeakers(): Record<Position, SpeakerFormState> {
  return {
    aff1: makeEmptySpeaker(),
    aff2: makeEmptySpeaker(),
    neg1: makeEmptySpeaker(),
    neg2: makeEmptySpeaker(),
  };
}

interface BallotIds {
  ballotId: string;
  evalIds: Record<Position, string>;
}

function makeNewIds(): BallotIds {
  return {
    ballotId: id(),
    evalIds: { aff1: id(), aff2: id(), neg1: id(), neg2: id() },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTxChunk = TransactionChunk<any, any>;

function computeTotal(sp: SpeakerFormState): number {
  return SCORE_CATEGORIES.reduce((sum, cat) => sum + (sp[cat.key] ?? 0), 0);
}

function AutoTextarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}): React.JSX.Element {
  const ref = useRef<HTMLTextAreaElement>(null);
  useAutosize(ref, value);
  return (
    <textarea
      ref={ref}
      className="textarea-autosize"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
    />
  );
}

function ScoreRow({
  label,
  name,
  value,
  onChange,
  onLabelClick,
}: {
  label: string;
  name: string;
  value: number | undefined;
  onChange: (v: number) => void;
  onLabelClick: () => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={onLabelClick}
        className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0 cursor-pointer bg-transparent border-none p-0 text-left hover:text-nf-accent dark:hover:text-nf-accent transition-colors"
      >
        {label}
      </button>
      <div className="flex gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={`score-btn ${value === n ? 'active' : ''}`}>
            <input
              className="sr-only"
              type="radio"
              name={`${name}-${n}`}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
            />
            {n}
          </label>
        ))}
      </div>
    </div>
  );
}

export function BallotForm({ debateId, judgeId, judgeName: _judgeName }: Props): React.JSX.Element {
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideCategory, setGuideCategory] = useState<string | undefined>(undefined);
  const [winner, setWinner] = useState<Winner | undefined>(undefined);
  const [rfd, setRfd] = useState('');
  const [speakers, setSpeakers] = useState<Record<Position, SpeakerFormState>>(makeEmptySpeakers);
  const [ids, setIds] = useState<BallotIds>(makeNewIds);
  const [rankOrder, setRankOrder] = useState<Position[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: usersData } = db.useQuery({ $users: {} });
  const students = (usersData?.$users ?? []).filter((u) => u.role === 'student');

  const { data: debateData } = db.useQuery(
    debateId
      ? {
          debates: {
            $: { where: { id: debateId } },
            affTeam: {},
            negTeam: {},
          },
        }
      : null,
  );

  const { data: existingData } = db.useQuery(
    debateId
      ? {
          ballots: {
            $: { where: { 'judge.id': judgeId, 'debate.id': debateId } },
            speakerEvals: { speaker: {} },
          },
        }
      : {
          ballots: {
            $: { where: { 'judge.id': judgeId } },
            speakerEvals: { speaker: {} },
          },
        },
  );

  useEffect(() => {
    if (initialized) return;

    const debate = debateData?.debates?.[0];
    const existingBallots = existingData?.ballots ?? [];
    const existing = debateId
      ? existingBallots[0]
      : existingBallots.find((b) => b.submittedAt == null);

    if (debateId && !debate) return;
    if (existingData === undefined) return;

    if (existing) {
      const newIds: BallotIds = {
        ballotId: existing.id,
        evalIds: { aff1: id(), aff2: id(), neg1: id(), neg2: id() },
      };
      const newSpeakers = makeEmptySpeakers();

      for (const ev of existing.speakerEvals ?? []) {
        const pos = ev.position as Position;
        if (!POSITIONS.includes(pos)) continue;
        newIds.evalIds[pos] = ev.id;
        newSpeakers[pos] = {
          userId: ev.speaker?.id ?? '',
          delivery: ev.delivery ?? undefined,
          organization: ev.organization ?? undefined,
          evidenceAndSupport: ev.evidenceAndSupport ?? undefined,
          refutation: ev.refutation ?? undefined,
          crossExamination: ev.crossExamination ?? undefined,
          conduct: ev.conduct ?? undefined,
          notes: ev.notes ?? '',
        };
      }

      // Reconstruct rank order from saved rank values.
      const ranked = (existing.speakerEvals ?? [])
        .filter((ev) => ev.rank != null && newSpeakers[ev.position as Position]?.userId)
        .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
        .map((ev) => ev.position as Position)
        .filter((pos) => POSITIONS.includes(pos));
      setRankOrder(ranked);

      setIds(newIds);
      setWinner((existing.winner as Winner | undefined) ?? undefined);
      setRfd(existing.reasonForDecision ?? '');
      setSpeakers(newSpeakers);
    } else if (debate) {
      setSpeakers((prev) => {
        const next = { ...prev };
        const affTeam = debate.affTeam ?? [];
        const negTeam = debate.negTeam ?? [];
        if (affTeam[0]) next.aff1 = { ...makeEmptySpeaker(), userId: affTeam[0].id };
        if (affTeam[1]) next.aff2 = { ...makeEmptySpeaker(), userId: affTeam[1].id };
        if (negTeam[0]) next.neg1 = { ...makeEmptySpeaker(), userId: negTeam[0].id };
        if (negTeam[1]) next.neg2 = { ...makeEmptySpeaker(), userId: negTeam[1].id };
        return next;
      });
    }

    setInitialized(true);
  }, [debateId, debateData, existingData, initialized]);

  function buildTxs(
    currentWinner: Winner | undefined,
    currentRfd: string,
    currentSpeakers: Record<Position, SpeakerFormState>,
    currentIds: BallotIds,
    currentRankOrder: Position[],
    submittedAt?: number,
  ): AnyTxChunk[] {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const ballotChunk = db.tx.ballots[currentIds.ballotId]!;
    const txs: AnyTxChunk[] = [
      ballotChunk.update({
        winner: currentWinner ?? null,
        reasonForDecision: currentRfd || null,
        ...(submittedAt !== undefined ? { submittedAt } : {}),
      }),
      ballotChunk.link({ judge: judgeId }),
    ];

    if (debateId) {
      txs.push(ballotChunk.link({ debate: debateId }));
    }

    for (const pos of POSITIONS) {
      const sp = currentSpeakers[pos];
      const evalId = currentIds.evalIds[pos];
      const rankIdx = currentRankOrder.indexOf(pos);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const evalChunk = db.tx.speakerEvals[evalId]!;
      txs.push(
        evalChunk.update({
          position: pos,
          rank: rankIdx >= 0 ? rankIdx + 1 : null,
          delivery: sp.delivery ?? null,
          organization: sp.organization ?? null,
          evidenceAndSupport: sp.evidenceAndSupport ?? null,
          refutation: sp.refutation ?? null,
          crossExamination: sp.crossExamination ?? null,
          conduct: sp.conduct ?? null,
          notes: sp.notes || null,
        }),
      );
      txs.push(evalChunk.link({ ballot: currentIds.ballotId }));
      if (sp.userId) {
        txs.push(evalChunk.link({ speaker: sp.userId }));
      }
    }

    return txs;
  }

  const scheduleSave = useCallback(
    (
      w: Winner | undefined,
      r: string,
      sp: Record<Position, SpeakerFormState>,
      i: BallotIds,
      ro: Position[],
    ) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void db.transact(buildTxs(w, r, sp, i, ro));
      }, 500);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debateId, judgeId],
  );

  function updateWinner(w: Winner): void {
    setWinner(w);
    scheduleSave(w, rfd, speakers, ids, rankOrder);
  }

  function updateRfd(r: string): void {
    setRfd(r);
    scheduleSave(winner, r, speakers, ids, rankOrder);
  }

  function updateSpeaker(pos: Position, patch: Partial<SpeakerFormState>): void {
    setSpeakers((prev) => {
      const next = { ...prev, [pos]: { ...prev[pos], ...patch } };
      scheduleSave(winner, rfd, next, ids, rankOrder);
      return next;
    });
    if ('userId' in patch && !patch.userId) {
      setRankOrder((ro) => ro.filter((p) => p !== pos));
    }
  }

  function assignRank(pos: Position, newRank: number): void {
    setRankOrder((prev) => {
      const next = prev.filter((p) => p !== pos);
      next.splice(newRank - 1, 0, pos);
      scheduleSave(winner, rfd, speakers, ids, next);
      return next;
    });
  }

  function suggestByPoints(): void {
    const active = POSITIONS.filter((pos) => speakers[pos].userId !== '');
    const sorted = [...active].sort((a, b) => computeTotal(speakers[b]) - computeTotal(speakers[a]));
    setRankOrder(sorted);
    scheduleSave(winner, rfd, speakers, ids, sorted);
  }

  const activePositions = POSITIONS.filter((pos) => speakers[pos].userId !== '');
  const allScored = activePositions.every((pos) =>
    SCORE_CATEGORIES.every((cat) => speakers[pos][cat.key] !== undefined),
  );
  const allRanked = activePositions.length > 0 && rankOrder.length === activePositions.length;
  const canSubmit = winner !== undefined && allScored && allRanked;

  async function submit(): Promise<void> {
    if (!canSubmit || !winner) return;
    setSubmitting(true);
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    await db.transact(buildTxs(winner, rfd, speakers, ids, rankOrder, Date.now()));
    navigate('dashboard');
  }

  const debate = debateData?.debates?.[0];

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-nf-blue dark:bg-slate-900 text-white h-14 flex items-center justify-between px-4 sticky top-0 z-10 shadow shrink-0">
        <button
          className="self-stretch flex items-center px-2 text-white/80 hover:text-white cursor-pointer bg-transparent border-none text-sm"
          onClick={() => navigate('dashboard')}
        >
          ← Back
        </button>
        <span className="font-bold text-base">Ballot</span>
        <button
          className="text-white border border-white/40 rounded-lg px-3 py-1 text-xs cursor-pointer bg-transparent hover:bg-white/10 transition-colors"
          onClick={() => setGuideOpen((o) => !o)}
        >
          Speaker Guide
        </button>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-4 pb-28">
        {/* Ballot metadata */}
        {debate && (
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3">
            <span>{debate.date}</span>
            <span>·</span>
            <span>Room {debate.room}</span>
            {debate.resolution && (
              <>
                <span>·</span>
                <span className="truncate">{debate.resolution}</span>
              </>
            )}
          </div>
        )}

        {/* Decision */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            {(['aff', 'neg'] as const).map((side) => (
              <label
                key={side}
                className={`inline-flex items-center gap-2 px-4 py-2 border-2 rounded-xl cursor-pointer font-semibold text-sm transition-colors ${
                  winner === side
                    ? side === 'aff'
                      ? 'border-aff bg-aff-bg dark:border-aff-d dark:bg-aff-bg-d text-aff dark:text-aff-d'
                      : 'border-neg bg-neg-bg dark:border-neg-d dark:bg-neg-bg-d text-neg dark:text-neg-d'
                    : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="winner"
                  value={side}
                  checked={winner === side}
                  onChange={() => updateWinner(side)}
                />
                {side === 'aff' ? 'Affirmative wins' : 'Negative wins'}
              </label>
            ))}
          </div>
          <div className="mt-3">
            <AutoTextarea value={rfd} onChange={updateRfd} placeholder="Reason for decision…" />
          </div>
        </div>

        {/* Speakers — 2×2 grid on md+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['aff', 'neg'] as const).map((side) => (
            <div key={side}>
              <h2
                className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg mb-2 ${
                  side === 'aff'
                    ? 'bg-aff-bg dark:bg-aff-bg-d text-aff dark:text-aff-d'
                    : 'bg-neg-bg dark:bg-neg-bg-d text-neg dark:text-neg-d'
                }`}
              >
                {side === 'aff' ? 'Affirmative' : 'Negative'}
              </h2>
              {([`${side}1`, `${side}2`] as const).map((pos) => {
                const hasUser = speakers[pos].userId !== '';
                const total = computeTotal(speakers[pos]);
                const currentRank = rankOrder.indexOf(pos) + 1;
                return (
                  <div
                    key={pos}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mb-3 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {POSITION_LABELS[pos]}
                      </h3>
                      <span className={`text-sm font-bold text-nf-blue dark:text-nf-blue-d transition-opacity ${total > 0 ? 'opacity-100' : 'opacity-0'}`}>
                        {total > 0 ? total : '0'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <StudentPicker
                          id={`speaker-${pos}`}
                          value={speakers[pos].userId}
                          onChange={(uid) => updateSpeaker(pos, { userId: uid })}
                          students={students}
                        />
                      </div>
                      {hasUser && (
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-slate-400 dark:text-slate-500">Rank</span>
                          <select
                            className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                            value={currentRank || ''}
                            onChange={(e) => {
                              const n = parseInt(e.target.value, 10);
                              if (!isNaN(n)) assignRank(pos, n);
                            }}
                          >
                            <option value="">—</option>
                            {Array.from({ length: activePositions.length }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                    {hasUser && (
                      <>
                        <div className="flex flex-col gap-1.5">
                          {SCORE_CATEGORIES.map((cat) => (
                            <ScoreRow
                              key={cat.key}
                              name={`${pos}-${cat.key}`}
                              label={cat.label}
                              value={speakers[pos][cat.key]}
                              onChange={(v) => updateSpeaker(pos, { [cat.key]: v })}
                              onLabelClick={() => {
                                setGuideCategory(cat.label);
                                setGuideOpen(true);
                              }}
                            />
                          ))}
                        </div>
                        <AutoTextarea
                          value={speakers[pos].notes}
                          onChange={(v) => updateSpeaker(pos, { notes: v })}
                          placeholder="Notes…"
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {activePositions.length > 1 && (
          <div className="flex justify-end mt-1">
            <button
              type="button"
              className="text-xs text-slate-400 dark:text-slate-500 hover:text-nf-accent dark:hover:text-nf-accent cursor-pointer bg-transparent border-none"
              onClick={suggestByPoints}
            >
              Auto-rank by points
            </button>
          </div>
        )}
      </div>

      {/* Sticky submit */}
      <div className="fixed bottom-0 inset-x-0 z-20 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-4 py-3 flex flex-col items-center gap-1.5 max-w-4xl mx-auto">
        <button
          className="w-full py-3 bg-nf-blue dark:bg-nf-blue-d hover:bg-nf-blue-mid text-white font-bold rounded-xl cursor-pointer disabled:opacity-40 transition-colors"
          disabled={!canSubmit || submitting}
          onClick={() => void submit()}
        >
          {submitting ? 'Submitting…' : 'Submit Ballot'}
        </button>
        {!canSubmit && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {winner === undefined
              ? 'Select a winner to submit.'
              : !allScored
              ? 'Score all 6 areas for each speaker to submit.'
              : 'Assign a rank to each speaker to submit.'}
          </p>
        )}
      </div>

      <SpeakerPointGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} focusCategory={guideCategory} />
    </div>
  );
}
