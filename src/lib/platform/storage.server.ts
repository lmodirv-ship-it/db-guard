import { getR2 } from "@/lib/cf-bindings.server";

const UUID_RE = /^[0-9a-f-]{36}$/i;
const HOST_RE = /^[a-z0-9.-]+$/i;

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "file";
}

export function workspacePrefix(workspaceId: string) {
  if (!UUID_RE.test(workspaceId)) throw new Error("workspace_uuid_invalid");
  return `w/${workspaceId}/`;
}

export function sitePrefix(workspaceId: string, siteHost?: string | null) {
  if (siteHost) {
    if (!HOST_RE.test(siteHost)) throw new Error("site_host_invalid");
    return `${workspacePrefix(workspaceId)}sites/${siteHost}/`;
  }
  return `${workspacePrefix(workspaceId)}common/`;
}

export function buildObjectKey(workspaceId: string, fileName: string, siteHost?: string | null) {
  const stamp = Date.now();
  return `${sitePrefix(workspaceId, siteHost)}${stamp}-${cleanFileName(fileName)}`;
}

export async function putStorageObject(key: string, body: ArrayBuffer, contentType?: string) {
  const r2 = await getR2();
  await r2.put(key, body, contentType ? { httpMetadata: { contentType } } : undefined);
}

export async function getStorageObject(key: string) {
  const r2 = await getR2();
  return r2.get(key);
}

export async function removeStorageObject(key: string) {
  const r2 = await getR2();
  await r2.delete(key);
}
