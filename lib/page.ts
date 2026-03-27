import { tabs$ } from '@/states/tabs'
import { removeTrackingParams } from './url'
import { onReceiveAuthUrl } from './supabase/auth'
import NoraViewModule from '@/modules/nora-view'
import { isAuthCallbackUrl } from './auth-callback'
export { removeTrackingParams } from './url'
export { isAuthCallbackUrl } from './auth-callback'

export const homeUrls: Record<string, string> = {
  bluesky: 'https://bsky.app',
  facebook: 'https://m.facebook.com',
  'facebook-messenger': 'https://www.facebook.com/messages/',
  instagram: 'https://www.instagram.com',
  linkedin: 'https://www.linkedin.com',
  reddit: 'https://www.reddit.com',
  threads: 'https://www.threads.com',
  tiktok: 'https://www.tiktok.com',
  tumblr: 'https://www.tumblr.com',
  vk: 'https://m.vk.com',
  x: 'https://x.com',
}

export function getHomeUrl(home: string) {
  return homeUrls[home] || homeUrls.x
}

export function cleanSharedUrl(url: string) {
  return removeTrackingParams(url.replace('nora://', 'https://'))
}

const isExternalAppUrl = (url: string) => {
  try {
    const scheme = new URL(url).protocol.replace(':', '').toLowerCase()
    return !['about', 'blob', 'data', 'file', 'http', 'https', 'javascript', 'nora'].includes(scheme)
  } catch {
    return false
  }
}

export async function openSharedUrl(url: string, replace = false) {
  if (isAuthCallbackUrl(url)) {
    await onReceiveAuthUrl(url)
    return
  }
  if (isExternalAppUrl(url)) {
    void NoraViewModule.openExternalUrl(url).catch((e) => {
      console.error(e)
    })
    return
  }
  try {
    const newUrl = cleanSharedUrl(url)
    if (replace) {
      tabs$.updateTabUrl(newUrl)
    } else {
      tabs$.openTab(newUrl, { source: 'shared' })
    }
  } catch (e) {
    console.error(e)
  }
}
