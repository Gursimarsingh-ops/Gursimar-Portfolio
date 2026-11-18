import { StudioScene } from "./scene/StudioScene";
import { useArtistPhoto } from "@/lib/portfolio";

export interface ArtistSceneProps {
  /**
   * Explicit portrait override (URL or asset path). When omitted, the scene
   * uses the photo saved from Security → Artist Profile Management.
   */
  portraitSrc?: string;
}

export function ArtistScene({ portraitSrc }: ArtistSceneProps) {
  const saved = useArtistPhoto();
  const source = portraitSrc ?? saved.url ?? undefined;

  return (
    <section id="studio" className="relative scroll-mt-24 overflow-hidden border-t border-neutral-200 bg-white py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,#f2f2f3_0%,transparent_78%)]" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-500">Studio</p>
          <h2 className="mt-3 font-serif text-4xl font-black tracking-tight text-neutral-950 md:text-6xl">
            THE ARTIST
          </h2>
          <span className="mx-auto mt-6 block h-px w-24 bg-gradient-to-r from-transparent via-neutral-900 to-transparent" />
        </div>

        <div className="relative mt-12 overflow-hidden rounded-[26px] border border-neutral-900/15 bg-neutral-950 shadow-[0_50px_110px_-55px_rgba(0,0,0,0.75)]">
          {/* deep studio atmosphere */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_-10%,#252a33_0%,#0d1015_46%,#05060a_100%)]" />

          {/* cinematic key and rim beams */}
          <div
            className="pointer-events-none absolute -top-32 left-1/2 h-[26rem] w-[42rem] -translate-x-1/2 bg-[conic-gradient(from_180deg_at_50%_0%,transparent_0deg,rgba(255,255,255,0.16)_14deg,transparent_30deg,transparent_330deg,rgba(255,255,255,0.1)_346deg,transparent_360deg)] blur-2xl"
            style={{ animation: "studio-breathe 12s ease-in-out infinite" }}
          />
          <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-sky-200/[0.08] blur-[100px]" />
          <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-amber-200/[0.06] blur-[110px]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent" />

          {/* drifting dust motes */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {[
              { left: "16%", top: "30%", delay: "0s", size: 2 },
              { left: "28%", top: "62%", delay: "2.4s", size: 1.5 },
              { left: "46%", top: "22%", delay: "4.1s", size: 2 },
              { left: "63%", top: "54%", delay: "1.2s", size: 1.5 },
              { left: "78%", top: "34%", delay: "3.3s", size: 2 },
              { left: "88%", top: "68%", delay: "5.2s", size: 1.5 },
            ].map((mote, i) => (
              <span
                key={i}
                className="absolute rounded-full bg-white/50"
                style={{
                  left: mote.left,
                  top: mote.top,
                  width: mote.size,
                  height: mote.size,
                  animation: `mote-drift ${9 + i}s ease-in-out ${mote.delay} infinite`,
                }}
              />
            ))}
          </div>

          {/* film grain and vignette */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(rgba(255,255,255,0.9)_0.5px,transparent_0.5px)] [background-size:3px_3px]" />
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_120px_40px_rgba(0,0,0,0.55)]" />

          <div className="relative">
            <StudioScene
              portraitSrc={source}
              className="h-[340px] w-full min-[420px]:h-[400px] sm:h-[520px] lg:h-[620px]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
