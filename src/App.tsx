import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Navbar } from "@/components/navigation/Navbar";
import { Hero } from "@/components/hero/Hero";
import { ArtistScene } from "@/components/studio/ArtistScene";
import { Skills } from "@/components/skills/Skills";
import { GraphicPortfolio } from "@/components/portfolio/GraphicPortfolio";
import { VideoPortfolio } from "@/components/portfolio/VideoPortfolio";
import { Tools } from "@/components/tools/Tools";
import { WorkflowQuality } from "@/components/workflow/WorkflowQuality";
import { Contact } from "@/components/contact/Contact";
import { Footer } from "@/components/common/Footer";
import { ProjectInquiryDialog } from "@/components/forms/ProjectInquiryDialog";
import { AdminApp } from "@/admin/AdminApp";
import { SecurityDashboard } from "@/security/SecurityDashboard";
import { DirectChat } from "@/components/chat/DirectChat";
import { PortfolioAssistant } from "@/components/ai/PortfolioAssistant";
import { MaintenanceScreen } from "@/components/maintenance/MaintenanceScreen";
import "@/styles/global/animations.css";

function isAdminRoute(): boolean {
  return /^\/admin(\/|$)/.test(window.location.pathname);
}

function isSecurityRoute(): boolean {
  return /^\/security(\/|$)/.test(window.location.pathname);
}

/** Reads the D1-backed maintenance flag. `null` means the server was unreachable. */
async function readMaintenance(): Promise<boolean | null> {
  try {
    const response = await fetch("/api/site/status", {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { maintenance?: boolean };
    return Boolean(data?.maintenance);
  } catch {
    return null;
  }
}

/** Neutral boot state shown while the maintenance flag is being resolved. */
function BootScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-white text-neutral-900 antialiased">
      <div className="flex flex-col items-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-900/15 border-t-neutral-900/70" />
        <p className="text-[10px] uppercase tracking-[0.28em] text-neutral-400">Gursimar Singh</p>
      </div>
    </div>
  );
}

/**
 * Gates the public portfolio behind the real, database-backed maintenance mode.
 *
 * The flag is polled every five seconds (and immediately when the tab becomes
 * active again), so a visitor who is already on the page sees the maintenance
 * screen — and gets the site back — without reloading. The database remains the
 * only source of truth: no client storage can hold the site open or closed.
 * /admin and /security bypass this gate, so the dashboard stays reachable.
 */
function SiteGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"checking" | "live" | "maintenance">("checking");

  /** Returns the server flag, or null when the server could not be reached. */
  const check = useCallback(async (): Promise<boolean | null> => {
    const maintenance = await readMaintenance();
    if (maintenance === null) return null;
    setState(maintenance ? "maintenance" : "live");
    return maintenance;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void readMaintenance().then((maintenance) => {
      if (cancelled) return;
      // A failed first check must not lock visitors out of a working site.
      setState(maintenance === true ? "maintenance" : "live");
    });

    const timer = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void check();
    }, 5000);

    const recheck = () => {
      if (document.visibilityState === "visible") void check();
    };

    document.addEventListener("visibilitychange", recheck);
    window.addEventListener("focus", recheck);
    window.addEventListener("online", recheck);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", recheck);
      window.removeEventListener("focus", recheck);
      window.removeEventListener("online", recheck);
    };
  }, [check]);

  if (state === "checking") return <BootScreen />;
  if (state === "maintenance") return <MaintenanceScreen onRecheck={check} />;
  return <>{children}</>;
}

function PublicSite() {
  const [inquiryOpen, setInquiryOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased selection:bg-neutral-900 selection:text-white">
      <Navbar onHire={() => setInquiryOpen(true)} />
      <main>
        <Hero />
        <ArtistScene />
        <Skills />
        <GraphicPortfolio />
        <VideoPortfolio />
        <Tools />
        <WorkflowQuality />
        <Contact onStartProject={() => setInquiryOpen(true)} />
      </main>
      <Footer />
      <DirectChat />
      <PortfolioAssistant onHire={() => setInquiryOpen(true)} />
      <ProjectInquiryDialog open={inquiryOpen} onOpenChange={setInquiryOpen} />
    </div>
  );
}

export default function App() {
  if (isSecurityRoute()) return <SecurityDashboard />;
  if (isAdminRoute()) return <AdminApp />;
  return (
    <SiteGate>
      <PublicSite />
    </SiteGate>
  );
}
