import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ClaudeLogo } from "@/components/claude-logo";
import { getProfile, saveProfile } from "@/lib/profile";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Claude" },
      { name: "description", content: "Your AI assistant for thoughtful conversations." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getProfile()) navigate({ to: "/chat" });
  }, [navigate]);

  const sanitize = (v: string) => v.toLowerCase().replace(/[^a-z0-9_.]/g, "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    const h = sanitize(handle);
    if (n.length < 1) return setError("Please enter your name");
    if (h.length < 3) return setError("Handle must be at least 3 characters");
    saveProfile({ name: n, handle: h });
    navigate({ to: "/chat" });
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return "Still up";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        <div className="mb-10 flex flex-col items-center text-center">
          <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <ClaudeLogo className="h-8 w-8" />
          </span>
          <h1 className="font-serif text-3xl tracking-tight text-foreground">
            {greeting}.
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Tell us who you are to get started.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
              Your name
            </label>
            <input
              id="name"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="Ada Lovelace"
              className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-[15px] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div>
            <label htmlFor="handle" className="mb-1.5 block text-sm font-medium text-foreground">
              Username
            </label>
            <div className="flex items-center rounded-lg border border-input bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
              <span className="pl-3.5 text-muted-foreground">@</span>
              <input
                id="handle"
                value={handle}
                onChange={(e) => {
                  setHandle(sanitize(e.target.value));
                  setError(null);
                }}
                placeholder="ada"
                autoComplete="off"
                className="w-full bg-transparent px-2 py-2.5 text-[15px] outline-none"
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Lowercase letters, numbers, dots and underscores. No spaces.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-primary py-2.5 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Continue
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Stored only on this device.
        </p>
      </div>
    </main>
  );
}
