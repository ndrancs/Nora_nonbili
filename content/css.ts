import { getEnabledUserStyleCss } from '../lib/user-styles'
import { noraSettingsEvent, noraUserStylesEvent } from './nora'

export const hostHomes: Record<string, string> = {
  'bsky.app': 'bluesky',
  'm.facebook.com': 'facebook',
  'www.facebook.com': 'facebook-messenger',
  'www.instagram.com': 'instagram',
  'www.linkedin.com': 'linkedin',
  'chat.reddit.com': 'reddit',
  'old.reddit.com': 'reddit',
  'www.reddit.com': 'reddit',
  'www.threads.com': 'threads',
  'www.tiktok.com': 'tiktok',
  'www.tumblr.com': 'tumblr',
  'm.vk.com': 'vk',
  'x.com': 'x',
}

const css = (raw: ArrayLike<string>, ...values: any[]) => String.raw({ raw }, ...values)

const styles: Record<string, (settings: any) => string> = {
  base: (settings) => css`
    ._nora_hidden_ {
      display: none !important;
    }

    img {
      pointer-events: initial !important;
    }
  `,

  facebook: (settings) => css`
    .native-text,
    .native-text * {
      user-select: text !important;
      pointer-events: initial !important;
    }
  `,

  instagram: (settings) => css`
    /* Open in app */
    ._acc8._abpk,
    ._acc8._ag6v {
      display: none !important;
    }
    /* blocking div */
    ._aagw {
      pointer-events: none !important;
    }
  `,

  reddit: (settings) => css`
    .promotedlink,
    .sitetable .rank,
    #xpromo-small-header,
    li:has(ad-event-tracker),
    shreddit-ad-post,
    shreddit-comments-page-ad {
      display: none !important;
    }

    .sitetable .midcol {
      width: 1rem !important;
    }
  `,

  threads: (settings) => css`
    /* Open in app */
    .x6s0dn4.x78zum5.xdt5ytf.x1mk1bxn.xaw7rza.xvc5jky,
    /* Suggested for you */
    .x16xn7b0.xwib8y2 {
      display: none !important;
    }
  `,

  tiktok: (settings) => css`
    /* layout */
    div[class*='DivSideNavPlaceholderContainer'] {
      width: 3rem !important;
    }
    div[class*='DivSideNavContainer'] {
      width: 3rem !important;
    }
    main#main-content-homepage_hot {
      min-width: 0 !important;
    }
    div[class*='DivColumnListContainer'] {
      padding-inline-end: 0 !important;
    }
    section[class*='SectionMediaCardContainer'] {
      width: calc(100vw - 3rem);
      min-width: 0;
    }
    section[class*='SectionActionBarContainer'] {
      position: fixed !important;
      right: 0 !important;
      top: 0 !important;
      background: #ffffff33;
      border-radius: 12px;
      transform: scale(0.9);
    }
  `,

  x: (settings) => css`
    /* Upgrade */
    [data-testid='super-upsell-UpsellButtonRenderProperties'] {
      display: none !important;
    }
  `,
}

export const getCoreCss = (host: string, settings: any) => {
  const key = hostHomes[host]
  return styles.base(settings) + (styles[key]?.(settings) || '')
}

export const getInjectedCss = (host: string, settings: any, userStyles: any) => {
  const coreCss = getCoreCss(host, settings)
  const userStyleCss = getEnabledUserStyleCss(host, userStyles)
  return [coreCss, userStyleCss].filter(Boolean).join('\n\n')
}

export function injectCSS() {
  const style = document.createElement('style')
  const { host } = document.location

  const update = () => {
    const settings = window.Nora?.getSettings?.() || {}
    const userStyles = window.Nora?.getUserStyles?.()
    const content = getInjectedCss(host, settings, userStyles)
    style.textContent = content
  }

  style.type = 'text/css'
  update()
  document.head.appendChild(style)
  window.addEventListener(noraSettingsEvent, () => update())
  window.addEventListener(noraUserStylesEvent, () => update())
}
