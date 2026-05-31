import { useState } from "react";
import { ChevronDown, HelpCircle, X, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalibrateResult, CalibrateStatus, CalibrateDimension } from "@/lib/gemini";

const CORAL = "#DA7756";

interface Props {
  result: CalibrateResult;
  onDismiss?: () => void;
  onFeedback?: (kind: "good" | "bad") => void;
}

const DIMENSIONS: { key: keyof CalibrateResult; label: string }[] = [
  { key: "faithfulness", label: "Faithfulness" },
  { key: "completeness", label: "Completeness" },
  { key: "reasoning", label: "Reasoning" },
  { key: "factual_confidence", label: "Factual Confidence" },
  { key: "uncertainty", label: "Uncertainty" },
];

function StatusBadge({ status }: { status: CalibrateStatus }) {
  const styles: Record<CalibrateStatus, string> = {
    Strong:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
    Review:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/30",
    Verify:
      "bg-[#DA7756]/15 text-[#B85A3D] dark:text-[#E89377] ring-1 ring-inset ring-[#DA7756]/40",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}

function DimensionRow({ label, data }: { label: string; data: CalibrateDimension }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/40 last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent/40 transition-colors"
      >
        <span className="min-w-[130px] text-[13px] font-medium text-foreground">{label}</span>
        <StatusBadge status={data.status} />
        <span className="flex-1 truncate text-[12.5px] text-muted-foreground">
          {data.explanation}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="space-y-1.5 bg-accent/30 px-3 pb-3 pt-1 text-[12.5px]">
          <p>
            <span className="font-medium text-foreground">Why flagged: </span>
            <span className="text-muted-foreground">{data.explanation}</span>
          </p>
          <p>
            <span className="font-medium text-foreground">What to check: </span>
            <span className="text-muted-foreground">{data.detail}</span>
          </p>
          <p>
            <span className="font-medium text-foreground">What Claude assumed: </span>
            <span className="text-muted-foreground">{data.assumption ?? "—"}</span>
          </p>
        </div>
      )}
    </div>
  );
}

export function CalibratePanel({ result, onDismiss, onFeedback }: Props) {
  const [tip, setTip] = useState(false);
  const [feedback, setFeedback] = useState<null | "good" | "bad">(null);

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
          <span className="text-[13px] text-muted-foreground">— Output Assessment</span>
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
                Calibrate evaluates Claude outputs across 5 dimensions to help you decide when
                to trust, verify, or regenerate.
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

      {/* Dimensions */}
      <div className="border-t border-border/40">
        {DIMENSIONS.map((d) => (
          <DimensionRow key={d.key} label={d.label} data={result[d.key] as CalibrateDimension} />
        ))}
      </div>

      {/* Overall */}
      <div className="border-t border-border/40 px-3 py-2.5">
        <p className="text-[13px]">
          <span className="font-medium text-foreground">{result.overall}</span>
          <span className="text-muted-foreground"> — {result.recommendation}</span>
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 border-t border-border/40 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handle("good")}
            disabled={feedback !== null}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors disabled:opacity-60",
              "border-emerald-500/50 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300",
              feedback === "good" && "bg-emerald-500/15",
            )}
          >
            <Check className="h-3 w-3" /> Looks good
          </button>
          <button
            onClick={() => handle("bad")}
            disabled={feedback !== null}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors disabled:opacity-60",
              "hover:bg-[#DA7756]/10",
              feedback === "bad" && "bg-[#DA7756]/15",
            )}
            style={{ borderColor: `${CORAL}80`, color: CORAL }}
          >
            <AlertCircle className="h-3 w-3" /> Needs work
          </button>
        </div>
        <span className="text-[11px] text-muted-foreground">
          Calibrate learns from your feedback
        </span>
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
      <span
        className="calibrate-pulse text-[13px] font-medium"
        style={{ color: CORAL }}
      >
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
      className="calibrate-enter mt-3 flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5"
      style={{ borderTopColor: CORAL, borderTopWidth: 2 }}
    >
      <span className="text-[12.5px] text-muted-foreground">
        Session evaluation limit reached — this mirrors real-world token economics in AI products.
      </span>
      <button
        onClick={onReset}
        className="shrink-0 rounded-md border border-border bg-background px-2.5 py-1 text-[12px] font-medium hover:bg-accent"
      >
        Reset Session
      </button>
    </div>
  );
}
