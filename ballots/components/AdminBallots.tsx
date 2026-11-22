import { useCallback, useState, type ReactNode } from 'react';
import { cn } from 'cnfast';
import {
  listAdminBallotDebates,
  listAdminBallotStudents,
  listAdminBallotDetails,
  restoreBallot,
  softDeleteBallot,
} from '../data/api.ts';
import type { Ballot, ResultPage, SpeakerEval } from '../data/model.ts';
import { useAdminBallotQuery } from '../hooks/useAdminBallotQuery.ts';
import { useUndoDelete } from '../hooks/useUndoDelete.ts';
import { BackLink } from './BackLink.tsx';
import { PageLayout } from '@/site/PageLayout.tsx';
import { ScoringRows } from './ScoringRows.tsx';
import { positionLabel, positionsForEvent, type DebateEvent, type Position } from '../types.ts';
import { formatSpeakerName, scoringTotal } from '../utils/format.ts';
import { Avatar } from './Avatar.tsx';
import { DebateCard } from './DebateCard.tsx';
import { SpeakerNotes } from './SpeakerNotes.tsx';
import { Button } from './ui/Button.tsx';

type TabView = 'debate' | 'student' | 'stranded';
const TAB_TITLE: Record<TabView, string> = {
  debate: 'All Ballots',
  student: 'All Ballots — By Student',
  stranded: 'All Ballots — Stranded',
};

export function AdminBallots(): React.JSX.Element {
  const [view, setView] = useState<TabView>('debate');
  return (
    <PageLayout title={TAB_TITLE[view]}>
      <BackLink to="dashboard" label="Dashboard" />
      <h1 className="mb-4 text-lg font-bold text-slate-800 dark:text-slate-100">All Ballots</h1>
      <div className="flex gap-2 mb-5" role="group" aria-label="Group ballots">
        {(['debate', 'student', 'stranded'] as const).map((tab) => (
          <Button
            key={tab}
            variant={view === tab ? 'primary' : 'neutral'}
            size="md"
            aria-pressed={view === tab}
            onClick={() => setView(tab)}
          >
            {tab === 'debate' ? 'By Debate' : tab === 'student' ? 'By Student' : 'Stranded'}
          </Button>
        ))}
      </div>
      {view === 'debate' ? <ByDebate /> : view === 'student' ? <ByStudent /> : <Stranded />}
    </PageLayout>
  );
}

function QueryContent<T>({
  query,
  children,
}: {
  query: ReturnType<typeof useAdminBallotQuery<T>>;
  children: (data: T) => ReactNode;
}): React.JSX.Element {
  const { state, retry } = query;
  if (state.status === 'loading')
    return (
      <p role="status" className="py-4 text-sm text-slate-500 dark:text-slate-400">
        Loading ballots…
      </p>
    );
  return (
    <>
      {state.error && (
        <div role="alert" className="my-3 text-sm text-red-600 dark:text-red-400">
          <p>{state.error}</p>
          <Button variant="text" onClick={retry}>
            Try again
          </Button>
        </div>
      )}
      {state.status === 'ready' && children(state.data)}
    </>
  );
}

function Pagination({
  page,
  hasMore,
  setPage,
  label,
}: {
  page: number;
  hasMore: boolean;
  setPage: (page: number) => void;
  label: string;
}): React.JSX.Element | null {
  if (page === 1 && !hasMore) return null;
  return (
    <nav aria-label={label} className="flex items-center justify-between gap-3 py-4">
      <Button variant="neutral" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
        Previous
      </Button>
      <span className="text-xs text-slate-500 dark:text-slate-400">Page {page}</span>
      <Button variant="neutral" size="sm" disabled={!hasMore} onClick={() => setPage(page + 1)}>
        Next
      </Button>
    </nav>
  );
}

function Empty({ children }: { children: ReactNode }): React.JSX.Element {
  return <p className="py-8 text-sm text-slate-500 dark:text-slate-400">{children}</p>;
}

function SummaryPages({
  children,
}: {
  children: (page: number, loadMore: (() => void) | undefined) => ReactNode;
}): React.JSX.Element {
  const [pages, setPages] = useState(1);
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: pages }, (_, index) => (
        <div key={index}>
          {children(index + 1, index === pages - 1 ? () => setPages(pages + 1) : undefined)}
        </div>
      ))}
    </div>
  );
}

function LoadMore({
  hasMore,
  onClick,
}: {
  hasMore: boolean;
  onClick: (() => void) | undefined;
}): React.JSX.Element | null {
  if (!hasMore || !onClick) return null;
  return (
    <div className="py-3">
      <Button variant="link" onClick={onClick}>
        Load more
      </Button>
    </div>
  );
}

function ByDebate(): React.JSX.Element {
  return (
    <SummaryPages>
      {(page, loadMore) => <DebatePage page={page} loadMore={loadMore} />}
    </SummaryPages>
  );
}

function DebatePage({
  page,
  loadMore,
}: {
  page: number;
  loadMore: (() => void) | undefined;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState<string | null>(null);
  const load = useCallback(() => listAdminBallotDebates(page), [page]);
  const query = useAdminBallotQuery(load, (collection, record, data, action) => {
    if (collection === 'debates') return true;
    if (collection === 'users')
      return (
        data?.items.some(({ debate }) =>
          [...debate.affTeam, ...debate.negTeam, ...debate.judges].some(
            (user) => user.id === record.id,
          ),
        ) === true
      );
    // An update can move a ballot off this page; events only carry the new debate.
    return (
      collection === 'ballots' &&
      (action === 'update' ||
        data?.items.some((row) => row.debate.id === record['debate']) === true)
    );
  });
  return (
    <QueryContent query={query}>
      {(data) => (
        <>
          {page === 1 && data.items.length === 0 && <Empty>No debates yet.</Empty>}
          <div className="flex flex-col gap-3">
            {data.items.map(({ debate, ballotCount }) => {
              const isOpen = expanded === debate.id;
              return (
                <div
                  key={debate.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                >
                  <DebateCard
                    id={`debate-btn-${debate.id}`}
                    debateId={debate.id}
                    debate={debate}
                    badge={`${ballotCount} ballot${ballotCount === 1 ? '' : 's'}`}
                    isExpanded={isOpen}
                    onClick={() => setExpanded(isOpen ? null : debate.id)}
                    ariaControls={`debate-panel-${debate.id}`}
                    className="rounded-none border-0 hover:border-0 hover:shadow-none hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  />
                  {isOpen && (
                    <div
                      id={`debate-panel-${debate.id}`}
                      role="region"
                      aria-labelledby={`debate-btn-${debate.id}`}
                      className="border-t border-slate-100 px-4 py-3 dark:border-slate-700"
                    >
                      <BallotDetails kind="debate" id={debate.id} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <LoadMore hasMore={data.hasMore} onClick={loadMore} />
        </>
      )}
    </QueryContent>
  );
}

function ByStudent(): React.JSX.Element {
  return (
    <SummaryPages>
      {(page, loadMore) => <StudentPage page={page} loadMore={loadMore} />}
    </SummaryPages>
  );
}

function StudentPage({
  page,
  loadMore,
}: {
  page: number;
  loadMore: (() => void) | undefined;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState<string | null>(null);
  const load = useCallback(() => listAdminBallotStudents(page), [page]);
  const query = useAdminBallotQuery(load, (collection) => collection !== 'debates');
  return (
    <QueryContent query={query}>
      {(data) => (
        <>
          {page === 1 && data.items.length === 0 && <Empty>No submitted ballots yet.</Empty>}
          <div className="flex flex-col gap-3">
            {data.items.map(({ student, debateCount }) => {
              const isOpen = expanded === student.id;
              return (
                <div
                  key={student.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                >
                  <button
                    id={`student-btn-${student.id}`}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    onClick={() => setExpanded(isOpen ? null : student.id)}
                    aria-expanded={isOpen}
                    aria-controls={`student-panel-${student.id}`}
                  >
                    <span className="flex items-center gap-3">
                      <Avatar
                        name={student.name ?? student.id}
                        imageURL={student.avatarUrl ?? undefined}
                        size="sm"
                      />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {student.name ? formatSpeakerName(student.name) : student.id}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {debateCount} debate{debateCount === 1 ? '' : 's'}
                      </span>
                    </span>
                    <span className="text-xs text-slate-400" aria-hidden="true">
                      {isOpen ? '▲' : '▼'}
                    </span>
                  </button>
                  {isOpen && (
                    <div
                      id={`student-panel-${student.id}`}
                      role="region"
                      aria-labelledby={`student-btn-${student.id}`}
                      className="border-t border-slate-100 px-4 py-3 dark:border-slate-700"
                    >
                      <BallotDetails kind="student" id={student.id} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <LoadMore hasMore={data.hasMore} onClick={loadMore} />
        </>
      )}
    </QueryContent>
  );
}

function BallotDetails({
  kind,
  id,
}: {
  kind: 'debate' | 'student';
  id: string;
}): React.JSX.Element {
  const [page, setPage] = useState(1);
  return <DetailPage key={page} kind={kind} id={id} page={page} setPage={setPage} />;
}

function DetailPage({
  kind,
  id,
  page,
  setPage,
}: {
  kind: 'debate' | 'student';
  id: string;
  page: number;
  setPage: (page: number) => void;
}): React.JSX.Element {
  const load = useCallback(() => listAdminBallotDetails({ kind, id }, page), [kind, id, page]);
  const query = useAdminBallotQuery(load, (collection, record, data) => {
    const ballots = data?.items ?? [];
    if (collection === 'ballots')
      return (
        kind === 'student' || record['debate'] === id || ballots.some((b) => b.id === record.id)
      );
    if (collection === 'speaker_evals')
      return (
        (kind === 'student' && record['speaker'] === id) ||
        ballots.some((b) => b.id === record['ballot'])
      );
    if (collection === 'debates')
      return kind === 'debate' ? record.id === id : ballots.some((b) => b.debate?.id === record.id);
    return ballots.some(
      (b) => b.judge?.id === record.id || b.speakerEvals.some((ev) => ev.speaker?.id === record.id),
    );
  });
  return (
    <QueryContent query={query}>
      {(data) => (
        <>
          {data.items.length === 0 && <Empty>No submitted ballots yet.</Empty>}
          <div className="flex flex-col gap-5">
            {data.items.map((ballot) =>
              kind === 'debate' ? (
                <BallotSummary key={ballot.id} ballot={ballot} />
              ) : (
                <div key={ballot.id}>
                  <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {ballot.debate?.date ?? 'No debate'} {ballot.debate?.room} · Judge:{' '}
                    {ballot.judge?.name ?? '—'}
                  </p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {ballot.speakerEvals
                      .filter((ev) => ev.speaker?.id === id)
                      .map((ev) => (
                        <StudentEvalCard key={ev.id} ev={ev} event={ballot.debate?.event} />
                      ))}
                  </div>
                </div>
              ),
            )}
          </div>
          <Pagination page={page} hasMore={data.hasMore} setPage={setPage} label="Feedback pages" />
        </>
      )}
    </QueryContent>
  );
}

interface StrandedBallotPayload {
  id: string;
  judgeName: string;
  submittedAt: number;
}

function Stranded(): React.JSX.Element {
  const [page, setPage] = useState(1);
  return <StrandedPage key={page} page={page} setPage={setPage} />;
}

function StrandedPage({
  page,
  setPage,
}: {
  page: number;
  setPage: (page: number) => void;
}): React.JSX.Element {
  const load = useCallback(() => listAdminBallotDetails({ kind: 'stranded' }, page), [page]);
  const query = useAdminBallotQuery(
    load,
    (collection) => collection === 'ballots' || collection === 'users',
  );
  const { pendingDeletes, softDelete, undo } = useUndoDelete<StrandedBallotPayload>(
    (payload) => softDeleteBallot(payload.id),
    (payload) => {
      void restoreBallot(payload.id);
    },
  );
  return (
    <QueryContent query={query}>
      {(data: ResultPage<Ballot>) => (
        <>
          {data.items.length === 0 && pendingDeletes.size === 0 && (
            <Empty>No stranded ballots.</Empty>
          )}
          <div className="flex flex-col gap-3">
            {[...pendingDeletes.values()].map((pending) => (
              <div
                key={pending.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:bg-slate-800"
              >
                <span>Ballot deleted.</span>
                <Button variant="text" onClick={() => undo(pending.id)}>
                  Undo
                </Button>
              </div>
            ))}
            {data.items
              .filter((ballot) => !pendingDeletes.has(ballot.id))
              .map((ballot) => (
                <div
                  key={ballot.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      name={ballot.judge?.name ?? 'Unknown judge'}
                      imageURL={ballot.judge?.avatarUrl ?? undefined}
                      size="sm"
                    />
                    <div className="text-sm text-slate-800 dark:text-slate-100">
                      {ballot.judge?.name ?? 'Unknown judge'}
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Submitted{' '}
                        {ballot.submittedAt
                          ? new Date(ballot.submittedAt).toLocaleDateString()
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    aria-label="Delete ballot"
                    onClick={() =>
                      void softDelete(ballot.id, {
                        id: ballot.id,
                        judgeName: ballot.judge?.name ?? 'Unknown judge',
                        submittedAt: ballot.submittedAt ?? 0,
                      })
                    }
                  >
                    Delete
                  </Button>
                </div>
              ))}
          </div>
          <Pagination
            page={page}
            hasMore={data.hasMore}
            setPage={setPage}
            label="Stranded ballot pages"
          />
        </>
      )}
    </QueryContent>
  );
}

function BallotSummary({ ballot }: { ballot: Ballot }): React.JSX.Element {
  const evals = ballot.speakerEvals;
  const event: DebateEvent = ballot.debate?.event ?? 'tp';
  const seats = positionsForEvent(event);
  const evalsByPos = Object.fromEntries(
    seats.map((pos) => [pos, evals.find((e) => e.position === pos)]),
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
            {seats
              .filter((pos) => pos.startsWith(side))
              .map((pos) => {
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
                            imageURL={ev.speaker.avatarUrl ?? undefined}
                            size="xs"
                          />
                        )}
                        <span>
                          {event === 'ld' ? 'Debater' : positionLabel(event, pos)}
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

function parsePosition(value: string | null | undefined): Position | undefined {
  if (value === 'aff1' || value === 'aff2' || value === 'neg1' || value === 'neg2') {
    return value;
  }
  return undefined;
}

function StudentEvalCard({
  ev,
  event = 'tp',
}: {
  ev: SpeakerEval;
  event?: DebateEvent | undefined;
}): React.JSX.Element {
  const total = scoringTotal(ev);
  const pos = parsePosition(ev.position);

  return (
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2 mb-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {pos ? (event === 'ld' ? 'Debater' : positionLabel(event, pos)) : ev.position}
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
