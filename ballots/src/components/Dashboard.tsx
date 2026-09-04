import type { Id } from '../../convex/_generated/dataModel';
import type { Role } from '../types.ts';
import { PageLayout } from './PageLayout.tsx';
import { AdminDashboard } from './dashboard/AdminDashboard.tsx';
import { ParentDashboard } from './dashboard/ParentDashboard.tsx';
import { StudentDashboard } from './dashboard/StudentDashboard.tsx';
import { UpcomingDebates } from './dashboard/UpcomingDebates.tsx';

interface Props {
  userId: Id<'users'>;
  role: Role;
  name: string;
}

export function Dashboard({ userId, role, name }: Props): React.JSX.Element {
  return (
    <PageLayout>
      <h1 className="text-2xl font-bold mb-6">Hello, {name}!</h1>
      <div className="flex flex-col gap-6">
        <UpcomingDebates />
        {role === 'parent' && <ParentDashboard userId={userId} />}
        {role === 'student' && <StudentDashboard userId={userId} />}
        {role === 'admin' && (
          <>
            <AdminDashboard />
            <ParentDashboard userId={userId} />
          </>
        )}
      </div>
    </PageLayout>
  );
}
