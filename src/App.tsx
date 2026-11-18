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

async function readAdminSession(): Promise<boolean> {
  try {
    const response = await fetch("/api/admin/session", {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Neutral boot state shown while the maintenance flag is being resolved. */
function BootScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-white text-neutral-900 antialiased">
      <div className="flex flex-col items-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-900/15 border-t-neutral-900/70" />
        <p className="text-[10px] uppercase tracking-[0.28em] text-neutral-400">GurSimar Singh</p>
      </div>
    </div>
  );
}

/**
 * Gates the public portfolio behind the real, database-backed maintenance mode.
 * Signed-in administrators always see the site, so the dashboard stays reachable.
 */
function SiteGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"checking" | "live" | "maintenance">("checking");

  const resolve = useCallback(async () => {
    const maintenance = await readMaintenance();
    if (!maintenance) {
      setState("live");
      return;
    }
    // Maintenance is on: administrators keep working on the live site.
    const isAdmin = await readAdminSession();
    setState(isAdmin ? "live" : "maintenance");
  }, []);

  useEffect(() => {
    void resolve();
  }, [resolve]);

  if (state === "checking") return <BootScreen />;
  if (state === "maintenance") return <MaintenanceScreen />;
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
