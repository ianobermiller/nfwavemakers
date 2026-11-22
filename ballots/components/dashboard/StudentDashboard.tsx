import { useStudentFeedback } from '../../hooks/useDashboardHistory.ts';
import { HistoryControls } from './HistoryControls.tsx';
import { navigate } from '@/hooks/useHashRoute.ts';
import { compareByLastName } from '../../utils/format.ts';
import { Card } from '../ui/Card.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { Heading } from '../ui/Heading.tsx';
import { Muted } from '../ui/Muted.tsx';

export function StudentDashboard({ userId: _userId }: { userId: string }): React.JSX.Element {
  const history = useStudentFeedback();
  const groups = history.state.status === 'ready' ? history.state.data.items : [];

  return (
    <div>
      <Heading>My Feedback</Heading>
      {history.state.status === 'ready' && groups.length === 0 && (
        <EmptyState>No submitted ballots yet.</EmptyState>
      )}
      <div className="flex flex-col gap-3">
        {groups.map((group) => {
          const displayDate = group.date || new Date(group.submittedAt).toLocaleDateString();
          const viewRoute = group.debateId
            ? `debate/${group.debateId}`
            : `ballot/${group.ballotId}`;
          const judgeNames = [...group.judgeNames].sort((a, b) =>
            compareByLastName({ name: a }, { name: b }),
          );
          return (
            <Card
              key={group.id}
              id={`feedback-${group.id}`}
              as="button"
              interactive
              padding="sm"
              className="flex w-full flex-col gap-1"
              onClick={() => navigate(viewRoute)}
            >
              <strong className="text-sm text-slate-800 dark:text-slate-100">
                {displayDate}
                {group.room && (
                  <Muted as="span" className="ml-2 font-normal">
                    · {group.room}
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
      <HistoryControls query={history} />
    </div>
  );
}
