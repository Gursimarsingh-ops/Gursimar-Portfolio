/**
 * Cloudflare Pages Functions entry point for public media (/media/<r2 key>).
 *
 * Images, videos, thumbnails and the artist portrait are streamed from the R2
 * bucket, so an upload made in the dashboard is served by the live site
 * straight away — nothing is copied into the static build.
 */
import { handleBackendRequest, type Env } from "../../worker/index";

export const onRequest: PagesFunction<Env> = (context) =>
  handleBackendRequest(context.request, context.env);
