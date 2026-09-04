import { useHashRoute } from './hooks/useHashRoute.ts';
import { AuthProvider, useAppUser, useAuthState } from './hooks/auth.tsx';
import { convexId } from './lib/convexId.ts';
import { Auth } from './components/Auth.tsx';
import { ProfileSetup } from './components/ProfileSetup.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { BallotForm } from './components/BallotForm.tsx';
import { BallotView } from './components/BallotView.tsx';
import { DebateView } from './components/DebateView.tsx';
import { AdminDebates } from './components/AdminDebates.tsx';
import { AdminDebateForm } from './components/AdminDebateForm.tsx';
import { AdminBallots } from './components/AdminBallots.tsx';
import { AdminUsers } from './components/AdminUsers.tsx';
import { ProfileEdit } from './components/ProfileEdit.tsx';
import type { Role } from './types.ts';
import type { Id } from '../convex/_generated/dataModel';

interface RouteCtx {
  param: string;
  userId: Id<'users'>;
  role: Role;
  name: string;
}

const ROUTES: {
  segment: string;
  requiredRole?: Role;
  requiresParam?: boolean;
  render: (ctx: RouteCtx) => React.JSX.Element;
}[] = [
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
      param ? (
        <AdminDebateForm debateId={param === 'new' ? undefined : convexId<'debates'>(param)} />
      ) : (
        <AdminDebates />
      ),
  },
  {
    segment: 'admin-ballots',
    requiredRole: 'admin',
    render: () => <AdminBallots />,
  },
  {
    segment: 'admin-users',
    requiredRole: 'admin',
    render: () => <AdminUsers />,
  },
  {
    segment: 'judge',
    render: ({ param, userId, name }) => (
      <BallotForm
        {...(param ? { debateId: convexId<'debates'>(param) } : {})}
        judgeId={userId}
        judgeName={name}
      />
    ),
  },
  {
    segment: 'ballot',
    requiresParam: true,
    render: ({ param, userId }) => (
      <BallotView ballotId={convexId<'ballots'>(param)} currentUserId={userId} />
    ),
  },
  {
    segment: 'debate',
    requiresParam: true,
    render: ({ param, userId }) => (
      <DebateView debateId={convexId<'debates'>(param)} currentUserId={userId} />
    ),
  },
];

export function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

function AppShell(): React.JSX.Element {
  const { isLoading, queryError } = useAuthState();
  const user = useAppUser();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-start justify-center p-6 pt-16 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8">
          <p className="text-slate-500 dark:text-slate-400">Loading…</p>
        </div>
      </div>
    );
  }

  if (queryError) {
    return (
      <div className="min-h-screen flex items-start justify-center p-6 pt-16 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8">
          <p className="text-red-600 text-sm">Auth error: {queryError}</p>
        </div>
      </div>
    );
  }

  if (!user) return <Auth />;

  return <AuthenticatedApp userId={user._id} />;
}

function AuthenticatedApp({ userId }: { userId: Id<'users'> }): React.JSX.Element {
  const hash = useHashRoute();
  const user = useAppUser();

  if (!user) {
    return (
      <div className="min-h-screen flex items-start justify-center p-6 pt-16 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8">
          <p className="text-slate-500 dark:text-slate-400">Loading profile…</p>
        </div>
      </div>
    );
  }

  const name = user.name;
  const role = user.role;

  if (!name || !role) {
    return <ProfileSetup />;
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
