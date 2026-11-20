export type Env = {
  /** MongoDB connection string. */
  databaseUrl: string
  /** Secret Payload uses to sign auth tokens. */
  payloadSecret: string
}

const REQUIRED_VARS = {
  databaseUrl: 'MONGODB_URI',
  payloadSecret: 'PAYLOAD_SECRET',
} as const satisfies Record<keyof Env, string>

type EnvSource = Record<string, string | undefined>

/**
 * Validates and normalises environment variables in one place so the app fails fast with a
 * readable message instead of surfacing an opaque connection or auth error later.
 *
 * Takes the source as an argument (rather than reading `process.env` directly) to keep it pure
 * and trivially testable.
 */
export function parseEnv(source: EnvSource): Env {
  const entries = Object.entries(REQUIRED_VARS) as [keyof Env, string][]

  const missing = entries.filter(([, name]) => !source[name]?.trim()).map(([, name]) => name)
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        'Copy .env.example to .env and fill them in.',
    )
  }

  return Object.fromEntries(entries.map(([key, name]) => [key, source[name]!.trim()])) as Env
}
