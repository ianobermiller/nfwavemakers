import { useEffect } from 'react';
import { usePathRoute, navigate } from './hooks/useHashRoute.ts';
import { AuthProvider, useAppUser, useAuthState } from '../ballots/hooks/auth.tsx';
import { Auth } from '../ballots/components/Auth.tsx';
import { PendingAccess } from '../ballots/components/PendingAccess.tsx';
import { ProfileSetup } from '../ballots/components/ProfileSetup.tsx';
import { Dashboard } from '../ballots/components/Dashboard.tsx';
import { BallotForm } from '../ballots/components/BallotForm.tsx';
import { BallotView } from '../ballots/components/BallotView.tsx';
import { DebateView } from '../ballots/components/DebateView.tsx';
import { AdminDebates } from '../ballots/components/AdminDebates.tsx';
import { AdminDebateForm } from '../ballots/components/AdminDebateForm.tsx';
import { AdminBallots } from '../ballots/components/AdminBallots.tsx';
import { AdminLessons } from '../ballots/components/AdminLessons.tsx';
import { AdminLessonForm } from '../ballots/components/AdminLessonForm.tsx';
import { AdminUsers } from '../ballots/components/AdminUsers.tsx';
import { ProfileEdit } from '../ballots/components/ProfileEdit.tsx';
import { isFullMember } from '../ballots/data/api.ts';
import type { User } from '../ballots/data/model.ts';
import { SiteLayout } from './site/SiteLayout.tsx';
import { HomePage } from './site/HomePage.tsx';
import { AboutPage } from './site/AboutPage.tsx';
import { JoinPage } from './site/JoinPage.tsx';
import { LessonsIndex } from './site/LessonsIndex.tsx';
import { SchedulePage } from './site/SchedulePage.tsx';
import { LessonPage } from './site/LessonPage.tsx';
import type { Role } from '../ballots/types.ts';

interface RouteCtx {
  param: string;
  userId: string;
  role: Role;
  name: string;
}

const BALLOT_ROUTES: {
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
      param ? <AdminDebateForm debateId={param === 'new' ? undefined : param} /> : <AdminDebates />,
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
    segment: 'admin-lessons',
    requiredRole: 'admin',
    render: ({ param }) =>
      param ? <AdminLessonForm lessonId={param === 'new' ? undefined : param} /> : <AdminLessons />,
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
  {
    segment: 'dashboard',
    render: ({ userId, role, name }) => <Dashboard userId={userId} role={role} name={name} />,
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
  const path = usePathRoute();
  const { isLoading, queryError } = useAuthState();
  const user = useAppUser();
  const [segment, ...rest] = path.split('/');
  const param = rest.join('/');

  if (!segment) return <HomePage />;
  if (segment === 'about') return <AboutPage />;
  if (segment === 'schedule') return <SchedulePage />;
  if (segment === 'join') return <JoinPage />;

  const isLessonsRoute = segment === 'lessons';
  const isMemberEntry = segment === 'ballots' || segment === 'sign-in';
  const isBallotRoute = isMemberEntry || BALLOT_ROUTES.some((route) => route.segment === segment);
  if (!isLessonsRoute && !isBallotRoute) return <HomePage />;

  if (isLoading) {
    return (
      <SiteLayout current={isLessonsRoute ? 'lessons' : 'ballots'}>
        <StatusCard>Loading…</StatusCard>
      </SiteLayout>
    );
  }

  if (queryError) {
    return (
      <SiteLayout current={isLessonsRoute ? 'lessons' : 'ballots'}>
        <div className="flex items-start justify-center px-4 py-8 sm:px-6 sm:py-16">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg sm:p-8 dark:bg-slate-800">
            <p className="text-sm text-red-600">Auth error: {queryError}</p>
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (isLessonsRoute) {
    if (!user) {
      return (
        <SiteLayout current="lessons">
          <Auth purpose="lessons" />
        </SiteLayout>
      );
    }
    if (!param) return <LessonsIndex />;
    const [year = '', number = ''] = param.split('/');
    return <LessonPage year={year} number={number} />;
  }

  if (isMemberEntry) {
    if (user) {
      const gate = memberGate(user);
      if (gate) return <BallotsFrame>{gate}</BallotsFrame>;
      if (segment === 'sign-in') return <Redirect to="ballots" />;
      return <Dashboard userId={user.id} role={user.role!} name={user.name!} />;
    }
    return (
      <BallotsFrame>
        <Auth />
      </BallotsFrame>
    );
  }

  if (!user) return <Redirect to="ballots" />;

  return <AuthenticatedApp userId={user.id} path={path} />;
}

/** Profile setup first, then email verification + Approval, then full ballots. */
function memberGate(user: User): React.JSX.Element | null {
  if (!user.name || !user.role) return <ProfileSetup />;
  if (!isFullMember(user)) return <PendingAccess user={user} />;
  return null;
}

function BallotsFrame({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <SiteLayout current="ballots">{children}</SiteLayout>;
}

function StatusCard({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex items-start justify-center px-4 py-8 sm:px-6 sm:py-16">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg sm:p-8 dark:bg-slate-800">
        <p className="text-slate-500 dark:text-slate-400">{children}</p>
      </div>
    </div>
  );
}

function Redirect({ to }: { to: string }): React.JSX.Element {
  useEffect(() => {
    navigate(to);
  }, [to]);
  return (
    <BallotsFrame>
      <StatusCard>Redirecting…</StatusCard>
    </BallotsFrame>
  );
}

function AuthenticatedApp({ userId, path }: { userId: string; path: string }): React.JSX.Element {
  const user = useAppUser();

  if (!user) {
    return (
      <BallotsFrame>
        <StatusCard>Loading profile…</StatusCard>
      </BallotsFrame>
    );
  }

  const gate = memberGate(user);
  if (gate) {
    return <BallotsFrame>{gate}</BallotsFrame>;
  }

  const name = user.name!;
  const role = user.role!;

  const [segment, param = ''] = path.split('/');

  for (const route of BALLOT_ROUTES) {
    if (route.segment !== segment) continue;
    if (route.requiredRole && role !== route.requiredRole) continue;
    if (route.requiresParam && !param) continue;
    return route.render({ param, userId, role, name });
  }

  return <Dashboard userId={userId} role={role} name={name} />;
}
