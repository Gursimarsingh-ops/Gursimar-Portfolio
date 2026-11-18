import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Inbox,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  api,
  type AdminOverview,
  type AdminProject,
  type AdminStats,
  type StorageStatus,
} from "@/admin/api";
import { OverviewPanel } from "@/admin/OverviewPanel";
import { RequestsPanel } from "@/admin/RequestsPanel";
import { ClientsPanel } from "@/admin/ClientsPanel";
import { ConversationsPanel } from "@/admin/ConversationsPanel";
import { AiSettingsPanel } from "@/admin/AiSettingsPanel";
import { PortfolioPanel } from "@/admin/PortfolioPanel";
import { MaintenancePanel } from "@/admin/MaintenancePanel";
import { SecurityPanel } from "@/admin/SecurityPanel";

type Section =
  | "overview"
  | "requests"
  | "clients"
  | "conversations"
  | "ai"
  | "portfolio"
  | "maintenance"
  | "security";

const NAV: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "requests", label: "Requests Received", icon: Inbox },
  { id: "clients", label: "Client Details", icon: Users },
  { id: "conversations", label: "Live Conversations", icon: MessageSquare },
  { id: "ai", label: "AI Assistant Settings", icon: Bot },
  { id: "portfolio", label: "Portfolio Management", icon: LayoutDashboard },
  { id: "maintenance", label: "Website Maintenance", icon: Wrench },
  { id: "security", label: "Security Settings", icon: ShieldCheck },
];

function useNoIndex() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Portfolio Admin";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.title = previousTitle;
      meta.remove();
    };
  }, []);
}

/* --------------------------------- login ---------------------------------- */

function LoginScreen({ onSuccess }: { onSuccess: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.login(email, password);
      onSuccess(result.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-neutral-950 px-4 py-12 text-neutral-200">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_-20%,#23262d_0%,#0b0d11_55%,#05060a_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/20 bg-gradient-to-b from-white/20 to-white/[0.04] text-[11px] font-semibold text-white backdrop-blur">
            GS
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Private area</p>
            <p className="text-sm font-medium text-white">Portfolio Admin</p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="relative overflow-hidden rounded-2xl border border-white/12 bg-white/[0.04] p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl"
        >
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/45">
            <ShieldCheck className="h-3.5 w-3.5" />
            Authenticated access only
          </div>

          <label className="mt-5 block">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/50">Email</span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/45"
              placeholder="you@example.com"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/50">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/45"
              placeholder="••••••••••"
            />
          </label>

          {error && (
            <p className="mt-4 flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-950 transition-all hover:-translate-y-0.5 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {busy ? "Verifying…" : "Sign in"}
          </button>

          <p className="mt-4 text-center text-[10px] leading-relaxed text-white/30">
            Sessions are stored in an HttpOnly, SameSite=Strict cookie and validated on the server for every
            request.
          </p>
        </form>

        <a
          href="/"
          className="mt-6 block text-center text-[10px] uppercase tracking-[0.2em] text-white/30 transition-colors hover:text-white/70"
        >
          ← Back to website
        </a>
      </div>
    </div>
  );
}

/* -------------------------------- dashboard ------------------------------- */

function Dashboard({ email, onLoggedOut }: { email: string | null; onLoggedOut: () => void }) {
  useNoIndex();
  const [section, setSection] = useState<Section>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [requestSearch, setRequestSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState(false);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  const refreshOverview = useCallback(async () => {
    try {
      const next = await api.overview();
      setOverview(next);
      setAvailability(next.availability.online);
    } catch {
      /* the shell stays usable if a badge fetch fails */
    }
  }, []);

  const refreshPortfolio = useCallback(async () => {
    try {
      const [projectList, nextStats, nextStatus] = await Promise.all([
        api.projects(),
        api.stats(),
        api.status(),
      ]);
      setProjects(projectList.projects);
      setStats(nextStats);
      setStatus(nextStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load portfolio data.");
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setError(null);
    await Promise.all([refreshPortfolio(), refreshOverview()]);
    setLoading(false);
  }, [refreshPortfolio, refreshOverview]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      onLoggedOut();
      window.location.assign("/security");
    }
  };

  const toggleAvailability = async () => {
    setTogglingAvailability(true);
    try {
      const result = await api.setAvailability(!availability);
      setAvailability(result.online);
      setOverview((current) =>
        current ? { ...current, availability: { online: result.online, updatedAt: result.updatedAt } } : current
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update availability.");
    } finally {
      setTogglingAvailability(false);
    }
  };

  const navigate = (next: Section) => {
    setSection(next);
    setSidebarOpen(false);
    if (next !== "requests") setRequestSearch("");
  };

  const title = useMemo(() => NAV.find((item) => item.id === section)?.label ?? "Dashboard", [section]);

  const content = (() => {
    switch (section) {
      case "requests":
        return <RequestsPanel initialSearch={requestSearch} onChanged={() => void refreshOverview()} />;
      case "clients":
        return (
          <ClientsPanel
            onOpenRequests={(search) => {
              setRequestSearch(search);
              setSection("requests");
            }}
          />
        );
      case "conversations":
        return <ConversationsPanel onChanged={() => void refreshOverview()} />;
      case "ai":
        return <AiSettingsPanel />;
      case "portfolio":
        return (
          <PortfolioPanel
            projects={projects}
            stats={stats}
            status={status}
            onChanged={() => void refreshPortfolio()}
            onRefreshStatus={() => void refreshPortfolio()}
          />
        );
      case "maintenance":
        return <MaintenancePanel />;
      case "security":
        return (
          <SecurityPanel
            onSignedOut={() => {
              onLoggedOut();
              window.location.assign("/security");
            }}
          />
        );
      default:
        return <OverviewPanel overview={overview} onNavigate={navigate} />;
    }
  })();

  const badgeFor = (id: Section): number => {
    if (!overview) return 0;
    if (id === "requests") return overview.requests.new;
    if (id === "conversations") return overview.conversations.unread;
    return 0;
  };

  const sidebar = (
    <div className="flex h-full flex-col gap-5 border-r border-white/10 bg-neutral-950/95 p-4 backdrop-blur-xl">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/20 bg-gradient-to-b from-white/20 to-white/[0.04] text-[10px] font-semibold text-white">
          GS
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
            Portfolio Admin
          </p>
          <p className="truncate text-[9px] uppercase tracking-[0.2em] text-white/35">{email ?? "signed in"}</p>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
        <p className="text-[8px] uppercase tracking-[0.2em] text-white/30">Public chat status</p>
        <button
          type="button"
          onClick={() => void toggleAvailability()}
          disabled={togglingAvailability}
          className="mt-1.5 flex w-full items-center justify-between gap-2 text-left disabled:opacity-50"
        >
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-white/60">
            <span className={cn("h-1.5 w-1.5 rounded-full", availability ? "bg-emerald-400" : "bg-neutral-500")} />
            {availability ? "Online" : "Offline"}
          </span>
          <span
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full border transition-colors",
              availability ? "border-emerald-400/40 bg-emerald-500/25" : "border-white/15 bg-white/5"
            )}
          >
            <span
              className={cn(
                "h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
                availability ? "translate-x-[18px]" : "translate-x-[3px]"
              )}
            />
          </span>
        </button>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV.map((item) => {
          const badge = badgeFor(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              className={cn(
                "group flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-[12px] transition-all duration-200",
                section === item.id
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-transparent text-white/50 hover:border-white/10 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0 text-white/40 group-hover:text-white/80" />
              <span className="truncate">{item.label}</span>
              {badge > 0 && (
                <span className="ml-auto grid h-4 min-w-4 place-items-center rounded-full bg-white px-1 text-[8px] font-semibold text-neutral-950">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-white/10 pt-4">
        <a
          href="/"
          className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-[12px] text-white/45 transition-colors hover:border-white/10 hover:bg-white/5 hover:text-white"
        >
          ← View public site
        </a>
        <button
          type="button"
          onClick={() => void logout()}
          className="flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-left text-[12px] text-white/60 transition-colors hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-200"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#08090c] text-neutral-200">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(120%_100%_at_20%_-10%,#1d2027_0%,#0a0b0f_55%,#050608_100%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:64px_64px]" />

      <div className="relative mx-auto flex min-h-screen max-w-[1440px]">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-72 transition-transform duration-300 lg:static lg:block lg:w-72 lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="h-full">{sidebar}</div>
        </aside>

        {sidebarOpen && (
          <button
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}

        <div className="relative min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#08090c]/85 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open menu"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 bg-white/5 text-white/70 lg:hidden"
                >
                  <Menu className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.24em] text-white/35">Portfolio management</p>
                  <h1 className="truncate text-sm font-medium text-white">{title}</h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] text-white/45 sm:inline-flex">
                  <span className={cn("h-1.5 w-1.5 rounded-full", availability ? "bg-emerald-400" : "bg-neutral-500")} />
                  {availability ? "Available" : "Away"}
                </span>
                <button
                  type="button"
                  onClick={() => void refreshAll()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white/60 transition-colors hover:bg-white/10 hover:text-white sm:inline-flex"
                >
                  <LogOut className="h-3 w-3" />
                  Logout
                </button>
              </div>
            </div>
          </header>

          <main className="px-4 py-6 sm:px-6 sm:py-8">
            {error && (
              <p className="mb-5 flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            )}
            {loading && section === "portfolio" ? (
              <div className="grid place-items-center py-20 text-white/40">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              content
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- app ---------------------------------- */

export function AdminApp() {
  const [state, setState] = useState<"checking" | "out" | "in">("checking");
  const [email, setEmail] = useState<string | null>(null);
  useNoIndex();

  useEffect(() => {
    let cancelled = false;
    api
      .session()
      .then((session) => {
        if (cancelled) return;
        setEmail(session.email);
        setState("in");
      })
      .catch(() => {
        if (!cancelled) setState("out");
      });

    const onUnauthorized = () => {
      setEmail(null);
      setState("out");
    };
    window.addEventListener("admin:unauthorized", onUnauthorized);

    return () => {
      cancelled = true;
      window.removeEventListener("admin:unauthorized", onUnauthorized);
    };
  }, []);

  if (state === "checking") {
    return (
      <div className="grid min-h-screen place-items-center bg-[#08090c] text-white/40">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (state === "out") {
    return (
      <LoginScreen
        onSuccess={(nextEmail) => {
          setEmail(nextEmail);
          setState("in");
        }}
      />
    );
  }

  return <Dashboard email={email} onLoggedOut={() => setState("out")} />;
}
