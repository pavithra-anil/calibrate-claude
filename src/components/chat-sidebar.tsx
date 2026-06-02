import { Link, useRouterState } from "@tanstack/react-router";
import {
  PenSquare,
  Search,
  MessageSquare,
  FolderClosed,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ClaudeLogo } from "@/components/claude-logo";
import type { Profile } from "@/lib/profile";

interface SidebarProps {
  profile: Profile | null;
  recents: { id: string; title: string }[];
  onNewChat: () => void;
  activeId?: string;
}

export function ChatSidebar({ profile, recents, onNewChat, activeId }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-[60px]" : "w-[260px]",
      )}
    >
      <div className="flex items-center justify-between px-3 py-3">
        <Link to="/chat" className="flex items-center gap-2 px-1">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ClaudeLogo className="h-5 w-5" />
          </span>
          {!collapsed && <span className="text-[15px] font-medium tracking-tight">Claude</span>}
        </Link>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="rounded-md p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>

      <div className="px-2">
        <button
          onClick={onNewChat}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-primary hover:bg-sidebar-accent transition-colors",
            collapsed && "justify-center",
          )}
        >
          <PenSquare className="h-4 w-4 shrink-0" />
          {!collapsed && <span>New chat</span>}
        </button>
        <button
          className={cn(
            "mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors",
            collapsed && "justify-center",
          )}
        >
          <Search className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Search chats</span>}
        </button>
        <Link
          to="/chat"
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors",
            collapsed && "justify-center",
            path === "/chat" && "bg-sidebar-accent",
          )}
        >
          <MessageSquare className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Chats</span>}
        </Link>
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors",
            collapsed && "justify-center",
          )}
        >
          <FolderClosed className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Projects</span>}
        </button>
      </div>

      {!collapsed && (
        <div className="mt-5 flex-1 overflow-y-auto px-2">
          <div className="px-2.5 pb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
            Recents
          </div>
          <div className="space-y-0.5">
            {recents.length === 0 && (
              <div className="px-2.5 py-2 text-xs text-muted-foreground/60">No chats yet</div>
            )}
            {recents.map((r) => (
              <button
                key={r.id}
                className={cn(
                  "block w-full truncate rounded-lg px-2.5 py-1.5 text-left text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors",
                  activeId === r.id && "bg-sidebar-accent text-foreground",
                )}
              >
                {r.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {!collapsed && (
        <div className="border-t border-sidebar-border p-2">
          <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-sidebar-accent">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-semibold">
              {profile?.name?.[0]?.toUpperCase() ?? "?"}
            </span>
            <div className="min-w-0 flex-1 text-left">
              <div className="truncate text-[13px] font-medium">{profile?.name ?? "Guest"}</div>
            </div>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </button>
          <button className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-muted-foreground hover:bg-sidebar-accent">
            <Sparkles className="h-3.5 w-3.5" />
            Upgrade plan
          </button>
        </div>
      )}
    </aside>
  );
}