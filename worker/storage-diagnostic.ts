import {
  b2Config,
  deleteObject,
  headObject,
  listObjects,
  putObject,
  readObjectBytes,
  StorageError,
  storageProvider,
} from "./storage";

/**
 * Admin-only Backblaze B2 diagnostic.
 *
 * Runs each S3 operation the portfolio actually depends on and reports them
 * individually, with the provider's status and error code, instead of one
 * generic 403. It only ever touches one temporary object under `diagnostics/`
 * and deletes it again; no portfolio media is read or modified.
 */

type StepStatus = "ok" | "warn" | "fail";

interface DiagnosticStep {
  id: string;
  label: string;
  status: StepStatus;
  detail: string;
  latencyMs: number;
  httpStatus: number | null;
  code: string | null;
  capability: string;
}

function step(
  id: string,
  label: string,
  capability: string,
  started: number,
  result: { ok: boolean; warn?: boolean; detail: string; httpStatus?: number | null; code?: string | null }
): DiagnosticStep {
  return {
    id,
    label,
    capability,
    status: result.ok ? (result.warn ? "warn" : "ok") : "fail",
    detail: result.detail,
    latencyMs: Date.now() - started,
    httpStatus: result.httpStatus ?? null,
    code: result.code ?? null,
  };
}

function describe(error: unknown): { detail: string; httpStatus: number | null; code: string | null } {
  if (error instanceof StorageError) {
    return {
      detail: error.message,
      httpStatus: error.status,
      code: (error as StorageError & { code?: string | null }).code ?? null,
    };
  }
  return {
    detail: error instanceof Error ? error.message.slice(0, 240) : "Unknown storage error",
    httpStatus: null,
    code: null,
  };
}

export async function runStorageDiagnostic(env: {
  B2_APPLICATION_KEY_ID?: string;
  B2_APPLICATION_KEY?: string;
  B2_BUCKET_NAME?: string;
  B2_REGION?: string;
  B2_ENDPOINT?: string;
}): Promise<Response> {
  const steps: DiagnosticStep[] = [];
  const config = b2Config(env);

  // 1. Credentials present (never their values).
  steps.push(
    step("credentials", "Credential presence", "configuration", Date.now(), {
      ok: Boolean(config),
      detail: config
        ? "B2_APPLICATION_KEY_ID and B2_APPLICATION_KEY are present server-side."
        : "B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME or B2_ENDPOINT is missing on this deployment.",
    })
  );

  if (!config) {
    return Response.json(
      {
        configured: false,
        provider: storageProvider(env),
        steps,
        summary: { ok: false, failed: 1, label: "Storage is not configured" },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  // 2. Endpoint / region / bucket consistency.
  const endpointStart = Date.now();
  let endpointOk = true;
  let endpointWarn = false;
  let endpointDetail = `Endpoint ${config.endpoint} · region ${config.region} · bucket ${config.bucket}`;
  try {
    const url = new URL(config.endpoint);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:") {
      endpointOk = false;
      endpointDetail = "The endpoint must use https:// for SigV4 requests.";
    } else if (!/^s3\.[a-z0-9-]+\.backblazeb2\.com$/.test(host)) {
      endpointOk = false;
      endpointDetail = `Unexpected endpoint host "${host}". Backblaze B2 endpoints look like s3.<region>.backblazeb2.com.`;
    } else {
      const regionFromHost = host.split(".")[1];
      if (regionFromHost !== config.region) {
        endpointWarn = true;
        endpointDetail = `Region "${config.region}" does not match the endpoint host (${regionFromHost}); signatures will be rejected.`;
      }
    }
    if (config.bucket !== "gursimar-portfolio" && endpointOk) {
      endpointWarn = true;
      endpointDetail += ` · bucket name is "${config.bucket}"`;
    }
  } catch {
    endpointOk = false;
    endpointDetail = "B2_ENDPOINT is not a valid URL.";
  }
  steps.push(
    step("endpoint", "Endpoint, region and bucket", "configuration", endpointStart, {
      ok: endpointOk,
      warn: endpointWarn,
      detail: endpointDetail,
    })
  );

  // 3. List the bucket (proves the key can reach the bucket at all).
  const listStart = Date.now();
  try {
    const result = await listObjects(env, { limit: 1 });
    steps.push(
      step("list", "Bucket listing", "listFiles", listStart, {
        ok: true,
        detail: `Bucket "${config.bucket}" is readable (first page returned ${result.objects.length} object${
          result.objects.length === 1 ? "" : "s"
        }).`,
      })
    );
  } catch (error) {
    const info = describe(error);
    steps.push(
      step("list", "Bucket listing", "listFiles", listStart, { ok: false, ...info })
    );
  }

  // 4-8. Real write → metadata → download → delete on one temporary object.
  const probeKey = `diagnostics/probe-${crypto.randomUUID()}.txt`;
  const body = new TextEncoder().encode(`b2 diagnostic ${new Date().toISOString()}`).buffer as ArrayBuffer;

  const uploadStart = Date.now();
  let uploaded = false;
  try {
    await putObject(env, probeKey, body, { contentType: "text/plain", originalName: "diagnostic.txt" });
    uploaded = true;
    steps.push(
      step("upload", "Test upload", "writeFiles", uploadStart, {
        ok: true,
        detail: `Wrote ${body.byteLength} bytes to ${probeKey}.`,
      })
    );
  } catch (error) {
    const info = describe(error);
    steps.push(step("upload", "Test upload", "writeFiles", uploadStart, { ok: false, ...info }));
  }

  if (uploaded) {
    const metaStart = Date.now();
    try {
      const head = await headObject(env, probeKey);
      steps.push(
        step("metadata", "Metadata read", "readFiles", metaStart, {
          ok: Boolean(head),
          detail: head
            ? `Metadata read via GET: ${head.contentType ?? "unknown type"}, ${head.size} bytes.`
            : "The object was written but its metadata could not be read.",
        })
      );
    } catch (error) {
      const info = describe(error);
      steps.push(step("metadata", "Metadata read", "readFiles", metaStart, { ok: false, ...info }));
    }

    const downloadStart = Date.now();
    try {
      const bytes = await readObjectBytes(env, probeKey);
      const text = bytes ? new TextDecoder().decode(bytes) : "";
      const matches = text === new TextDecoder().decode(body);
      steps.push(
        step("download", "Test download", "readFiles", downloadStart, {
          ok: Boolean(bytes) && matches,
          detail: bytes
            ? matches
              ? `Downloaded ${bytes.byteLength} bytes and the content matched the upload.`
              : "Downloaded the object but the content did not match."
            : "The object could not be downloaded.",
        })
      );
    } catch (error) {
      const info = describe(error);
      steps.push(step("download", "Test download", "readFiles", downloadStart, { ok: false, ...info }));
    }

    const deleteStart = Date.now();
    try {
      await deleteObject(env, [probeKey]);
      steps.push(
        step("delete", "Delete test object", "deleteFiles", deleteStart, {
          ok: true,
          detail: "The temporary object was deleted.",
        })
      );
    } catch (error) {
      const info = describe(error);
      steps.push(step("delete", "Delete test object", "deleteFiles", deleteStart, { ok: false, ...info }));
    }

    const verifyStart = Date.now();
    try {
      const remaining = await headObject(env, probeKey);
      steps.push(
        step("verifyDelete", "Confirm deletion", "deleteFiles", verifyStart, {
          ok: remaining === null,
          detail: remaining === null ? "The object is gone from the bucket." : "The object still exists after deletion.",
        })
      );
    } catch (error) {
      const info = describe(error);
      steps.push(step("verifyDelete", "Confirm deletion", "deleteFiles", verifyStart, { ok: false, ...info }));
    }
  }

  const failed = steps.filter((entry) => entry.status === "fail").length;
  return Response.json(
    {
      configured: true,
      provider: storageProvider(env),
      endpoint: config.endpoint,
      bucket: config.bucket,
      region: config.region,
      checkedAt: new Date().toISOString(),
      steps,
      summary: {
        ok: failed === 0,
        failed,
        label:
          failed === 0
            ? "Backblaze B2 is working: upload, metadata, download and delete verified"
            : `${failed} storage check${failed === 1 ? "" : "s"} failed`,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
