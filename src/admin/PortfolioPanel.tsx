import { useState } from "react";
import { CheckCircle2, HardDrive, Images, ImagePlus, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { GRAPHIC_CATEGORIES } from "@/data/graphic-design";
import { VIDEO_CATEGORIES } from "@/data/video-editing";
import { formatBytes, type AdminProject, type AdminStats, type StorageStatus } from "@/admin/api";
import { CATEGORY_OPTIONS } from "@/admin/categories";
import { UploadPanel } from "@/admin/UploadPanels";
import { ManagePanel } from "@/admin/ManageProjects";
import { Panel, StatCard } from "@/admin/ui";

type Tab = "upload-graphics" | "upload-videos" | "manage-graphics" | "manage-videos" | "categories" | "storage";

const TABS: { id: Tab; label: string; icon: typeof ImagePlus }[] = [
  { id: "upload-graphics", label: "Upload graphics", icon: ImagePlus },
  { id: "upload-videos", label: "Upload videos", icon: Video },
  { id: "manage-graphics", label: "Manage graphics", icon: Images },
  { id: "manage-videos", label: "Manage videos", icon: Video },
  { id: "categories", label: "Categories", icon: Images },
  { id: "storage", label: "Storage", icon: HardDrive },
];

export function PortfolioPanel({
  projects,
  stats,
  status,
  onChanged,
  onRefreshStatus,
}: {
  projects: AdminProject[];
  stats: AdminStats | null;
  status: StorageStatus | null;
  onChanged: () => void;
  onRefreshStatus: () => void;
}) {
  const [tab, setTab] = useState<Tab>("manage-graphics");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] transition-all",
              tab === item.id
                ? "border-white/25 bg-white/10 text-white"
                : "border-white/10 bg-white/[0.02] text-white/45 hover:border-white/20 hover:text-white"
            )}
          >
            <item.icon className="h-3 w-3" />
            {item.label}
          </button>
        ))}
      </div>

      {tab === "upload-graphics" && (
        <UploadPanel kind="graphic" categories={CATEGORY_OPTIONS.graphic} onUploaded={() => { onChanged(); onRefreshStatus(); }} />
      )}
      {tab === "upload-videos" && (
        <UploadPanel kind="video" categories={CATEGORY_OPTIONS.video} onUploaded={() => { onChanged(); onRefreshStatus(); }} />
      )}
      {tab === "manage-graphics" && (
        <ManagePanel
          kind="graphic"
          projects={projects.filter((project) => project.kind === "graphic")}
          onChanged={() => { onChanged(); onRefreshStatus(); }}
        />
      )}
      {tab === "manage-videos" && (
        <ManagePanel
          kind="video"
          projects={projects.filter((project) => project.kind === "video")}
          onChanged={() => { onChanged(); onRefreshStatus(); }}
        />
      )}
      {tab === "categories" && <CategoriesPanel projects={projects} />}
      {tab === "storage" && <StoragePanel status={status} stats={stats} />}
    </div>
  );
}

function CategoriesPanel({ projects }: { projects: AdminProject[] }) {
  const groups = [
    { kind: "graphic" as const, title: "Graphic design section", options: CATEGORY_OPTIONS.graphic, manual: GRAPHIC_CATEGORIES },
    { kind: "video" as const, title: "Video editing section", options: CATEGORY_OPTIONS.video, manual: VIDEO_CATEGORIES },
  ];

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <Panel key={group.kind} title={group.title} hint="Published uploads appear alongside the hand-built projects">
          <ul className="divide-y divide-white/[0.06]">
            {group.options.map((option) => {
              const uploaded = projects.filter((p) => p.kind === group.kind && p.category === option.id);
              const manual = group.manual.find((category) => category.id === option.id)?.count ?? 0;
              return (
                <li key={option.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-[12px] text-white/80">{option.label}</p>
                    <p className="mt-0.5 text-[9px] uppercase tracking-[0.14em] text-white/30">id · {option.id}</p>
                  </div>
                  <div className="flex items-center gap-4 text-[9px] uppercase tracking-[0.14em]">
                    <span className="text-white/35">{manual} existing</span>
                    <span className="rounded-full border border-white/15 px-2 py-0.5 text-white/70">
                      {uploaded.length} uploaded
                    </span>
                    <span className="text-emerald-200/80">
                      {uploaded.filter((project) => project.status === "published").length} live
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      ))}
      <p className="text-[11px] leading-6 text-white/35">
        Nothing is replaced or reordered. Uploads are listed inside the matching public category.
      </p>
    </div>
  );
}

function StoragePanel({ status, stats }: { status: StorageStatus | null; stats: AdminStats | null }) {
  if (!status) {
    return <p className="text-sm text-white/50">Loading storage status…</p>;
  }

  const rows = [
    {
      label: "Admin credentials",
      ok: status.configured,
      detail: status.configured
        ? `Configured for ${status.email ?? "admin"}`
        : "Set ADMIN_EMAIL and ADMIN_PASSWORD_HASH secrets",
    },
    { label: "Database (D1)", ok: status.database.ok, detail: status.database.ok ? "Connected" : "Unavailable" },
    {
      label: "Object storage (R2)",
      ok: status.storage.ok,
      detail: status.storage.ok ? `${status.storage.objects} objects stored` : "Bucket unavailable",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Stored assets" value={stats?.counts.assets ?? 0} />
        <StatCard label="Storage used" value={formatBytes(status.storage.bytes)} />
        <StatCard label="Live projects" value={stats?.counts.published ?? 0} accent="emerald" />
      </div>

      <Panel title="Upload status">
        <ul className="divide-y divide-white/[0.06]">
          {rows.map((row) => (
            <li key={row.label} className="flex items-start justify-between gap-4 py-2.5">
              <div>
                <p className="text-[12px] text-white/80">{row.label}</p>
                <p className="mt-0.5 text-[11px] text-white/40">{row.detail}</p>
              </div>
              <span
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em]",
                  row.ok
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                    : "border-amber-400/30 bg-amber-400/10 text-amber-200"
                )}
              >
                {row.ok ? <CheckCircle2 className="h-3 w-3" /> : <HardDrive className="h-3 w-3" />}
                {row.ok ? "OK" : "Setup needed"}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Upload limits">
        <ul className="grid gap-2 text-[11px] text-white/50 sm:grid-cols-2">
          <li>Images · {formatBytes(status.limits.imageBytes)} · JPG, PNG, WebP, GIF</li>
          <li>Videos · {formatBytes(status.limits.videoBytes)} · MP4, WebM, MOV</li>
          <li>Thumbnails · {formatBytes(status.limits.thumbnailBytes)} · JPG, PNG, WebP, GIF</li>
          <li>Duplicates are rejected by file fingerprint.</li>
        </ul>
      </Panel>
    </div>
  );
}

