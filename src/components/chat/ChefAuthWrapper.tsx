import { useConvex } from 'convex/react';
import { createContext, useContext, useEffect, useState } from 'react';
import { sessionIdStore } from '~/lib/stores/sessionId';
import type { Id } from '@convex/_generated/dataModel';
import { api } from '@convex/_generated/api';
import { setChefDebugProperty } from 'chef-agent/utils/chefDebug';
type ChefAuthState =
  | {
      kind: 'loading';
    }
  | {
      kind: 'unauthenticated';
    }
  | {
      kind: 'fullyLoggedIn';
      sessionId: Id<'sessions'>;
    };

const ChefAuthContext = createContext<{
  state: ChefAuthState;
}>(null as unknown as { state: ChefAuthState });

export function useChefAuth() {
  const state = useContext(ChefAuthContext);
  if (state === null) {
    throw new Error('useChefAuth must be used within a ChefAuthProvider');
  }
  return state.state;
}

export function useChefAuthContext() {
  const state = useContext(ChefAuthContext);
  if (state === null) {
    throw new Error('useChefAuth must be used within a ChefAuthProvider');
  }
  return state;
}

export const SESSION_ID_KEY = 'sessionIdForConvex';

export const ChefAuthProvider = ({
  children,
  redirectIfUnauthenticated,
}: {
  children: React.ReactNode;
  redirectIfUnauthenticated: boolean;
}) => {
  const convex = useConvex();
  const [sessionId, setSessionId] = useState<Id<'sessions'> | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    async function initSession() {
      // Get session from localStorage
      const storedSessionId = localStorage.getItem(SESSION_ID_KEY) as Id<'sessions'> | null;

      if (storedSessionId) {
        // Verify existing session
        try {
          const isValid = await convex.query(api.sessions.verifySession, {
            sessionId: storedSessionId,
          });

          if (isValid && mounted) {
            sessionIdStore.set(storedSessionId);
            setChefDebugProperty('sessionId', storedSessionId);
            setSessionId(storedSessionId);
            return;
          }
        } catch (error) {
          console.error('Error verifying session', error);
        }
      }

      // Create new session
      try {
        const newSessionId = await convex.mutation(api.sessions.startSession);
        if (mounted) {
          localStorage.setItem(SESSION_ID_KEY, newSessionId);
          sessionIdStore.set(newSessionId);
          setChefDebugProperty('sessionId', newSessionId);
          setSessionId(newSessionId);
        }
      } catch (error) {
        console.error('Error creating session', error);
        if (mounted) {
          setSessionId(null);
        }
      }
    }

    initSession();

    return () => {
      mounted = false;
    };
  }, [convex]);

  const state: ChefAuthState = sessionId === undefined
    ? { kind: 'loading' }
    : sessionId === null
      ? { kind: 'unauthenticated' }
      : { kind: 'fullyLoggedIn', sessionId };

  return <ChefAuthContext.Provider value={{ state }}>{children}</ChefAuthContext.Provider>;
};
