import { fbL10nSponsored, isFacebookDesktopSponsoredPost, isFacebookMessagesPath } from './services/facebook'
import { linkedinL10nPromoted } from './services/linkedin'
import { getService } from './services/manager'
import { emit } from './utils'

const { host } = document.location

const hideElement = (element: HTMLElement) => {
  element.style.display = 'none'
}

const hideFacebookDesktopAds = (element: HTMLElement) => {
  if (isFacebookMessagesPath(document.location.pathname)) {
    return
  }

  const container = element.closest('[role="article"], div[data-pagelet^="FeedUnit"], div[role="feed"] > div')
  if (!container || !(container instanceof HTMLElement) || container.dataset.noraHiddenAd === '1') {
    return
  }

  if (isFacebookDesktopSponsoredPost(container)) {
    container.dataset.noraHiddenAd = '1'
    hideElement(container)
  }
}

export function blockAds() {
  if (!['www.instagram.com', 'www.reddit.com', 'x.com'].includes(host)) {
    return
  }
  function interceptResponse(url: string, response: string) {
    try {
      const service = getService(document.location.href)
      if (service?.shouldIntercept(url)) {
        response = service.transformResponse(response)
      }
    } catch (e) {
      console.error(e)
    }
    return response
  }

  // https://stackoverflow.com/a/77243932
  const XHR = window.XMLHttpRequest
  class XMLHttpRequest extends XHR {
    get responseText() {
      if (this.readyState == 4) {
        return interceptResponse(this.responseURL, super.responseText)
      }
      return super.responseText
    }

    get response() {
      if (this.readyState == 4) {
        return interceptResponse(this.responseURL, super.response)
      }
      return super.response
    }
  }
  window.XMLHttpRequest = XMLHttpRequest
}

export function hideAds(mutations: MutationRecord[]) {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes.values()) {
      const el = node as HTMLElement
      switch (host) {
        case 'm.facebook.com': {
          if (el.dataset?.trackingDurationId) {
            const text = el.querySelector('.native-text.rslh .f5')?.textContent
            for (const text of fbL10nSponsored) {
              if (el.textContent?.includes(text)) {
                // facebook server rendered ads
                hideElement(el)
                break
              }
            }
          }
          break
        }
        case 'www.facebook.com': {
          hideFacebookDesktopAds(el)
          break
        }
        case 'www.instagram.com': {
          if (el.nodeName == 'ARTICLE') {
            if (el.querySelector('.x1fhwpqd.x132q4wb.x5n08af')) {
              // instagram server rendered ads
              el.style.visibility = 'hidden'
            }
          }
          break
        }
      }
    }

    switch (host) {
      case 'm.facebook.com': {
        const target = document.querySelector('.fixed-container.bottom') as HTMLElement

        if (
          target?.querySelectorAll('.native-text')?.length == 1 &&
          !target.querySelector('[data-mcomponent="ServerTextArea"]')
        ) {
          // facebook open app btn
          hideElement(target)
        }
        break
      }
      case 'www.facebook.com': {
        if (!isFacebookMessagesPath(document.location.pathname)) {
          const items = document.querySelectorAll<HTMLElement>('[role="article"], div[data-pagelet^="FeedUnit"], div[role="feed"] > div')
          for (const item of items) {
            hideFacebookDesktopAds(item)
          }
        }
        break
      }
      case 'www.linkedin.com': {
        const items = document.querySelectorAll('.feed-item')
        for (const item of items) {
          const label = (item.querySelector('span.text-color-text-low-emphasis') as HTMLElement)?.innerText
          if (linkedinL10nPromoted.includes(label)) {
            ;(item as HTMLElement).style.display = 'none'
          }
        }
        break
      }
    }
  }
}
