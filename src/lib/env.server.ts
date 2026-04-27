/**
 * Server-only environment validation.
 * Never import from client code. All five vars are mandatory.
 */

export type ServerEnv = {
  HN_DB_URL: string;
  HN_DB_DIRECT_URL: string;
  HN_JWT_SECRET: string;
  RESEND_API_KEY: string;
  HN_MAIL_FROM: string;
};

export type EnvCheck =
  | { ok: true; env: ServerEnv }
  | { ok: false; missing: string[]; invalid: string[] };

const REQUIRED_KEYS = [
  "HN_DB_URL",
  "HN_DB_DIRECT_URL",
  "HN_JWT_SECRET",
  "RESEND_API_KEY",
  "HN_MAIL_FROM",
] as const;

export function checkEnv(): EnvCheck {
  const missing: string[] = [];
  const invalid: string[] = [];
  const collected: Record<string, string> = {};

  for (const key of REQUIRED_KEYS) {
    const v = process.env[key];
    if (!v || v.trim().length === 0) {
      missing.push(key);
      continue;
    }
    collected[key] = v.trim();
  }

  if (collected.HN_DB_URL && !/^postgres(ql)?:\/\//.test(collected.HN_DB_URL)) {
    invalid.push("HN_DB_URL");
  }
  if (
    collected.HN_DB_DIRECT_URL &&
    !/^postgres(ql)?:\/\//.test(collected.HN_DB_DIRECT_URL)
  ) {
    invalid.push("HN_DB_DIRECT_URL");
  }
  if (collected.HN_JWT_SECRET && collected.HN_JWT_SECRET.length < 32) {
    invalid.push("HN_JWT_SECRET");
  }
  if (
    collected.HN_MAIL_FROM &&
    !/.+@.+\..+/.test(collected.HN_MAIL_FROM)
  ) {
    invalid.push("HN_MAIL_FROM");
  }

  if (missing.length || invalid.length) {
    return { ok: false, missing, invalid };
  }
  return { ok: true, env: collected as ServerEnv };
}

/**
 * Throws if env is incomplete. Use inside server functions/routes that
 * absolutely require valid configuration.
 */
export function requireEnv(): ServerEnv {
  const r = checkEnv();
  if (!r.ok) {
    const parts: string[] = [];
    if (r.missing.length) parts.push(`missing=${r.missing.join(",")}`);
    if (r.invalid.length) parts.push(`invalid=${r.invalid.join(",")}`);
    throw new Error(`env_misconfigured: ${parts.join(" ")}`);
  }
  return r.env;
}
