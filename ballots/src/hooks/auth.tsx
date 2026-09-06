import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { clearCurrentUser, loadCurrentUser } from '../data/api.ts';
import type { User } from '../data/model.ts';
import { collections, errorMessage, pb } from '../data/pocketbase.ts';

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

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [state, setState] = useState<AuthContextValue>(() =>
    pb.authStore.isValid ? { ...loggedOut, isLoading: true } : loggedOut,
  );

  useEffect(() => {
    const loadProfile = async (): Promise<void> => {
      if (!pb.authStore.isValid) {
        clearCurrentUser();
        setState(loggedOut);
        return;
      }
      try {
        const user = await loadCurrentUser();
        setState({ isLoading: false, queryError: undefined, user });
      } catch (error: unknown) {
        setState({
          isLoading: false,
          queryError: errorMessage(error, 'Could not load your ballots profile'),
          user: undefined,
        });
      }
    };

    const unsubscribe = pb.authStore.onChange(() => void loadProfile(), true);
    const handleProfileChanged = (): void => void loadProfile();
    window.addEventListener('ballots-profile-changed', handleProfileChanged);
    if (pb.authStore.isValid) {
      void pb
        .collection(collections.authUsers)
        .authRefresh()
        .catch((error: unknown) => {
          pb.authStore.clear();
          setState({
            isLoading: false,
            queryError: errorMessage(error, 'Could not restore your session'),
            user: undefined,
          });
        });
    }

    return () => {
      unsubscribe();
      window.removeEventListener('ballots-profile-changed', handleProfileChanged);
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
