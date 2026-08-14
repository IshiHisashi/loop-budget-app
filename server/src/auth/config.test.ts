import { afterEach, describe, expect, it } from 'vitest'
import { getJwtSecret, getClientOrigin } from './config.js'

afterEach(() => {
  delete process.env.AUTH_JWT_SECRET
  delete process.env.CLIENT_ORIGIN
})

describe('getJwtSecret', () => {
  it('throws an error mentioning .env.example when AUTH_JWT_SECRET is unset', () => {
    delete process.env.AUTH_JWT_SECRET

    expect(() => getJwtSecret()).toThrow('server/.env.example')
  })
})

describe('getClientOrigin', () => {
  it('throws an error mentioning .env.example when CLIENT_ORIGIN is unset', () => {
    delete process.env.CLIENT_ORIGIN

    expect(() => getClientOrigin()).toThrow('server/.env.example')
  })
})
