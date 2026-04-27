import { useEffect, useState } from "react";

export type SessionUser = { id: string; email: string; tenantId: string };

export function useSession(): {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (res.ok) {
        const json = (await res.json()) as { user: SessionUser };
        setUser(json.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return { user, loading, refresh };
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
}
