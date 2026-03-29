import { describe, expect, it } from 'bun:test'
import { getInjectedCss } from '../content/css'
import {
  getEnabledUserStyleCss,
  matchesAnyHostGlob,
  matchesHostGlob,
  normalizeUserStyles,
} from './user-styles'

const withBuiltinEnabled = (
  id: 'compact-tiktok-layout' | 'hide-reddit-game' | 'hide-x-bottom-nav' | 'hide-x-home-tabs',
) =>
  normalizeUserStyles({
    builtins: {
      [id]: { enabled: true },
    } as any,
    customStyles: [],
  })

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
    expect(snapshot.builtins['compact-tiktok-layout'].enabled).toBe(true)
    expect(snapshot.builtins['hide-x-bottom-nav'].enabled).toBe(true)
    expect(snapshot.builtins['hide-x-home-tabs'].enabled).toBe(false)
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
    const snapshot = withBuiltinEnabled('hide-reddit-game')

    expect(getEnabledUserStyleCss('www.reddit.com', snapshot)).toContain("ssr-post-content-header")
    expect(getEnabledUserStyleCss('x.com', snapshot)).not.toContain("[role='tablist']")
    expect(getEnabledUserStyleCss('example.com', snapshot)).not.toContain("ssr-post-content-header")
  })

  it('appends matching custom css after builtin css', () => {
    const snapshot = normalizeUserStyles({
      builtins: {
        'hide-reddit-game': { enabled: true },
      } as any,
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
        'compact-tiktok-layout': { enabled: false },
        'hide-x-bottom-nav': { enabled: false },
        'hide-x-home-tabs': { enabled: false },
      },
      customStyles: [],
    })

    const css = getInjectedCss('www.instagram.com', {}, snapshot)
    expect(css).toContain('._acc8._abpk')
    expect(css).toContain('article:has(.x1fhwpqd.x132q4wb.x5n08af)')
    expect(css).not.toContain("ssr-post-content-header")
  })

  it('keeps always-on tiktok css even when user styles are disabled', () => {
    const snapshot = normalizeUserStyles({
      builtins: {
        'hide-reddit-game': { enabled: false },
        'compact-tiktok-layout': { enabled: false },
        'hide-x-bottom-nav': { enabled: false },
        'hide-x-home-tabs': { enabled: false },
      },
      customStyles: [],
    })

    const css = getInjectedCss('www.tiktok.com', {}, snapshot)
    expect(css).toContain("SectionActionBarContainer")
    expect(css).not.toContain("DivSideNavPlaceholderContainer")
  })

  it('includes x home tab css when the builtin is enabled', () => {
    const snapshot = withBuiltinEnabled('hide-x-home-tabs')

    expect(getEnabledUserStyleCss('x.com', snapshot)).toContain("[role='tablist']")
  })

  it('includes tiktok layout css when the builtin is enabled', () => {
    const snapshot = withBuiltinEnabled('compact-tiktok-layout')

    expect(getEnabledUserStyleCss('www.tiktok.com', snapshot)).toContain("DivSideNavPlaceholderContainer")
  })
})
