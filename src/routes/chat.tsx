import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChatSidebar } from "@/components/chat-sidebar";
import { Composer } from "@/components/composer";
import { useProfile } from "@/lib/profile";
import { ClaudeLogo } from "@/components/claude-logo";
import { Lightbulb, GraduationCap, Code2, PenLine, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  CalibratePanel,
  CalibrateEvaluating,
  CalibrateError,
  CalibrateLimitReached,
} from "@/components/calibrate-panel";
import {
  generateReply,
  evaluateReply,
  enrichPrompt,
  type CalibrateResult,
  type Stakes,
  type EnrichmentResult,
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
  userPrompt?: string;
  pending?: boolean;
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
const CORAL = "#DA7756";

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
  const [enrichment, setEnrichment] = useState<EnrichmentResult | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  useEffect(() => {
    if (loaded && !profile) navigate({ to: "/" });
  }, [loaded, profile, navigate]);

  useEffect(() => {
    setEvalCount(readCount());
  }, []);

  const updateMessage = (id: string, patch: Partial<Message>) => {
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const replaceLastUserMessage = (newContent: string) => {
    setMessages((ms) => {
      const updated = [...ms];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].role === "user") {
          updated[i] = { ...updated[i], content: newContent };
          break;
        }
      }
      return updated;
    });
  };

  const executeGeneration = async (text: string, skipUserMessage = false) => {
    setEnrichment(null);
    setPendingPrompt(null);

    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      userPrompt: text,
      pending: true,
      evalState: { kind: "idle" },
    };

    if (!skipUserMessage) {
      const userId = crypto.randomUUID();
      const userMsg: Message = { id: userId, role: "user", content: text };
      setMessages((m) => [...m, userMsg, assistantMsg]);
      if (messages.length === 0) {
        setRecents((r) => [{ id: userId, title: text.slice(0, 40) }, ...r].slice(0, 12));
      }
    } else {
      setMessages((m) => [...m, assistantMsg]);
    }

    let reply: string;
    try {
      reply = await generateReply(text);
    } catch (e) {
      const msg =
        e instanceof Error && e.message.includes("VITE_GROQ_API_KEY")
          ? "Add VITE_GROQ_API_KEY to .env to enable live responses."
          : "Sorry — I couldn't generate a response. Please try again.";
      updateMessage(assistantId, {
        content: msg,
        pending: false,
        evalState: { kind: "error", message: "Evaluation unavailable — please try again" },
      });
      return;
    }
    updateMessage(assistantId, { content: reply, pending: false });

    // Skip evaluation entirely for low stakes
    if (stakes === "low") {
      updateMessage(assistantId, { evalState: { kind: "dismissed" } });
      return;
    }

    const current = readCount();
    if (current >= SESSION_LIMIT) {
      updateMessage(assistantId, { evalState: { kind: "limit" } });
      return;
    }

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
            ? "Unable to parse evaluation"
            : "Evaluation unavailable — please try again";
      updateMessage(assistantId, { evalState: { kind: "error", message } });
    }
  };

  const send = async (text: string) => {
    // Only run enrichment on high stakes + short prompts
    if (stakes === "high" && text.trim().split(" ").length < 15) {
      setPendingPrompt(text);
      // Show user message immediately with original prompt
      const userId = crypto.randomUUID();
      const userMsg: Message = { id: userId, role: "user", content: text };
      setMessages((m) => [...m, userMsg]);
      if (messages.length === 0) {
        setRecents((r) => [{ id: userId, title: text.slice(0, 40) }, ...r].slice(0, 12));
      }
      try {
        const result = await enrichPrompt(text);
        if (result.needs_enrichment && result.versions.length > 0) {
          setEnrichment(result);
          return;
        }
      } catch {
        // If enrichment fails proceed with original
      }
    }
    await executeGeneration(text);
  };

  const newChat = () => {
    setMessages([]);
    setEnrichment(null);
    setPendingPrompt(null);
  };

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

        {/* Prompt Intelligence Card */}
        {enrichment && pendingPrompt && (
          <div className="border-b border-border/60 bg-card px-4 py-3">
            <div className="mx-auto max-w-3xl">
              <div
                className="overflow-hidden rounded-xl border border-border/60"
                style={{ borderTopColor: CORAL, borderTopWidth: 2 }}
              >
                <div className="px-3 py-2.5">
                  <p className="text-[13px] font-medium" style={{ color: CORAL }}>
                    ✦ Calibrate — Before you run
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    Your prompt could be more specific. Pick a version or continue with your original.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 border-t border-border/40 px-3 pb-3 pt-2">
                  {enrichment.versions.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        replaceLastUserMessage(v.prompt);
                        executeGeneration(v.prompt, true);
                      }}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors hover:border-primary hover:bg-accent"
                    >
                      <p className="text-[12px] font-medium text-foreground">
                        {v.label}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                        {v.prompt}
                      </p>
                    </button>
                  ))}
                </div>
                <div className="border-t border-border/40 px-3 py-2">
                  <button
                    onClick={() => executeGeneration(pendingPrompt, true)}
                    className="text-[12px] text-muted-foreground underline hover:text-foreground"
                  >
                    Continue with original prompt →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isEmpty && !enrichment ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4">
            <div className="w-full max-w-2xl">
              <div className="mb-8 flex flex-col items-center text-center">
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <ClaudeLogo className="h-7 w-7" />
                </span>
                <h1 className="font-serif text-4xl tracking-tight">
                  <span className="text-primary">✻</span> {greeting},{" "}
                  {profile.name.split(" ")[0]}
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
                    onDismissEval={() =>
                      updateMessage(m.id, { evalState: { kind: "dismissed" } })
                    }
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
                  Prototype · Powered by Groq (Llama 3.3 70B) · Production uses Claude Sonnet + Claude Haiku eval agents
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
  const remaining = SESSION_LIMIT - count;
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
      {count >= 7 && count < SESSION_LIMIT && (
        <span className="text-[11px] font-medium text-amber-600">
          {remaining} evaluation{remaining === 1 ? "" : "s"} remaining
        </span>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span
        className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground"
        style={{ animationDelay: "0s" }}
      />
      <span
        className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground"
        style={{ animationDelay: "0.2s" }}
      />
      <span
        className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground"
        style={{ animationDelay: "0.4s" }}
      />
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
      <div className={cn("max-w-[85%] min-w-0", isUser ? "" : "flex-1")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground whitespace-pre-wrap"
              : "bg-transparent text-foreground",
          )}
        >
          {message.pending ? (
            <TypingIndicator />
          ) : isUser ? (
            message.content
          ) : (
            <ReactMarkdown
              components={{
                code({ className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || "");
                  const isBlock = match || String(children).includes("\n");
                  return isBlock ? (
                    <div className="relative my-3 overflow-hidden rounded-lg border border-border">
                      <div className="flex items-center justify-between bg-accent/60 px-3 py-1.5">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {match ? match[1] : "code"}
                        </span>
                        <button
                          onClick={() =>
                            navigator.clipboard.writeText(String(children))
                          }
                          className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                        >
                          Copy
                        </button>
                      </div>
                      <SyntaxHighlighter
                        style={oneLight}
                        language={match ? match[1] : "text"}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          borderRadius: 0,
                          fontSize: "13px",
                          background: "transparent",
                        }}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code
                      className="rounded bg-accent px-1 py-0.5 font-mono text-[13px]"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                p({ children }: any) {
                  return <p className="mb-3 last:mb-0">{children}</p>;
                },
                h1({ children }: any) {
                  return <h1 className="mb-2 mt-4 text-[18px] font-semibold">{children}</h1>;
                },
                h2({ children }: any) {
                  return <h2 className="mb-2 mt-4 text-[16px] font-semibold">{children}</h2>;
                },
                h3({ children }: any) {
                  return <h3 className="mb-1.5 mt-3 text-[15px] font-semibold">{children}</h3>;
                },
                ul({ children }: any) {
                  return <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>;
                },
                ol({ children }: any) {
                  return <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>;
                },
                li({ children }: any) {
                  return <li className="text-[15px]">{children}</li>;
                },
                strong({ children }: any) {
                  return <strong className="font-semibold">{children}</strong>;
                },
                hr() {
                  return <hr className="my-3 border-border" />;
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {!isUser && message.evalState && (
          <>
            {message.evalState.kind === "loading" && <CalibrateEvaluating />}
            {message.evalState.kind === "done" && (
              <CalibratePanel
                result={message.evalState.result}
                onDismiss={onDismissEval}
              />
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