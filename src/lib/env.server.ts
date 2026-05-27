/**
 * Server-only environment validation.
 * Never import from client code.
 */

export type ServerEnv = {
  HN_DB_URL: string;
  HN_DB_DIRECT_URL: string;
  HN_JWT_SECRET: string;
  RESEND_API_KEY?: string;
  HN_MAIL_FROM?: string;
};

export type EnvCheck =
  | { ok: true; env: ServerEnv }
  | { ok: false; missing: string[]; invalid: string[] };

const REQUIRED_KEYS = ["HN_DB_DIRECT_URL", "HN_JWT_SECRET"] as const;

function isPostgresUrl(value: string | undefined): value is string {
  return !!value && /^postgres(ql)?:\/\//.test(value);
}

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

  const runtimeDbUrl = process.env.HN_DB_URL?.trim();
  if (runtimeDbUrl) collected.HN_DB_URL = runtimeDbUrl;
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) collected.RESEND_API_KEY = resendKey;
  const mailFrom = process.env.HN_MAIL_FROM?.trim();
  if (mailFrom) collected.HN_MAIL_FROM = mailFrom;

  if (collected.HN_DB_DIRECT_URL && !isPostgresUrl(collected.HN_DB_DIRECT_URL)) {
    invalid.push("HN_DB_DIRECT_URL");
  }
  if (runtimeDbUrl && !isPostgresUrl(runtimeDbUrl) && !isPostgresUrl(collected.HN_DB_DIRECT_URL)) {
    invalid.push("HN_DB_URL");
  }
  if (collected.HN_JWT_SECRET && collected.HN_JWT_SECRET.length < 32) {
    invalid.push("HN_JWT_SECRET");
  }
  if (collected.HN_MAIL_FROM && !/.+@.+\..+/.test(collected.HN_MAIL_FROM)) {
    invalid.push("HN_MAIL_FROM");
  }

  if (missing.length || invalid.length) {
    return { ok: false, missing, invalid };
  }
  return {
    ok: true,
    env: {
      ...(collected as Omit<ServerEnv, "HN_DB_URL">),
      HN_DB_URL: isPostgresUrl(runtimeDbUrl) ? runtimeDbUrl : collected.HN_DB_DIRECT_URL,
    },
  };
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
