/**
 * Job processor — runs a single job to completion. Used by:
 *   • the Cloudflare Queue consumer (server/queue-consumer.server.ts)
 *   • the manual /api/jobs/drain endpoint
 *
 * Each branch updates the project status and, on success, persists
 * artifacts to R2 under t/<tenant>/p/<project>/.
 */
import { withTenant } from "../db/tenant.server";
import { normalizeProjectUrl } from "../projects/url.server";
import { verifyOwnership } from "../projects/verify.server";
import { analyzeAndExtract } from "../projects/analyze.server";
import { putObject } from "../storage/r2.server";
import { markJobFailed, markJobSucceeded, type JobKind } from "./queue.server";

type JobRow = {
  id: string;
  tenant_id: string;
  project_id: string;
  kind: JobKind;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
};

export async function processJob(job: JobRow): Promise<void> {
  try {
    switch (job.kind) {
      case "verify":
        await runVerify(job);
        break;
      case "analyze":
      case "generate_schema":
        await runAnalyze(job);
        break;
      case "import":
        // import is driven by the explicit /import API; mark succeeded
        break;
      case "full_pipeline":
        await runVerify(job);
        await runAnalyze(job);
        break;
      default:
        throw new Error(`unknown_kind:${job.kind}`);
    }
    await markJobSucceeded(job.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    const dead = job.attempts >= job.max_attempts;
    await markJobFailed(job.id, msg, dead);
    if (dead) {
      await withTenant(job.tenant_id, (sql) => sql`
        UPDATE projects SET status = 'failed', error_message = ${msg}
        WHERE tenant_id = ${job.tenant_id} AND id = ${job.project_id}
      `);
    }
    throw err; // let the queue consumer record the retry too
  }
}

async function runVerify(job: JobRow) {
  const rows = await withTenant<{ site_url: string; verification_token: string }>(
    job.tenant_id,
    (sql) => sql`
      SELECT site_url, verification_token FROM projects
      WHERE tenant_id = ${job.tenant_id} AND id = ${job.project_id} LIMIT 1
    `,
  );
  if (!rows[0]) throw new Error("project_missing");
  const site = normalizeProjectUrl(rows[0].site_url);
  const result = await verifyOwnership(site, rows[0].verification_token);
  if (!result.ok) throw new Error("verification_failed");
  await withTenant(job.tenant_id, (sql) => sql`
    UPDATE projects
    SET status = 'verified', verification_method = ${result.method}, verified_at = now(), error_message = NULL
    WHERE tenant_id = ${job.tenant_id} AND id = ${job.project_id}
  `);
}

async function runAnalyze(job: JobRow) {
  const rows = await withTenant<{ site_url: string; verified_at: string | null }>(
    job.tenant_id,
    (sql) => sql`
      SELECT site_url, verified_at FROM projects
      WHERE tenant_id = ${job.tenant_id} AND id = ${job.project_id} LIMIT 1
    `,
  );
  if (!rows[0]) throw new Error("project_missing");
  if (!rows[0].verified_at) throw new Error("not_verified");
  const site = normalizeProjectUrl(rows[0].site_url);
  const { analysis, schema } = await analyzeAndExtract(site);

  // Persist artifacts to R2 (best-effort; in local dev R2 may be unbound).
  try {
    const a = await putObject(
      job.tenant_id,
      job.project_id,
      "analysis.json",
      JSON.stringify(analysis, null, 2),
      "application/json",
    );
    const s = await putObject(
      job.tenant_id,
      job.project_id,
      "schema.json",
      JSON.stringify(schema, null, 2),
      "application/json",
    );
    await withTenant(job.tenant_id, (sql) => sql`
      INSERT INTO project_files (tenant_id, project_id, r2_key, kind, size_bytes, mime_type)
      VALUES
        (${job.tenant_id}, ${job.project_id}, ${a.key}, 'analysis_json', ${a.size}, 'application/json'),
        (${job.tenant_id}, ${job.project_id}, ${s.key}, 'schema_json',   ${s.size}, 'application/json')
    `);
  } catch (err) {
    console.warn("r2_persist_skipped", err instanceof Error ? err.message : err);
  }

  await withTenant(job.tenant_id, (sql) => sql`
    UPDATE projects
    SET status = 'completed',
        stats_json  = ${JSON.stringify(analysis)}::jsonb,
        schema_json = ${JSON.stringify(schema)}::jsonb,
        error_message = NULL
    WHERE tenant_id = ${job.tenant_id} AND id = ${job.project_id}
  `);
}
