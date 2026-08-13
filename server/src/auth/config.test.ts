import { afterEach, describe, expect, it } from 'vitest'
import { getAuthConfig, getClientOrigin } from './config.js'

afterEach(() => {
  delete process.env.AUTH_ID
  delete process.env.AUTH_PASSWORD_HASH
  delete process.env.AUTH_JWT_SECRET
  delete process.env.CLIENT_ORIGIN
})

describe('getAuthConfig', () => {
  it('throws an error mentioning .env.example when required env vars are unset', () => {
    delete process.env.AUTH_ID
    delete process.env.AUTH_PASSWORD_HASH
    delete process.env.AUTH_JWT_SECRET

    expect(() => getAuthConfig()).toThrow('server/.env.example')
  })
})

describe('getClientOrigin', () => {
  it('throws an error mentioning .env.example when CLIENT_ORIGIN is unset', () => {
    delete process.env.CLIENT_ORIGIN

    expect(() => getClientOrigin()).toThrow('server/.env.example')
  })
})
