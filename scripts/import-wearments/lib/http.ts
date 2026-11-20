const USER_AGENT = 'Mozilla/5.0 (compatible; site-migration)'

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

class NonRetryableError extends Error {}

/** GET with exponential backoff on network errors, 429 and 5xx. Other 4xx fail immediately. */
export async function fetchWithRetry(url: string, attempts = 4): Promise<Response> {
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
      if (response.ok) return response

      const message = `HTTP ${response.status} for ${url}`
      if (response.status !== 429 && response.status < 500) throw new NonRetryableError(message)
      lastError = new Error(message)
    } catch (error) {
      if (error instanceof NonRetryableError) throw error
      lastError = error
    }

    if (attempt < attempts) await sleep(500 * 2 ** attempt)
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${url}`)
}

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetchWithRetry(url)
  return (await response.json()) as T
}

export async function fetchText(url: string): Promise<string> {
  const response = await fetchWithRetry(url)
  return response.text()
}

/** Runs `worker` over `items` with at most `limit` in flight, preserving result order. */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0

  async function run() {
    while (next < items.length) {
      const index = next++
      results[index] = await worker(items[index] as T, index)
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run))
  return results
}
