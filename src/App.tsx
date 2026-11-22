import { lazy, useEffect } from 'react';
import { usePathRoute, redirect } from './hooks/useHashRoute.ts';
import { RouteReady } from './RouteReady.tsx';
import { RouteSkeleton } from './RouteSkeleton.tsx';
import { AuthProvider, useAppUser, useAuthState } from '../ballots/hooks/auth.tsx';
import { isFullMember } from '../ballots/data/api.ts';
import type { User } from '../ballots/data/model.ts';
import { FieldError } from '../ballots/components/ui/FieldError.tsx';
import { Muted } from '../ballots/components/ui/Muted.tsx';
import { SiteLayout } from './site/SiteLayout.tsx';
import { HomePage } from './site/HomePage.tsx';
import type { Role } from '../ballots/types.ts';
import { loadRoute } from './lazyRoute.ts';

const Auth = lazy(() =>
  loadRoute(import('../ballots/components/Auth.tsx').then((m) => ({ default: m.Auth }))),
);
const PendingAccess = lazy(() =>
  loadRoute(
    import('../ballots/components/PendingAccess.tsx').then((m) => ({ default: m.PendingAccess })),
  ),
);
const ProfileSetup = lazy(() =>
  loadRoute(
    import('../ballots/components/ProfileSetup.tsx').then((m) => ({ default: m.ProfileSetup })),
  ),
);
const Dashboard = lazy(() =>
  loadRoute(import('../ballots/components/Dashboard.tsx').then((m) => ({ default: m.Dashboard }))),
);
const BallotForm = lazy(() =>
  loadRoute(
    import('../ballots/components/BallotForm.tsx').then((m) => ({ default: m.BallotForm })),
  ),
);
const BallotView = lazy(() =>
  loadRoute(
    import('../ballots/components/BallotView.tsx').then((m) => ({ default: m.BallotView })),
  ),
);
const DebateView = lazy(() =>
  loadRoute(
    import('../ballots/components/DebateView.tsx').then((m) => ({ default: m.DebateView })),
  ),
);
const AdminDebates = lazy(() =>
  loadRoute(
    import('../ballots/components/AdminDebates.tsx').then((m) => ({ default: m.AdminDebates })),
  ),
);
const AdminDebateForm = lazy(() =>
  loadRoute(
    import('../ballots/components/AdminDebateForm.tsx').then((m) => ({
      default: m.AdminDebateForm,
    })),
  ),
);
const AdminBallots = lazy(() =>
  loadRoute(
    import('../ballots/components/AdminBallots.tsx').then((m) => ({ default: m.AdminBallots })),
  ),
);
const AdminLessonForm = lazy(() =>
  loadRoute(
    import('../ballots/components/AdminLessonForm.tsx').then((m) => ({
      default: m.AdminLessonForm,
    })),
  ),
);
const AdminUsers = lazy(() =>
  loadRoute(
    import('../ballots/components/AdminUsers.tsx').then((m) => ({ default: m.AdminUsers })),
  ),
);
const ProfileEdit = lazy(() =>
  loadRoute(
    import('../ballots/components/ProfileEdit.tsx').then((m) => ({ default: m.ProfileEdit })),
  ),
);
const AboutPage = lazy(() =>
  loadRoute(import('./site/AboutPage.tsx').then((m) => ({ default: m.AboutPage }))),
);
const JoinPage = lazy(() =>
  loadRoute(import('./site/JoinPage.tsx').then((m) => ({ default: m.JoinPage }))),
);
const LessonsIndex = lazy(() =>
  loadRoute(import('./site/LessonsIndex.tsx').then((m) => ({ default: m.LessonsIndex }))),
);
const SchedulePage = lazy(() =>
  loadRoute(import('./site/SchedulePage.tsx').then((m) => ({ default: m.SchedulePage }))),
);
const LessonPage = lazy(() =>
  loadRoute(import('./site/LessonPage.tsx').then((m) => ({ default: m.LessonPage }))),
);

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
    render: () => <Redirect to="lessons" />,
  },
  {
    segment: 'judge',
    requiresParam: true,
    render: ({ param, userId, name }) => (
      <BallotForm debateId={param} judgeId={userId} judgeName={name} />
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
    render: ({ userId, role }) => <Dashboard userId={userId} role={role} />,
  },
];

export function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <RoutedApp />
    </AuthProvider>
  );
}

function RoutedApp(): React.JSX.Element {
  const { path, isPending } = usePathRoute();
  return (
    <RouteReady path={path} pending={isPending}>
      <AppShell path={path} />
    </RouteReady>
  );
}

function AppShell({ path }: { path: string }): React.JSX.Element {
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
        <RouteSkeleton path={path} />
      </SiteLayout>
    );
  }

  if (queryError) {
    return (
      <SiteLayout current={isLessonsRoute ? 'lessons' : 'ballots'}>
        <div className="flex items-start justify-center px-4 py-8 sm:px-6 sm:py-16">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg sm:p-8 dark:bg-slate-800">
            <FieldError>Auth error: {queryError}</FieldError>
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
    const gate = memberGate(user);
    if (gate) {
      return <SiteLayout current="lessons">{gate}</SiteLayout>;
    }
    if (!param) return <LessonsIndex />;

    const isAdmin = user.role === 'admin';
    if (param === 'new') {
      if (!isAdmin) return <Redirect to="lessons" />;
      return <AdminLessonForm />;
    }
    if (param.startsWith('edit/')) {
      if (!isAdmin) return <Redirect to="lessons" />;
      const lessonId = param.slice('edit/'.length);
      if (!lessonId) return <Redirect to="lessons" />;
      return <AdminLessonForm lessonId={lessonId} />;
    }

    const [year = '', number = ''] = param.split('/');
    return <LessonPage year={year} number={number} />;
  }

  if (isMemberEntry) {
    if (user) {
      const gate = memberGate(user);
      if (gate) return <BallotsFrame>{gate}</BallotsFrame>;
      if (segment === 'sign-in') return <Redirect to="ballots" />;
      return <Dashboard userId={user.id} role={user.role!} />;
    }
    return (
      <BallotsFrame>
        <Auth />
      </BallotsFrame>
    );
  }

  if (!user) {
    return (
      <BallotsFrame>
        <Auth />
      </BallotsFrame>
    );
  }

  return <AuthenticatedApp userId={user.id} path={path} />;
}

function needsProfileSetup(user: User): boolean {
  if (!user.name || !user.role) return true;
  // Students must pick Speech / TP / LD before leaving setup.
  return user.role === 'student' && !user.category;
}

/** Profile setup first, then email verification + Approval, then lessons and ballots. */
function memberGate(user: User): React.JSX.Element | null {
  if (needsProfileSetup(user)) return <ProfileSetup />;
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
        <Muted>{children}</Muted>
      </div>
    </div>
  );
}

function Redirect({ to }: { to: string }): React.JSX.Element {
  useEffect(() => {
    redirect(to);
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
        <RouteSkeleton path={path} />
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

  return <Dashboard userId={userId} role={role} />;
}
