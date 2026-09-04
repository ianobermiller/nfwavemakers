import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Role } from '../types.ts';

export interface AppUser {
  _id: Id<'users'>;
  avatarUrl: string | null;
  email?: string;
  name?: string;
  role?: Role;
}

interface AuthContextValue {
  isLoading: boolean;
  queryError: string | undefined;
  user: AppUser | undefined;
}

const loggedOut: AuthContextValue = {
  isLoading: false,
  queryError: undefined,
  user: undefined,
};

const loading: AuthContextValue = {
  ...loggedOut,
  isLoading: true,
};

const AuthContext = createContext<AuthContextValue>(loggedOut);

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

  return (
    <AuthSession
      key={String(isAuthenticated)}
      authLoading={authLoading}
      isAuthenticated={isAuthenticated}
    >
      {children}
    </AuthSession>
  );
}

function AuthSession({
  authLoading,
  children,
  isAuthenticated,
}: {
  authLoading: boolean;
  children: ReactNode;
  isAuthenticated: boolean;
}): React.JSX.Element {
  const ensureCurrentUser = useMutation(api.users.ensureCurrent);
  const [ensureError, setEnsureError] = useState<string>();
  const [userEnsured, setUserEnsured] = useState(false);
  const session = useQuery(api.users.current, isAuthenticated && userEnsured ? {} : 'skip');

  useEffect(() => {
    if (!isAuthenticated || authLoading || userEnsured) return;

    ensureCurrentUser({})
      .then(() => setUserEnsured(true))
      .catch((error: unknown) => {
        setEnsureError(
          error instanceof Error ? error.message : 'Could not initialize your account',
        );
      });
  }, [authLoading, ensureCurrentUser, isAuthenticated, userEnsured]);

  const value = useMemo((): AuthContextValue => {
    if (ensureError) {
      return { ...loggedOut, queryError: ensureError };
    }

    const isAuthSettling = authLoading && !isAuthenticated;
    const isSessionLoading = isAuthenticated && (!userEnsured || session === undefined);
    if (isAuthSettling || isSessionLoading) {
      return loading;
    }

    if (isAuthenticated && session) {
      return { isLoading: false, queryError: undefined, user: session };
    }

    return loggedOut;
  }, [authLoading, ensureError, isAuthenticated, session, userEnsured]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAppUser(): AppUser | undefined {
  return useContext(AuthContext).user;
}

export function useAuthState(): AuthContextValue {
  return useContext(AuthContext);
}
