import { useState } from "react";
import { HelpCircle, X, Check, AlertCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CalibrateResult,
  SignalStatus,
  ReadyStatus,
  Verdict,
} from "@/lib/gemini";

const CORAL = "#DA7756";

interface Props {
  result: CalibrateResult;
  onDismiss?: () => void;
  onFeedback?: (kind: "good" | "bad") => void;
}

const VERDICT_CONFIG: Record<Verdict, { label: string; color: string; bg: string; icon: string }> = {
  "safe-to-use": { label: "Safe to use", color: "#166534", bg: "#f0fdf4", icon: "✓" },
  "review-before-using": { label: "Review before using", color: "#92400e", bg: "#fffbeb", icon: "⚠" },
  "do-not-use": { label: "Do not use as-is", color: "#991b1b", bg: "#fef2f2", icon: "✗" },
};

const SIGNAL_BADGE: Record<SignalStatus, { label: string; className: string }> = {
  trusted: { label: "Trusted", className: "bg-emerald-500/15 text-emerald-700 ring-1 ring-inset ring-emerald-500/30" },
  check: { label: "Check", className: "bg-amber-500/15 text-amber-700 ring-1 ring-inset ring-amber-500/30" },
  verify: { label: "Verify", className: "bg-[#DA7756]/15 text-[#B85A3D] ring-1 ring-inset ring-[#DA7756]/40" },
};

const READY_BADGE: Record<ReadyStatus, { label: string; className: string }> = {
  "use-as-is": { label: "Use as-is", className: "bg-emerald-500/15 text-emerald-700 ring-1 ring-inset ring-emerald-500/30" },
  "review-first": { label: "Review first", className: "bg-amber-500/15 text-amber-700 ring-1 ring-inset ring-amber-500/30" },
  "not-ready": { label: "Not ready", className: "bg-[#DA7756]/15 text-[#B85A3D] ring-1 ring-inset ring-[#DA7756]/40" },
};

function SignalRow({
  label,
  status,
  summary,
  details,
  assumption,
  badgeConfig,
}: {
  label: string;
  status: string;
  summary: string;
  details: string[];
  assumption: string | null;
  badgeConfig: { label: string; className: string };
}) {
  const [open, setOpen] = useState(false);
  const hasDetail = details.length > 0 || (assumption && assumption !== "null");

  return (
    <div className="border-b border-border/40 last:border-b-0">
      <button
        onClick={() => hasDetail && setOpen((v) => !v)}
        className={cn(
          "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors",
          hasDetail && "hover:bg-accent/40",
        )}
      >
        <span className="min-w-[110px] pt-0.5 text-[13px] font-medium text-foreground">
          {label}
        </span>
        <span className={cn("mt-0.5 inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide", badgeConfig.className)}>
          {badgeConfig.label}
        </span>
        <span className="flex-1 text-[12.5px] leading-snug text-muted-foreground">
          {summary}
        </span>
        {hasDetail && (
          <ChevronDown className={cn("mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        )}
      </button>

      {open && hasDetail && (
        <div className="space-y-1.5 bg-accent/30 px-3 pb-3 pt-1">
          {details.map((d, i) => (
            <p key={i} className="text-[12px] text-muted-foreground">· {d}</p>
          ))}
          {assumption && assumption !== "null" && (
            <p className="text-[12px]">
              <span className="font-medium text-foreground">Claude assumed: </span>
              <span className="text-muted-foreground">{assumption}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ReadyRow({
  status,
  summary,
  actions,
}: {
  status: ReadyStatus;
  summary: string;
  actions: string[];
}) {
  const [open, setOpen] = useState(false);
  const badge = READY_BADGE[status];

  return (
    <div className="border-b border-border/40 last:border-b-0">
      <button
        onClick={() => actions.length > 0 && setOpen((v) => !v)}
        className={cn(
          "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors",
          actions.length > 0 && "hover:bg-accent/40",
        )}
      >
        <span className="min-w-[110px] pt-0.5 text-[13px] font-medium text-foreground">
          Ready to use
        </span>
        <span className={cn("mt-0.5 inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide", badge.className)}>
          {badge.label}
        </span>
        <span className="flex-1 text-[12.5px] leading-snug text-muted-foreground">
          {summary}
        </span>
        {actions.length > 0 && (
          <ChevronDown className={cn("mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        )}
      </button>

      {open && actions.length > 0 && (
        <div className="space-y-1 bg-accent/30 px-3 pb-3 pt-1">
          {actions.map((a, i) => (
            <p key={i} className="text-[12px] text-muted-foreground">{i + 1}. {a}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export function CalibratePanel({ result, onDismiss, onFeedback }: Props) {
  const [tip, setTip] = useState(false);
  const [feedback, setFeedback] = useState<null | "good" | "bad">(null);
  const [feedbackDetail, setFeedbackDetail] = useState<string | null>(null);

  const verdict = VERDICT_CONFIG[result.verdict];

  const handle = (kind: "good" | "bad") => {
    setFeedback(kind);
    onFeedback?.(kind);
  };

  return (
    <div
      className="calibrate-enter mt-3 overflow-hidden rounded-xl border border-border/60 bg-card"
      style={{ borderTopColor: CORAL, borderTopWidth: 2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium" style={{ color: CORAL }}>
            ✦ Calibrate
          </span>
          <div className="relative">
            <button
              onMouseEnter={() => setTip(true)}
              onMouseLeave={() => setTip(false)}
              onFocus={() => setTip(true)}
              onBlur={() => setTip(false)}
              aria-label="About Calibrate"
              className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
            {tip && (
              <div className="absolute left-1/2 top-5 z-10 w-64 -translate-x-1/2 rounded-md border border-border bg-popover px-2.5 py-1.5 text-[11.5px] leading-snug text-popover-foreground shadow-md">
                Calibrate evaluates every Claude output across Accuracy, Completeness, and Readiness — so you know exactly when to trust, verify, or improve before acting professionally.
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Verdict banner */}
      <div className="mx-3 mb-2 rounded-lg px-3 py-2" style={{ backgroundColor: verdict.bg }}>
        <p className="text-[13px] font-semibold" style={{ color: verdict.color }}>
          {verdict.icon} {verdict.label}
        </p>
        <p className="mt-0.5 text-[12px]" style={{ color: verdict.color, opacity: 0.85 }}>
          {result.verdict_reason}
        </p>
      </div>

      {/* Three signals */}
      <div className="border-t border-border/40">
        <SignalRow
          label="Accuracy"
          status={result.accuracy.status}
          summary={result.accuracy.summary}
          details={result.accuracy.details}
          assumption={result.accuracy.assumption}
          badgeConfig={SIGNAL_BADGE[result.accuracy.status]}
        />
        <SignalRow
          label="Completeness"
          status={result.completeness.status}
          summary={result.completeness.summary}
          details={result.completeness.details}
          assumption={result.completeness.assumption}
          badgeConfig={SIGNAL_BADGE[result.completeness.status]}
        />
        <ReadyRow
          status={result.ready.status}
          summary={result.ready.summary}
          actions={result.ready.actions}
        />
      </div>

      {/* Recommended actions */}
      {result.recommended_actions.length > 0 && (
        <div className="border-t border-border/40 px-3 py-2.5">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: CORAL }}>
            Before you use this
          </p>
          {result.recommended_actions.map((action, i) => (
            <p key={i} className="text-[12.5px] text-foreground">{i + 1}. {action}</p>
          ))}
        </div>
      )}

      {/* Feedback */}
      <div className="flex items-center justify-between gap-2 border-t border-border/40 px-3 py-2.5">
        {feedback === null ? (
          <>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handle("good")}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-500/50 px-2.5 py-1 text-[12px] font-medium text-emerald-700 transition-colors hover:bg-emerald-500/10"
              >
                <Check className="h-3 w-3" /> Looks good
              </button>
              <button
                onClick={() => handle("bad")}
                className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors hover:bg-[#DA7756]/10"
                style={{ borderColor: `${CORAL}80`, color: CORAL }}
              >
                <AlertCircle className="h-3 w-3" /> Needs work
              </button>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Calibrate learns from your feedback
            </span>
          </>
        ) : feedback === "bad" && feedbackDetail === null ? (
          <div className="w-full">
            <p className="mb-2 text-[12px] font-medium text-foreground">
              What specifically needs work?
            </p>
            <div className="flex flex-wrap gap-2">
              {["Missing context", "Wrong answer", "Incomplete", "Too generic"].map((option) => (
                <button
                  key={option}
                  onClick={() => setFeedbackDetail(option)}
                  className="rounded-md border border-border px-2.5 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {option}
                </button>
              ))}
              <button
                onClick={() => setFeedbackDetail("skipped")}
                className="text-[12px] text-muted-foreground underline"
              >
                Skip
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground">
            {feedback === "good"
              ? "✓ Thanks — Calibrate noted this output was accurate"
              : `✓ Thanks — Calibrate noted: ${feedbackDetail === "skipped" ? "needs work" : feedbackDetail?.toLowerCase()}`}
          </p>
        )}
      </div>
    </div>
  );
}

export function CalibrateEvaluating() {
  return (
    <div
      className="calibrate-enter mt-3 flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2.5"
      style={{ borderTopColor: CORAL, borderTopWidth: 2 }}
    >
      <span className="calibrate-pulse text-[13px] font-medium" style={{ color: CORAL }}>
        ✦ Calibrate is evaluating…
      </span>
    </div>
  );
}

export function CalibrateError({ message }: { message: string }) {
  return (
    <div
      className="calibrate-enter mt-3 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-[12.5px] text-muted-foreground"
      style={{ borderTopColor: CORAL, borderTopWidth: 2 }}
    >
      {message}
    </div>
  );
}

export function CalibrateLimitReached({ onReset }: { onReset: () => void }) {
  return (
    <div
      className="calibrate-enter mt-3 overflow-hidden rounded-xl border border-border/60 bg-card"
      style={{ borderTopColor: CORAL, borderTopWidth: 2 }}
    >
      <div className="px-3 py-3">
        <p className="mb-1 text-[13px] font-medium text-foreground">
          Session evaluation limit reached
        </p>
        <p className="mb-3 text-[12px] text-muted-foreground">
          This mirrors real-world token economics — at scale, Calibrate optimizes by evaluating only high-stakes outputs.
        </p>
        <button
          onClick={onReset}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-accent"
        >
          Reset session
        </button>
      </div>
    </div>
  );
}