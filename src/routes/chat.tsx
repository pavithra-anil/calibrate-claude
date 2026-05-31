import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChatSidebar } from "@/components/chat-sidebar";
import { Composer } from "@/components/composer";
import { useProfile } from "@/lib/profile";
import { ClaudeLogo } from "@/components/claude-logo";
import { Lightbulb, GraduationCap, Code2, PenLine, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CalibratePanel,
  CalibrateEvaluating,
  CalibrateError,
  CalibrateLimitReached,
} from "@/components/calibrate-panel";
import {
  generateReply,
  evaluateReply,
  type CalibrateResult,
  type Stakes,
} from "@/lib/gemini";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat — Claude" },
      { name: "description", content: "Chat with Claude, your AI assistant." },
    ],
  }),
  component: ChatPage,
});

type EvalState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; result: CalibrateResult }
  | { kind: "error"; message: string }
  | { kind: "limit" }
  | { kind: "dismissed" };

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  userPrompt?: string; // for assistant: the prompt that produced it
  pending?: boolean; // assistant message still generating
  evalState?: EvalState;
}

const SUGGESTIONS = [
  { icon: PenLine, label: "Write", prompt: "Help me write a short story about a lighthouse keeper." },
  { icon: Code2, label: "Code", prompt: "Explain how JavaScript closures work with a small example." },
  { icon: GraduationCap, label: "Learn", prompt: "Teach me about quantum entanglement in simple terms." },
  { icon: Lightbulb, label: "Brainstorm", prompt: "Brainstorm 5 ideas for a weekend project." },
];

const SESSION_KEY = "calibrate_eval_count";
const SESSION_LIMIT = 10;

function readCount(): number {
  if (typeof window === "undefined") return 0;
  return Number(sessionStorage.getItem(SESSION_KEY) || "0");
}
function writeCount(n: number) {
  sessionStorage.setItem(SESSION_KEY, String(n));
}

function ChatPage() {
  const { profile, loaded } = useProfile();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [recents, setRecents] = useState<{ id: string; title: string }[]>([]);
  const [stakes, setStakes] = useState<Stakes>("low");
  const [evalCount, setEvalCount] = useState(0);

  useEffect(() => {
    if (loaded && !profile) navigate({ to: "/" });
  }, [loaded, profile, navigate]);

  useEffect(() => {
    setEvalCount(readCount());
  }, []);

  const updateMessage = (id: string, patch: Partial<Message>) => {
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const send = async (text: string) => {
    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    const userMsg: Message = { id: userId, role: "user", content: text };
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      userPrompt: text,
      pending: true,
      evalState: { kind: "idle" },
    };
    setMessages((m) => [...m, userMsg, assistantMsg]);
    if (messages.length === 0) {
      setRecents((r) => [{ id: userId, title: text.slice(0, 40) }, ...r].slice(0, 12));
    }

    // Generation
    let reply: string;
    try {
      reply = await generateReply(text);
    } catch (e) {
      const msg =
        e instanceof Error && e.message.includes("VITE_GEMINI_API_KEY")
          ? "Add VITE_GEMINI_API_KEY to .env to enable live responses."
          : "Sorry — I couldn't generate a response. Please try again.";
      updateMessage(assistantId, {
        content: msg,
        pending: false,
        evalState: { kind: "error", message: "Evaluation unavailable — please try again" },
      });
      return;
    }
    updateMessage(assistantId, { content: reply, pending: false });

    // Session limit check
    const current = readCount();
    if (current >= SESSION_LIMIT) {
      updateMessage(assistantId, { evalState: { kind: "limit" } });
      return;
    }

    // Evaluation
    updateMessage(assistantId, { evalState: { kind: "loading" } });
    try {
      const result = await evaluateReply(text, reply, stakes);
      const next = current + 1;
      writeCount(next);
      setEvalCount(next);
      updateMessage(assistantId, { evalState: { kind: "done", result } });
    } catch (e) {
      const message =
        e instanceof Error && e.name === "AbortError"
          ? "Evaluation timed out — please try again"
          : e instanceof SyntaxError
            ? "Unable to parse evaluation — raw response available"
            : "Evaluation unavailable — please try again";
      updateMessage(assistantId, { evalState: { kind: "error", message } });
    }
  };

  const newChat = () => setMessages([]);

  const resetSession = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setEvalCount(0);
    setMessages((ms) =>
      ms.map((m) =>
        m.role === "assistant" && m.evalState?.kind === "limit"
          ? { ...m, evalState: { kind: "dismissed" } }
          : m,
      ),
    );
  };

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

              <StakesToggle stakes={stakes} onChange={setStakes} count={evalCount} />
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
                  <MessageBubble
                    key={m.id}
                    message={m}
                    profile={profile}
                    onDismissEval={() => updateMessage(m.id, { evalState: { kind: "dismissed" } })}
                    onResetSession={resetSession}
                  />
                ))}
              </div>
            </div>
            <div className="border-t border-border/60 bg-background px-4 py-4">
              <div className="mx-auto max-w-3xl">
                <StakesToggle stakes={stakes} onChange={setStakes} count={evalCount} />
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

function StakesToggle({
  stakes,
  onChange,
  count,
}: {
  stakes: Stakes;
  onChange: (s: Stakes) => void;
  count: number;
}) {
  const isHigh = stakes === "high";
  return (
    <div className="mb-2 flex items-center justify-between gap-3 px-1 text-[12px] text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>Evaluation:</span>
        <button
          onClick={() => onChange("low")}
          className={cn(
            "rounded-md px-1.5 py-0.5 transition-colors",
            !isHigh && "bg-accent text-foreground font-medium",
          )}
        >
          Low stakes
        </button>
        <button
          role="switch"
          aria-checked={isHigh}
          onClick={() => onChange(isHigh ? "low" : "high")}
          className={cn(
            "relative h-4 w-7 rounded-full transition-colors",
            isHigh ? "bg-primary" : "bg-border",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-3 w-3 rounded-full bg-background shadow transition-all",
              isHigh ? "left-3.5" : "left-0.5",
            )}
          />
        </button>
        <button
          onClick={() => onChange("high")}
          className={cn(
            "rounded-md px-1.5 py-0.5 transition-colors",
            isHigh && "bg-accent text-foreground font-medium",
          )}
        >
          High stakes
        </button>
      </div>
      <span className="text-[11px]">{count}/{SESSION_LIMIT} evals</span>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: "0s" }} />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: "0.2s" }} />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: "0.4s" }} />
    </div>
  );
}

function MessageBubble({
  message,
  profile,
  onDismissEval,
  onResetSession,
}: {
  message: Message;
  profile: { name: string };
  onDismissEval: () => void;
  onResetSession: () => void;
}) {
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
          "max-w-[85%] min-w-0",
          isUser ? "" : "flex-1",
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap",
            isUser ? "bg-primary text-primary-foreground" : "bg-transparent text-foreground",
          )}
        >
          {message.pending ? <TypingIndicator /> : message.content}
        </div>

        {!isUser && message.evalState && (
          <>
            {message.evalState.kind === "loading" && <CalibrateEvaluating />}
            {message.evalState.kind === "done" && (
              <CalibratePanel result={message.evalState.result} onDismiss={onDismissEval} />
            )}
            {message.evalState.kind === "error" && (
              <CalibrateError message={message.evalState.message} />
            )}
            {message.evalState.kind === "limit" && (
              <CalibrateLimitReached onReset={onResetSession} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
