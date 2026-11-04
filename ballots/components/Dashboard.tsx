import type { Role } from '../types.ts';
import { preloadDashboard } from '../hooks/data.ts';
import { PageLayout } from '@/site/PageLayout.tsx';
import { AdminDashboard } from './dashboard/AdminDashboard.tsx';
import { ParentDashboard } from './dashboard/ParentDashboard.tsx';
import { StudentDashboard } from './dashboard/StudentDashboard.tsx';
import { UpcomingDebates } from './dashboard/UpcomingDebates.tsx';

interface Props {
  userId: string;
  role: Role;
}

export function Dashboard({ userId, role }: Props): React.JSX.Element {
  preloadDashboard(role);
  return (
    <PageLayout>
      <div className="flex flex-col gap-6">
        {role !== 'parent' && <UpcomingDebates role={role} />}
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
