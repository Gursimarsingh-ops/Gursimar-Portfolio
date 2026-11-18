/**
 * Cloudflare Pages Functions entry point for every /api/* request.
 *
 * The Pages project (gursimar-portfolio.pages.dev) deploys this file together
 * with the static build, so the public site, the admin dashboard and the
 * security vault all talk to the same Worker code and the same D1/R2 bindings
 * as `npm run dev:api` does on localhost. There is no second API origin.
 */
import { handleBackendRequest, type Env } from "../../worker/index";

export const onRequest: PagesFunction<Env> = (context) =>
  handleBackendRequest(context.request, context.env);
