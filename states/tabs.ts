import { observable, type Observable } from '@legendapp/state'
import { syncObservable } from '@legendapp/state/sync'
import { ObservablePersistMMKV } from '@legendapp/state/persist-plugins/mmkv'
import { genId } from '@/lib/utils'
import { ui$ } from './ui'
import { settings$ } from './settings'
import { savedViews$ } from './saved-views'
import { sortBy } from 'es-toolkit'
import {
  consumeChildBackTarget,
  getChildBackTarget,
  invalidateChildBackTargetOnUserSwitch,
  pruneChildBackParentByTabId,
  pruneRecentTabIds,
  resolveCloseTarget,
  updateRecentTabIds,
  type ChildBackParentByTabId,
} from '@/lib/tab-behavior'

import { removeTrackingParams } from '@/lib/url'
import { DECK_VIEW_ID } from './saved-views'

export interface Tab {
  id: string
  url: string
  title?: string
  icon?: string
  desktopMode?: boolean
  profile?: string
}

export interface ClosedTab extends Tab {
  closedAt: number
}

interface Store {
  tabs: Tab[]
  activeTabIndex: number
  orders: Record<string, number>
  recentlyClosedTabs: ClosedTab[]

  currentTab: () => Tab | undefined
  // currentUrl: () => string

  openTab: (url: string, options?: OpenTabOptions) => string | undefined
  closeTab: (index: number) => void
  closeAll: () => void
  reopenClosedTab: (tabId: string) => string | undefined
  updateTabUrl: (url: string, index?: number) => void
  setActiveTabIndex: (index: number, reason?: TabActivationReason) => void
  setActiveTabById: (tabId: string, reason?: TabActivationReason) => void
  handleBackPress: () => boolean
}

let lastOpenedUrl = ''
let recentTabIds: string[] = []
let childBackParentByTabId: ChildBackParentByTabId = {}
const MAX_RECENTLY_CLOSED_TABS = 10

const pushRecentlyClosedTabs = (closedTabs: Tab[]) => {
  const nextClosedTabs = closedTabs
    .filter((tab): tab is Tab => tab != null)
    .map((tab) => ({ ...tab, closedAt: Date.now() }))

  if (!nextClosedTabs.length) {
    return
  }

  const history = tabs$.recentlyClosedTabs.get()
  const nextHistory = [...nextClosedTabs.reverse(), ...history]
  tabs$.recentlyClosedTabs.set(nextHistory.slice(0, MAX_RECENTLY_CLOSED_TABS))
}

export type OpenTabOptions = {
  parentTabId?: string
  profile?: string
  source?: 'manual' | 'child' | 'shared' | 'reuse'
}

export type TabActivationReason = 'user' | 'open' | 'close' | 'back' | 'system'

export const getOrderedTabIds = (tabs: Pick<Tab, 'id'>[], orders: Record<string, number>) => {
  const existingIds = new Set(tabs.map((tab) => tab.id))
  const orderedIds = sortBy(Object.entries(orders), [(entry) => entry[1]])
    .map(([tabId]) => tabId)
    .filter((tabId) => existingIds.has(tabId))

  for (const tab of tabs) {
    if (!(tab.id in orders)) {
      orderedIds.push(tab.id)
    }
  }

  return orderedIds
}

export const sortTabsByOrder = <T extends Pick<Tab, 'id'>>(tabs: T[], orders: Record<string, number>) => {
  const tabById = new Map(tabs.map((tab) => [tab.id, tab]))
  return getOrderedTabIds(tabs, orders)
    .map((tabId) => tabById.get(tabId))
    .filter((tab): tab is T => tab != null)
}

const getActiveTabId = () => {
  const index = tabs$.activeTabIndex.get()
  return tabs$.tabs[index]?.id.get()
}

const syncRuntimeTabMetadata = () => {
  const existingTabIds = tabs$.tabs.get().map((tab) => tab.id)
  recentTabIds = pruneRecentTabIds(recentTabIds, existingTabIds)
  childBackParentByTabId = pruneChildBackParentByTabId(childBackParentByTabId, existingTabIds)
}

const getClosePreferredTabIds = (availableTabIds: string[]) => {
  const activeViewId = savedViews$.activeViewId.get()
  if (activeViewId === DECK_VIEW_ID) {
    return undefined
  }

  const activeView = savedViews$.savedViews.get().find((view) => view.id === activeViewId)
  if (!activeView) {
    return undefined
  }

  const availableTabIdSet = new Set(availableTabIds)
  return activeView.slotTabIds.filter((tabId): tabId is string => typeof tabId === 'string' && availableTabIdSet.has(tabId))
}

const setActiveTabIndexInternal = (index: number, reason: TabActivationReason = 'user') => {
  const tabs = tabs$.tabs.get()
  if (index < 0 || index >= tabs.length) {
    return
  }

  const activeIndex = tabs$.activeTabIndex.get()
  const previousTabId = tabs[activeIndex]?.id
  const nextTabId = tabs[index]?.id
  if (!nextTabId) {
    return
  }

  if (reason === 'user') {
    childBackParentByTabId = invalidateChildBackTargetOnUserSwitch(childBackParentByTabId, previousTabId, nextTabId)
  }

  const shouldTrackRecentTabs = reason === 'user' || reason === 'open' || reason === 'back'
  if (previousTabId !== nextTabId) {
    if (shouldTrackRecentTabs) {
      recentTabIds = updateRecentTabIds(recentTabIds, previousTabId, nextTabId)
    }
    ui$.activeCanGoBack.set(false)
  }

  tabs$.activeTabIndex.set(index)
}

export const openDesktopTab = (url: string, options?: OpenTabOptions) =>
  tabs$.openTab(url, options) as string | undefined

export const tabs$: Observable<Store> = observable<Store>({
  tabs: [],
  activeTabIndex: 0,
  orders: {},
  recentlyClosedTabs: [],

  currentTab: (): Tab | undefined => {
    const index = tabs$.activeTabIndex.get()
    if (index < 0 || index >= tabs$.tabs.length) return undefined
    return tabs$.tabs[index].get()
  },
  // currentUrl: (): string => tabs$.tabs[tabs$.activeTabIndex.get()].get()?.url,

  openTab: (url, options): string | undefined => {
    const cleaned = removeTrackingParams(url.replace('nora://', 'https://'))
    if (cleaned && cleaned === lastOpenedUrl) {
      return undefined
    }
    lastOpenedUrl = cleaned
    setTimeout(() => {
      lastOpenedUrl = ''
    }, 1000)

    if (settings$.oneTabPerSite.get()) {
      try {
        const newUrl = new URL(url)
        if (newUrl.hostname) {
          const tabs = tabs$.tabs.get()
          const existingTabIndex = tabs.findIndex((t) => {
            try {
              const tabUrl = new URL(t.url)
              return tabUrl.hostname === newUrl.hostname
            } catch (e) {
              return false
            }
          })

          if (existingTabIndex !== -1) {
            tabs$.setActiveTabIndex(existingTabIndex, 'open')
            tabs$.tabs[existingTabIndex].url.set(url)
            return tabs$.tabs[existingTabIndex].id.get()
          }
        }
      } catch (e) {
        // ignore
      }
    }

    const tab: Tab = { id: genId(), url, profile: options?.profile || ui$.lastSelectedProfileId.get() }
    tabs$.tabs.push(tab)
    if (options?.source === 'child' && options.parentTabId && options.parentTabId !== tab.id) {
      childBackParentByTabId[tab.id] = options.parentTabId
    }
    tabs$.setActiveTabIndex(tabs$.tabs.length - 1, 'open')
    return tab.id
  },

  closeTab: (index) => {
    const tabs = tabs$.tabs.get()
    const closedTab = tabs[index]
    const tabId = closedTab?.id
    if (!tabId) {
      return
    }

    const activeIndex = tabs$.activeTabIndex.get()
    const activeTabId = tabs[activeIndex]?.id
    const remainingTabIds = tabs.filter((_, tabIndex) => tabIndex !== index).map((tab) => tab.id)
    const adjacentTabId = tabs[index + 1]?.id || tabs[index - 1]?.id
    const preferredTabIds = getClosePreferredTabIds(remainingTabIds)
    const nextActiveTabId = resolveCloseTarget({
      activeTabId,
      closingTabId: tabId,
      recentTabIds,
      availableTabIds: remainingTabIds,
      preferredTabIds,
      adjacentTabId,
    })

    tabs$.tabs.splice(index, 1)
    pushRecentlyClosedTabs(closedTab ? [closedTab] : [])
    savedViews$.cleanupClosedTabIds([tabId])
    syncRuntimeTabMetadata()

    const remainingTabs = tabs$.tabs.get()
    if (!remainingTabs.length) {
      tabs$.activeTabIndex.set(0)
      ui$.activeCanGoBack.set(false)
      return
    }

    if (activeTabId && nextActiveTabId === activeTabId) {
      const nextIndex = remainingTabs.findIndex((tab) => tab.id === activeTabId)
      if (nextIndex !== -1) {
        tabs$.activeTabIndex.set(nextIndex)
        return
      }
    }

    tabs$.setActiveTabById(nextActiveTabId || remainingTabs[0].id, 'close')
  },

  closeAll: () => {
    const closedTabs = tabs$.tabs.get()
    const closedTabIds = closedTabs.map((tab) => tab.id)
    pushRecentlyClosedTabs(closedTabs)
    tabs$.assign({ tabs: [{ id: genId(), url: '' }], activeTabIndex: 0 })
    recentTabIds = []
    childBackParentByTabId = {}
    ui$.activeCanGoBack.set(false)
    savedViews$.cleanupClosedTabIds(closedTabIds)
  },

  reopenClosedTab: (tabId) => {
    const recentlyClosedTabs = tabs$.recentlyClosedTabs.get()
    const closedTab = recentlyClosedTabs.find((tab) => tab.id === tabId)
    if (!closedTab) {
      return undefined
    }

    tabs$.recentlyClosedTabs.set(recentlyClosedTabs.filter((tab) => tab.id !== tabId))
    const { id: _closedTabId, closedAt: _closedAt, ...rest } = closedTab
    const reopenedTab: Tab = { ...rest, id: genId() }
    tabs$.tabs.push(reopenedTab)
    tabs$.setActiveTabIndex(tabs$.tabs.length - 1, 'open')
    return reopenedTab.id
  },

  updateTabUrl: (url, index) => {
    if (!tabs$.tabs.length) {
      return tabs$.openTab(url)
    }
    const targetIndex = index ?? tabs$.activeTabIndex.get()
    const tab$ = tabs$.tabs[targetIndex]
    if (tab$.get()) {
      tab$.url.set(url)
    }
  },

  setActiveTabIndex: (index, reason = 'user') => {
    setActiveTabIndexInternal(index, reason)
  },

  setActiveTabById: (tabId, reason = 'user') => {
    const index = tabs$.tabs.get().findIndex((tab) => tab?.id === tabId)
    if (index !== -1) {
      setActiveTabIndexInternal(index, reason)
    }
  },

  handleBackPress: () => {
    const activeTabId = getActiveTabId()
    const webview = ui$.webview.get()
    const canGoBack = ui$.activeCanGoBack.get()
    if (canGoBack) {
      webview?.goBack?.()
      return true
    }

    const targetTabId = getChildBackTarget(
      childBackParentByTabId,
      activeTabId,
      canGoBack,
      tabs$.tabs.get().map((tab) => tab.id),
    )
    if (!targetTabId) {
      return false
    }

    childBackParentByTabId = consumeChildBackTarget(childBackParentByTabId, activeTabId)
    const activeIndex = tabs$.tabs.get().findIndex((tab) => tab?.id === activeTabId)
    if (activeIndex === -1) {
      return false
    }

    const closedTab = tabs$.tabs[activeIndex].get()
    tabs$.tabs.splice(activeIndex, 1)
    pushRecentlyClosedTabs(closedTab ? [closedTab] : [])
    savedViews$.cleanupClosedTabIds(activeTabId ? [activeTabId] : [])
    syncRuntimeTabMetadata()
    ui$.webview.set(undefined)
    ui$.activeCanGoBack.set(false)

    const remainingTabs = tabs$.tabs.get()
    if (!remainingTabs.length) {
      tabs$.assign({ tabs: [{ id: genId(), url: '' }], activeTabIndex: 0 })
      return true
    }

    tabs$.setActiveTabById(targetTabId, 'back')
    return true
  },
})

syncObservable(tabs$, {
  persist: {
    name: 'tabs',
    plugin: ObservablePersistMMKV,
    transform: {
      load: (data: Store) => {
        if (data?.tabs) {
          const seenIds = new Set<string>()
          data.tabs = data.tabs
            .filter((tab) => tab != null)
            .map((tab) => {
              if (!tab.id || seenIds.has(tab.id)) {
                tab.id = genId()
              }
              seenIds.add(tab.id)
              return tab
            })
          if (!data.tabs.length) {
            data.tabs = [{ id: genId(), url: '' }]
          }          if (typeof data.activeTabIndex !== 'number' || data.activeTabIndex < 0) {
            data.activeTabIndex = 0
          }
          if (data.activeTabIndex >= data.tabs.length) {
            data.activeTabIndex = data.tabs.length - 1
          }
        }
        if (data?.recentlyClosedTabs) {
          data.recentlyClosedTabs = data.recentlyClosedTabs
            .filter((tab): tab is ClosedTab => tab != null && typeof tab.url === 'string')
            .map((tab) => ({
              ...tab,
              id: tab.id || genId(),
              closedAt: typeof tab.closedAt === 'number' ? tab.closedAt : Date.now(),
            }))
            .slice(0, MAX_RECENTLY_CLOSED_TABS)
        }
        return data
      },
    },
  },
})
