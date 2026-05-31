import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChatSidebar } from "@/components/chat-sidebar";
import { Composer } from "@/components/composer";
import { useProfile } from "@/lib/profile";
import { ClaudeLogo } from "@/components/claude-logo";
import { Lightbulb, GraduationCap, Code2, PenLine, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat — Claude" },
      { name: "description", content: "Chat with Claude, your AI assistant." },
    ],
  }),
  component: ChatPage,
});

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  { icon: PenLine, label: "Write", prompt: "Help me write a short story about…" },
  { icon: Code2, label: "Code", prompt: "Explain this code snippet:" },
  { icon: GraduationCap, label: "Learn", prompt: "Teach me about quantum entanglement" },
  { icon: Lightbulb, label: "Brainstorm", prompt: "Brainstorm ideas for a weekend project" },
];

function ChatPage() {
  const { profile, loaded } = useProfile();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [recents, setRecents] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    if (loaded && !profile) navigate({ to: "/" });
  }, [loaded, profile, navigate]);

  const send = (text: string) => {
    const id = crypto.randomUUID();
    const user: Message = { id, role: "user", content: text };
    const reply: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "This is a frontend-only demo. Hook up your own backend to make me actually respond — but the interface looks pretty nice, doesn't it?",
    };
    setMessages((m) => [...m, user, reply]);
    if (messages.length === 0) {
      setRecents((r) => [{ id, title: text.slice(0, 40) }, ...r].slice(0, 12));
    }
  };

  const newChat = () => setMessages([]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return "Still up";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  if (!loaded || !profile) return null;

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <ChatSidebar profile={profile} recents={recents} onNewChat={newChat} />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center justify-between border-b border-border/60 px-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Claude Sonnet 4.5</span>
            <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Free
            </span>
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-foreground hover:bg-accent">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Upgrade
          </button>
        </header>

        {isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4">
            <div className="w-full max-w-2xl">
              <div className="mb-8 flex flex-col items-center text-center">
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <ClaudeLogo className="h-7 w-7" />
                </span>
                <h1 className="font-serif text-4xl tracking-tight">
                  <span className="text-primary">✻</span> {greeting}, {profile.name.split(" ")[0]}
                </h1>
              </div>

              <Composer autoFocus onSubmit={send} />

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => send(s.prompt)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <s.icon className="h-3.5 w-3.5 text-primary" />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} profile={profile} />
                ))}
              </div>
            </div>
            <div className="border-t border-border/60 bg-background px-4 py-4">
              <div className="mx-auto max-w-3xl">
                <Composer onSubmit={send} placeholder="Reply to Claude…" />
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  Claude can make mistakes. Please double-check responses.
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function MessageBubble({ message, profile }: { message: Message; profile: { name: string } }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div className="shrink-0 pt-0.5">
        {isUser ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
            {profile.name[0]?.toUpperCase()}
          </span>
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ClaudeLogo className="h-5 w-5" />
          </span>
        )}
      </div>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-transparent text-foreground",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}
