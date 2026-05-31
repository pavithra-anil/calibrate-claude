import { useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp, Paperclip, Sliders, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComposerProps {
  placeholder?: string;
  onSubmit?: (value: string) => void;
  autoFocus?: boolean;
  className?: string;
  model?: string;
}

export function Composer({
  placeholder = "How can I help you today?",
  onSubmit,
  autoFocus,
  className,
  model = "Claude Sonnet 4.5",
}: ComposerProps) {
  const [value, setValue] = useState("");

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const v = value.trim();
    if (!v) return;
    onSubmit?.(v);
    setValue("");
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form
      onSubmit={submit}
      className={cn(
        "w-full rounded-2xl border border-border bg-card shadow-[0_2px_24px_-8px_rgba(0,0,0,0.08)]",
        "focus-within:border-primary/40 transition-colors",
        className,
      )}
    >
      <textarea
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        rows={2}
        className="w-full resize-none bg-transparent px-5 pt-4 pb-2 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/70 outline-none"
      />
      <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Attach"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Sliders className="h-4 w-4" />
            <span className="hidden sm:inline">Tools</span>
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Research</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">{model}</span>
          <button
            type="submit"
            disabled={!value.trim()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            aria-label="Send"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </form>
  );
}
