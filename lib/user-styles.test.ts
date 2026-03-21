import { describe, expect, it } from 'bun:test'
import { getInjectedCss } from '../content/css'
import {
  createDefaultUserStylesSnapshot,
  getEnabledUserStyleCss,
  matchesAnyHostGlob,
  matchesHostGlob,
  normalizeUserStyles,
} from './user-styles'

describe('user style host matching', () => {
  it('matches exact hosts and wildcards', () => {
    expect(matchesHostGlob('x.com', 'x.com')).toBe(true)
    expect(matchesHostGlob('www.reddit.com', '*.reddit.com')).toBe(true)
    expect(matchesHostGlob('chat.reddit.com', '*.reddit.com')).toBe(true)
    expect(matchesHostGlob('reddit.com', '*.reddit.com')).toBe(false)
  })

  it('matches any glob in a style entry', () => {
    expect(matchesAnyHostGlob('m.facebook.com', ['x.com', '*.facebook.com'])).toBe(true)
    expect(matchesAnyHostGlob('x.com', ['*.facebook.com', 'reddit.com'])).toBe(false)
  })
})

describe('normalizeUserStyles', () => {
  it('fills builtin defaults and drops invalid custom styles', () => {
    const snapshot = normalizeUserStyles({
      builtins: {
        'hide-reddit-game': { enabled: false },
      } as any,
      customStyles: [
        {
          id: 'one',
          name: 'Reddit',
          enabled: true,
          hostGlobs: ['*.reddit.com'],
          css: 'body { color: red; }',
        },
        {
          id: 'two',
          name: '',
          enabled: true,
          hostGlobs: ['https://example.com'],
          css: 'body { color: blue; }',
        },
        {
          id: 'three',
          name: 'Empty CSS',
          enabled: true,
          hostGlobs: ['x.com'],
          css: '   ',
        },
      ],
    })

    expect(snapshot.builtins['hide-reddit-game'].enabled).toBe(false)
    expect(snapshot.builtins['hide-x-bottom-nav'].enabled).toBe(true)
    expect(snapshot.customStyles).toHaveLength(1)
    expect(snapshot.customStyles[0]).toMatchObject({
      id: 'one',
      name: 'Reddit',
      hostGlobs: ['*.reddit.com'],
    })
  })
})

describe('user style css composition', () => {
  it('includes builtin css only on matching hosts', () => {
    const snapshot = createDefaultUserStylesSnapshot()

    expect(getEnabledUserStyleCss('www.reddit.com', snapshot)).toContain("ssr-post-content-header")
    expect(getEnabledUserStyleCss('example.com', snapshot)).not.toContain("ssr-post-content-header")
  })

  it('appends matching custom css after builtin css', () => {
    const snapshot = normalizeUserStyles({
      customStyles: [
        {
          id: 'custom',
          name: 'Reddit custom',
          enabled: true,
          hostGlobs: ['*.reddit.com'],
          css: '.custom-rule { color: red; }',
        },
      ],
    })

    const css = getInjectedCss('www.reddit.com', {}, snapshot)
    expect(css).toContain("ssr-post-content-header")
    expect(css).toContain('.custom-rule { color: red; }')
    expect(css.indexOf('.custom-rule { color: red; }')).toBeGreaterThan(css.indexOf("ssr-post-content-header"))
  })

  it('keeps always-on site css even when user styles are disabled', () => {
    const snapshot = normalizeUserStyles({
      builtins: {
        'hide-reddit-game': { enabled: false },
        'hide-x-bottom-nav': { enabled: false },
      },
      customStyles: [],
    })

    const css = getInjectedCss('www.instagram.com', {}, snapshot)
    expect(css).toContain('._acc8._abpk')
    expect(css).not.toContain("ssr-post-content-header")
  })
})
