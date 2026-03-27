import { describe, expect, it } from 'bun:test'
import { isAuthCallbackUrl } from './auth-callback'

describe('isAuthCallbackUrl', () => {
  it('matches the legacy nora:auth callback format', () => {
    expect(isAuthCallbackUrl('nora:auth?t=token')).toBe(true)
  })

  it('ignores non-auth nora deep links', () => {
    expect(isAuthCallbackUrl('nora://settings')).toBe(false)
  })

  it('ignores normal web urls', () => {
    expect(isAuthCallbackUrl('https://nora.inks.page/auth/app')).toBe(false)
  })
})
