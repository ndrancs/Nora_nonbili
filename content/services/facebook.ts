// https://github.com/facebook-adblock/facebook_adblock/blob/mainline/src/constants.js
export const fbL10nSponsored = [
  'Sponsored',
  'Ad',
  'مُموَّل', // Arabic
  '赞助内容', // Chinese (Simplified)
  '贊助', // Chinese (Traditional)
  'Sponzorováno', // Czech
  'Gesponsord', // Dutch
  'May Sponsor', // Filipino
  'Commandité', // French (Canada)
  'Sponsorisé', // French
  'Anzeige', // German
  'Χορηγούμενη', // Greek
  'ממומן', // Hebrew
  'प्रायोजित', // Hindi
  'Hirdetés', // Hungarian
  'Bersponsor', // Indonesian
  'Sponsorizzato', // Italian
  '広告', // Japanese
  'Sponsorowane', // Polish
  'Patrocinado', // Portuguese (Brazil)
  'Sponsorizat', // Romanian
  'Реклама', // Russian
  'Sponzorované', // Slovak
  'Publicidad', // Spanish
  'Sponsrad', // Swedish
  'ได้รับการสนับสนุน', // Thai
  'Sponsorlu', // Turkish
  'Được tài trợ', // Vietnamese
]

const normalizeSponsoredText = (value?: string | null) => {
  return (value || '')
    .replace(/[\s\u200b-\u200d\u2060\ufeff]+/g, '')
    .trim()
    .toLowerCase()
}

const fbNormalizedSponsored = new Set(fbL10nSponsored.map((value) => normalizeSponsoredText(value)))

export const isFacebookSponsoredText = (value?: string | null) => {
  const normalized = normalizeSponsoredText(value)
  return normalized ? fbNormalizedSponsored.has(normalized) : false
}

export const isFacebookMessagesPath = (pathname: string) => pathname === '/messages' || pathname.startsWith('/messages/')

export const isFacebookDesktopSponsoredPost = (element: HTMLElement) => {
  const candidates = element.matches('[aria-label], a, span, div[role="button"]')
    ? [element]
    : []

  for (const node of candidates) {
    const label = node.getAttribute('aria-label')
    if (isFacebookSponsoredText(label) || isFacebookSponsoredText(node.textContent)) {
      return true
    }
  }

  const descendants = element.querySelectorAll<HTMLElement>('[aria-label], a, span, div[role="button"]')
  for (const node of descendants) {
    const label = node.getAttribute('aria-label')
    if (isFacebookSponsoredText(label) || isFacebookSponsoredText(node.textContent)) {
      return true
    }
  }

  return false
}
