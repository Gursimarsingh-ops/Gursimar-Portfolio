import { useEffect, useState } from "react";
import type { ThumbStyle, VideoStyle } from "@/lib/video";

export interface PublicProject {
  id: string;
  kind: "graphic" | "video";
  title: string;
  description: string;
  category: string;
  mediaUrl: string;
  thumbUrl: string | null;
  /** Present for externally hosted videos. */
  sourceUrl?: string | null;
  thumbStyle?: ThumbStyle | null;
  videoStyle?: VideoStyle | null;
  tags?: string[];
  /** commission | recreation | non-commission | sample. */
  classification?: string | null;
  /** Display preset label only; playback quality stays with the source. */
  resolution?: string | null;
  ratio?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  createdAt: string;
}

let cache: PublicProject[] | null = null;
let inflight: Promise<PublicProject[]> | null = null;
const UPDATE_EVENT = "portfolio:updated";

async function load(): Promise<PublicProject[]> {
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const response = await fetch("/api/projects", { headers: { Accept: "application/json" } });
      if (!response.ok) return [];
      const data = (await response.json()) as { projects?: PublicProject[] };
      cache = Array.isArray(data.projects) ? data.projects : [];
      return cache;
    } catch {
      // The static site still works when the API is not deployed.
      return [];
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** Drops the cache after admin changes so the public sections refetch. */
export function invalidatePublishedProjects(): void {
  cache = null;
  window.dispatchEvent(new Event(UPDATE_EVENT));
}

let artistCache: { url: string | null; updatedAt: string | null } | null = null;
let artistInflight: Promise<{ url: string | null; updatedAt: string | null }> | null = null;
const ARTIST_EVENT = "artist:updated";

async function loadArtistPhoto(): Promise<{ url: string | null; updatedAt: string | null }> {
  if (artistCache) return artistCache;
  if (artistInflight) return artistInflight;

  artistInflight = (async () => {
    try {
      const response = await fetch("/api/artist", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return { url: null, updatedAt: null };
      const data = (await response.json()) as { photoUrl?: string | null; updatedAt?: string | null };
      artistCache = {
        url: typeof data?.photoUrl === "string" && data.photoUrl ? data.photoUrl : null,
        updatedAt: data?.updatedAt ?? null,
      };
      return artistCache;
    } catch {
      return { url: null, updatedAt: null };
    } finally {
      artistInflight = null;
    }
  })();

  return artistInflight;
}

/** Drops the cached portrait so the Artist section refetches the active photo. */
export function invalidateArtistPhoto(): void {
  artistCache = null;
  window.dispatchEvent(new Event(ARTIST_EVENT));
}

/** The photo currently hanging in the public Artist portrait frame. */
export function useArtistPhoto() {
  const [state, setState] = useState<{ url: string | null; updatedAt: string | null }>(
    artistCache ?? { url: null, updatedAt: null }
  );

  useEffect(() => {
    let cancelled = false;

    loadArtistPhoto()
      .then((data) => {
        if (!cancelled) setState(data);
      })
      .catch(() => undefined);

    const onUpdate = () => {
      loadArtistPhoto()
        .then((data) => {
          if (!cancelled) setState(data);
        })
        .catch(() => undefined);
    };

    window.addEventListener(ARTIST_EVENT, onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener(ARTIST_EVENT, onUpdate);
    };
  }, []);

  return state;
}

export function usePublishedProjects() {
  const [projects, setProjects] = useState<PublicProject[]>(cache ?? []);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    let cancelled = false;

    load()
      .then((data) => {
        if (cancelled) return;
        setProjects(data);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    const onUpdate = () => {
      load()
        .then((data) => {
          if (!cancelled) setProjects(data);
        })
        .catch(() => undefined);
    };

    window.addEventListener(UPDATE_EVENT, onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener(UPDATE_EVENT, onUpdate);
    };
  }, []);

  return { projects, loading };
}
