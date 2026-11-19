/**
 * Cloudflare Pages Functions entry point for public media (/media/<object key>).
 *
 * Images, videos, thumbnails and the artist portrait are streamed from the
 * private Backblaze B2 bucket by the Worker, so an upload made in the dashboard
 * is served by the live site straight away — nothing is copied into the static
 * build and Cloudflare R2 is not required.
 */
import { handleBackendRequest, type Env } from "../../worker/index";

export const onRequest: PagesFunction<Env> = (context) =>
  handleBackendRequest(context.request, context.env);
