import type { Role } from '../types.ts';
import { AppBar } from './AppBar.tsx';
import { AdminDashboard } from './dashboard/AdminDashboard.tsx';
import { ParentDashboard } from './dashboard/ParentDashboard.tsx';
import { StudentDashboard } from './dashboard/StudentDashboard.tsx';
import { UpcomingDebates } from './dashboard/UpcomingDebates.tsx';

interface Props {
  userId: string;
  role: Role;
  name: string;
}

export function Dashboard({ userId, role, name }: Props): React.JSX.Element {
  return (
    <div className="flex flex-col min-h-screen">
      <AppBar />

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 pb-20">
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
      </div>
    </div>
  );
}
