import { describe, expect, it } from 'vitest'

import { parseEnv } from './env'

describe('parseEnv', () => {
  it('returns typed, trimmed values when everything is set', () => {
    const env = parseEnv({
      MONGODB_URI: ' mongodb://127.0.0.1:27017/test ',
      PAYLOAD_SECRET: 'secret',
    })

    expect(env).toEqual({
      databaseUrl: 'mongodb://127.0.0.1:27017/test',
      payloadSecret: 'secret',
      siteUrl: 'http://localhost:3000',
    })
  })

  it('uses SITE_URL when set and strips trailing slashes', () => {
    const env = parseEnv({
      MONGODB_URI: 'mongodb://x',
      PAYLOAD_SECRET: 'secret',
      SITE_URL: ' https://shop.example.com// ',
    })

    expect(env.siteUrl).toBe('https://shop.example.com')
  })

  it('lists every missing variable in the error', () => {
    expect(() => parseEnv({})).toThrowError(/MONGODB_URI, PAYLOAD_SECRET/)
  })

  it('treats blank values as missing', () => {
    expect(() => parseEnv({ MONGODB_URI: 'mongodb://x', PAYLOAD_SECRET: '   ' })).toThrowError(
      /PAYLOAD_SECRET/,
    )
  })
})
