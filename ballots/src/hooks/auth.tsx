import { api } from '../../convex/_generated/api';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Role } from '../types.ts';

export interface AppUser {
  _id: string;
  avatarUrl: string | null;
  email?: string;
  name?: string;
  role?: Role;
}

type AuthContextValue = {
  isLoading: boolean;
  queryError: string | undefined;
  user: AppUser | undefined;
};

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
  const ensureCurrentUser = useMutation(api.users.ensureCurrent);
  const [ensureError, setEnsureError] = useState<string>();
  const [userEnsured, setUserEnsured] = useState(false);
  const session = useQuery(api.users.current, isAuthenticated && userEnsured ? {} : 'skip');

  const authResolved = useRef(false);
  if (!authLoading) authResolved.current = true;

  useEffect(() => {
    if (!isAuthenticated) {
      setEnsureError(undefined);
      setUserEnsured(false);
      return;
    }
    if (authLoading || userEnsured) return;

    ensureCurrentUser({})
      .then(() => setUserEnsured(true))
      .catch((error: unknown) => {
        setEnsureError(
          error instanceof Error ? error.message : 'Could not initialize your account',
        );
      });
  }, [authLoading, ensureCurrentUser, isAuthenticated, userEnsured]);

  let value: AuthContextValue = loggedOut;
  if (ensureError) {
    value = { ...loggedOut, queryError: ensureError };
  } else if (
    (authLoading && !authResolved.current) ||
    (isAuthenticated && (!userEnsured || session === undefined))
  ) {
    value = loading;
  } else if (isAuthenticated && session) {
    value = { isLoading: false, queryError: undefined, user: session };
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAppUser(): AppUser | undefined {
  return useContext(AuthContext).user;
}

export function useAuthState(): AuthContextValue {
  return useContext(AuthContext);
}
