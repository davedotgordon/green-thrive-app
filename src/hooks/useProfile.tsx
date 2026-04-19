import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Profile {
  id: string;
  display_name: string | null;
  city: string | null;
  zip: string | null;
  family_id: string | null;
}

export function useProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, city, zip, family_id")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load profile", error);
      setProfile(null);
    } else if (!data) {
      // Trigger should have created it, but ensure it exists
      const { data: created } = await supabase
        .from("profiles")
        .insert({ id: user.id })
        .select("id, display_name, city, zip, family_id")
        .single();
      setProfile(created ?? null);
    } else {
      setProfile(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    refetch();
  }, [authLoading, refetch]);

  return { profile, loading: authLoading || loading, refetch, setProfile };
}
