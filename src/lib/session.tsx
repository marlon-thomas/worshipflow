import { Session } from '@supabase/supabase-js';
import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';

import { supabase } from './supabase';
import { Team, TeamMember } from './types';

interface SessionState {
  session: Session | null;
  team: Team | null;
  membership: TeamMember | null;
  loading: boolean;
  /** Re-fetch team membership (e.g. after joining/creating a team). */
  refreshMembership: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionState>({
  session: null,
  team: null,
  membership: null,
  loading: true,
  refreshMembership: async () => {},
  signOut: async () => {},
});

export function useSession() {
  return useContext(SessionContext);
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [membership, setMembership] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadMembership(userId: string | undefined) {
    if (!userId) {
      setTeam(null);
      setMembership(null);
      return;
    }
    const { data, error } = await supabase
      .from('team_members')
      .select('*, teams(*)')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (error || !data) {
      setTeam(null);
      setMembership(null);
      return;
    }
    const { teams: joinedTeam, ...member } = data as TeamMember & { teams: Team };
    setMembership(member);
    setTeam(joinedTeam ?? null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadMembership(data.session?.user.id).finally(() => setLoading(false));
    }).catch((err) => {
      console.error('[SessionProvider] getSession failed:', err);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      loadMembership(next?.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider
      value={{
        session,
        team,
        membership,
        loading,
        refreshMembership: () => loadMembership(session?.user.id),
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}>
      {children}
    </SessionContext.Provider>
  );
}
