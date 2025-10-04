import { useEffect } from 'react';
import { setExtra, setUser } from '@sentry/remix';
import { useConvex, useQuery } from 'convex/react';
import { useConvexSessionIdOrNullOrLoading, getConvexAuthToken } from '~/lib/stores/sessionId';
import { useChatId } from '~/lib/stores/chatId';
import { setProfile } from '~/lib/stores/profile';
import { getConvexProfile } from '~/lib/convexProfile';
import { useLDClient, withLDProvider, basicLogger } from 'launchdarkly-react-client-sdk';
import { api } from '@convex/_generated/api';

export const UserProvider = withLDProvider<any>({
  clientSideID: import.meta.env.VITE_LD_CLIENT_SIDE_ID,
  options: {
    logger: basicLogger({ level: 'error' }),
  },
})(UserProviderInner);

function UserProviderInner({ children }: { children: React.ReactNode }) {
  const launchdarkly = useLDClient();
  const convexMemberId = useQuery(api.sessions.convexMemberId);
  const sessionId = useConvexSessionIdOrNullOrLoading();
  const chatId = useChatId();
  const convex = useConvex();

  useEffect(() => {
    if (sessionId) {
      setExtra('sessionId', sessionId);
    }
  }, [sessionId]);

  useEffect(() => {
    setExtra('chatId', chatId);
  }, [chatId]);

  useEffect(() => {
    async function updateProfile() {
      if (convexMemberId) {
        launchdarkly?.identify({
          key: convexMemberId,
        });

        // Get profile info from Convex
        try {
          const token = getConvexAuthToken(convex);
          if (token) {
            void convex.action(api.sessions.updateCachedProfile, { convexAuthToken: token });
            const convexProfile = await getConvexProfile(token);
            setProfile({
              username: convexProfile.name ?? 'User',
              email: convexProfile.email ?? '',
              avatar: '',
              id: convexProfile.id ?? convexMemberId,
            });
            setUser({
              id: convexProfile.id ?? convexMemberId,
              username: convexProfile.name ?? 'User',
              email: convexProfile.email,
            });
          }
        } catch (error) {
          console.error('Failed to fetch Convex profile:', error);
          // Fallback profile
          setProfile({
            username: 'User',
            email: '',
            avatar: '',
            id: convexMemberId,
          });
        }
      } else {
        launchdarkly?.identify({
          anonymous: true,
        });
      }
    }
    void updateProfile();
  }, [launchdarkly, convex, convexMemberId]);

  return children;
}
