import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { clearCurrentUser, loadCurrentUser } from '../data/api.ts';
import { refreshSession } from '../data/auth.ts';
import type { User } from '../data/model.ts';
import { clearLiveCache } from '../lib/liveQuery.ts';
import { errorMessage, pb } from '../data/pocketbase.ts';

interface AuthContextValue {
  isLoading: boolean;
  queryError: string | undefined;
  user: User | undefined;
}

const loggedOut: AuthContextValue = {
  isLoading: false,
  queryError: undefined,
  user: undefined,
};

const AuthContext = createContext<AuthContextValue>(loggedOut);

function clearLocalAuthState(): void {
  clearCurrentUser();
  clearLiveCache();
}

function loginIsValid(): boolean {
  return pb.authStore.isValid;
}

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [state, setState] = useState<AuthContextValue>(() =>
    loginIsValid() ? { ...loggedOut, isLoading: true } : loggedOut,
  );

  useEffect(() => {
    let profileRequest = 0;

    const applyLoggedOut = (): void => {
      clearLocalAuthState();
      setState(loggedOut);
      // An expired JWT still sits in the store until we clear it; that fires
      // onChange again and lands on the same logged-out path with no token.
      if (pb.authStore.token) pb.authStore.clear();
    };

    const loadProfile = async (): Promise<void> => {
      if (!loginIsValid()) {
        applyLoggedOut();
        return;
      }
      const requestId = ++profileRequest;
      try {
        const user = await loadCurrentUser();
        if (requestId !== profileRequest) return;
        // Another tab may have cleared the login while this request was in flight.
        if (!loginIsValid()) {
          applyLoggedOut();
          return;
        }
        setState({ isLoading: false, queryError: undefined, user });
      } catch (error: unknown) {
        if (requestId !== profileRequest) return;
        if (!loginIsValid()) {
          applyLoggedOut();
          return;
        }
        setState({
          isLoading: false,
          queryError: errorMessage(error, 'Could not load your ballots profile'),
          user: undefined,
        });
      }
    };

    const unsubscribe = pb.authStore.onChange(() => void loadProfile(), true);
    const handleProfileChanged = (): void => void loadProfile();
    const handleVisible = (): void => {
      if (document.visibilityState !== 'visible') return;
      if (!loginIsValid()) {
        applyLoggedOut();
        return;
      }
      void refreshSession().then((result) => {
        if (result === 'invalid') applyLoggedOut();
      });
    };

    window.addEventListener('ballots-profile-changed', handleProfileChanged);
    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('focus', handleVisible);
    if (loginIsValid()) {
      void refreshSession();
    }

    return () => {
      unsubscribe();
      window.removeEventListener('ballots-profile-changed', handleProfileChanged);
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('focus', handleVisible);
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAppUser(): User | undefined {
  return useContext(AuthContext).user;
}

export function useAuthState(): AuthContextValue {
  return useContext(AuthContext);
}
