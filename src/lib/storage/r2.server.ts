/**
 * R2 helpers — every key is forced to live under
 *   t/<tenantId>/p/<projectId>/...
 * so a single typo can never leak files across tenants.
 */
import { getR2 } from "../cf-bindings.server";

const UUID_RE = /^[0-9a-f-]{36}$/i;

export function tenantPrefix(tenantId: string): string {
  if (!UUID_RE.test(tenantId)) throw new Error("tenant_uuid_invalid");
  return `t/${tenantId}/`;
}

export function projectPrefix(tenantId: string, projectId: string): string {
  if (!UUID_RE.test(tenantId) || !UUID_RE.test(projectId)) {
    throw new Error("uuid_invalid");
  }
  return `t/${tenantId}/p/${projectId}/`;
}

function assertOwnedKey(tenantId: string, projectId: string, key: string) {
  const expected = projectPrefix(tenantId, projectId);
  if (!key.startsWith(expected) || key.includes("..") || key.includes("//")) {
    throw new Error("r2_key_forbidden");
  }
}

export async function putObject(
  tenantId: string,
  projectId: string,
  relativePath: string,
  body: ArrayBuffer | string,
  contentType?: string,
): Promise<{ key: string; size: number }> {
  const safeRel = relativePath.replace(/^\/+/, "");
  const key = projectPrefix(tenantId, projectId) + safeRel;
  assertOwnedKey(tenantId, projectId, key);
  const r2 = await getR2();
  await r2.put(key, body, contentType ? { httpMetadata: { contentType } } : undefined);
  const size = typeof body === "string" ? new TextEncoder().encode(body).byteLength : body.byteLength;
  return { key, size };
}

export async function getObject(tenantId: string, projectId: string, key: string) {
  assertOwnedKey(tenantId, projectId, key);
  const r2 = await getR2();
  return r2.get(key);
}

export async function deleteObject(tenantId: string, projectId: string, key: string) {
  assertOwnedKey(tenantId, projectId, key);
  const r2 = await getR2();
  await r2.delete(key);
}

export async function listProjectObjects(tenantId: string, projectId: string, limit = 100) {
  const r2 = await getR2();
  return r2.list({ prefix: projectPrefix(tenantId, projectId), limit });
}
