import { useEffect, useState } from "react";

export interface Profile {
  name: string;
  handle: string;
}

const KEY = "claude_clone_profile";

export function getProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function clearProfile() {
  localStorage.removeItem(KEY);
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setProfile(getProfile());
    setLoaded(true);
  }, []);
  return { profile, setProfile, loaded };
}
