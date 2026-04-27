/**
 * Job handler dispatcher. Each kind delegates to the existing pipeline
 * functions. All DB writes go through withTenant — RLS enforced.
 */
import type { Job, JobHandler } from "./queue.server";
import { withTenant } from "../db/tenant.server";
import { normalizeProjectUrl } from "../projects/url.server";
import { verifyOwnership } from "../projects/verify.server";
import { analyzeAndExtract } from "../projects/analyze.server";

async function loadProject(tenantId: string, projectId: string) {
  const rows = await withTenant<{
    id: string;
    site_url: string;
    verification_token: string;
    verified_at: string | null;
  }>(tenantId, (sql) => sql`
    SELECT id, site_url, verification_token, verified_at
      FROM projects
     WHERE tenant_id = ${tenantId} AND id = ${projectId}
     LIMIT 1
  `);
  if (rows.length === 0) throw new Error("project_not_found");
  return rows[0];
}

async function handleVerify(job: Job) {
  const p = await loadProject(job.tenant_id, job.project_id);
  const site = normalizeProjectUrl(p.site_url);
  await withTenant(job.tenant_id, (sql) => sql`
    UPDATE projects SET status = 'verifying'
     WHERE tenant_id = ${job.tenant_id} AND id = ${job.project_id}
  `);
  const result = await verifyOwnership(site, p.verification_token);
  if (!result.ok) {
    const reason = result.attempts.map((a) => `${a.method}:${a.reason}`).join(" | ");
    await withTenant(job.tenant_id, (sql) => sql`
      UPDATE projects
         SET status = 'pending', error_message = ${reason}
       WHERE tenant_id = ${job.tenant_id} AND id = ${job.project_id}
    `);
    throw new Error(`verification_failed: ${reason}`);
  }
  await withTenant(job.tenant_id, (sql) => sql`
    UPDATE projects
       SET status = 'verified',
           verification_method = ${result.method},
           verified_at = now(),
           error_message = NULL
     WHERE tenant_id = ${job.tenant_id} AND id = ${job.project_id}
  `);
}

async function handleAnalyze(job: Job) {
  const p = await loadProject(job.tenant_id, job.project_id);
  if (!p.verified_at) throw new Error("not_verified");
  const site = normalizeProjectUrl(p.site_url);
  await withTenant(job.tenant_id, (sql) => sql`
    UPDATE projects SET status = 'analyzing'
     WHERE tenant_id = ${job.tenant_id} AND id = ${job.project_id}
  `);
  const { analysis, schema } = await analyzeAndExtract(site);
  await withTenant(job.tenant_id, (sql) => sql`
    UPDATE projects
       SET status = 'completed',
           stats_json = ${JSON.stringify(analysis)}::jsonb,
           schema_json = ${JSON.stringify(schema)}::jsonb,
           error_message = NULL
     WHERE tenant_id = ${job.tenant_id} AND id = ${job.project_id}
  `);
}

async function handleFullPipeline(job: Job) {
  await handleVerify(job);
  await handleAnalyze(job);
}

export const dispatch: JobHandler = async (job) => {
  switch (job.kind) {
    case "verify":
      return handleVerify(job);
    case "analyze":
    case "generate_schema":
      return handleAnalyze(job);
    case "full_pipeline":
      return handleFullPipeline(job);
    case "import":
      // import is currently a synchronous endpoint; placeholder for
      // background-bulk-import support.
      return;
    default:
      throw new Error(`unknown_kind:${job.kind}`);
  }
};
