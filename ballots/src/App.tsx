import { db } from './db.ts';
import { useHashRoute } from './hooks/useHashRoute.ts';
import { Auth } from './components/Auth.tsx';
import { ProfileSetup } from './components/ProfileSetup.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { BallotForm } from './components/BallotForm.tsx';
import { BallotView } from './components/BallotView.tsx';
import { DebateView } from './components/DebateView.tsx';
import { AdminDebates } from './components/AdminDebates.tsx';
import { AdminDebateForm } from './components/AdminDebateForm.tsx';
import { AdminBallots } from './components/AdminBallots.tsx';
import { ProfileEdit } from './components/ProfileEdit.tsx';
import type { Role } from './types.ts';

interface RouteCtx {
  param: string;
  userId: string;
  role: Role;
  name: string;
}

const ROUTES: Array<{
  segment: string;
  requiredRole?: Role;
  requiresParam?: boolean;
  render: (ctx: RouteCtx) => React.JSX.Element;
}> = [
  {
    segment: 'profile',
    render: ({ userId, name, role }) => (
      <ProfileEdit userId={userId} currentName={name} currentRole={role} />
    ),
  },
  {
    segment: 'admin',
    requiredRole: 'admin',
    render: ({ param }) =>
      param ? <AdminDebateForm debateId={param === 'new' ? undefined : param} /> : <AdminDebates />,
  },
  {
    segment: 'admin-ballots',
    requiredRole: 'admin',
    render: () => <AdminBallots />,
  },
  {
    segment: 'judge',
    render: ({ param, userId, name }) => (
      <BallotForm {...(param ? { debateId: param } : {})} judgeId={userId} judgeName={name} />
    ),
  },
  {
    segment: 'ballot',
    requiresParam: true,
    render: ({ param, userId }) => <BallotView ballotId={param} currentUserId={userId} />,
  },
  {
    segment: 'debate',
    requiresParam: true,
    render: ({ param, userId }) => <DebateView debateId={param} currentUserId={userId} />,
  },
];

export function App(): React.JSX.Element {
  const { isLoading, user, error } = db.useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-start justify-center p-6 pt-16 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8">
          <p className="text-slate-500 dark:text-slate-400">Loading…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-start justify-center p-6 pt-16 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8">
          <p className="text-red-600 text-sm">Auth error: {error.message}</p>
        </div>
      </div>
    );
  }

  if (!user) return <Auth />;

  return <AuthenticatedApp userId={user.id} />;
}

function AuthenticatedApp({ userId }: { userId: string }): React.JSX.Element {
  const hash = useHashRoute();

  const { data, isLoading } = db.useQuery({
    $users: { $: { where: { id: userId } } },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-start justify-center p-6 pt-16 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8">
          <p className="text-slate-500 dark:text-slate-400">Loading profile…</p>
        </div>
      </div>
    );
  }

  const userRecord = data?.$users?.[0];
  const name = userRecord?.name;
  const role = userRecord?.role as Role | undefined;

  if (!name || !role) {
    return <ProfileSetup userId={userId} />;
  }

  const [segment, param = ''] = hash.split('/');

  for (const route of ROUTES) {
    if (route.segment !== segment) continue;
    if (route.requiredRole && role !== route.requiredRole) continue;
    if (route.requiresParam && !param) continue;
    return route.render({ param, userId, role, name });
  }

  return <Dashboard userId={userId} role={role} name={name} />;
}
