import { tabs$ } from '@/states/tabs'

export function handleShortcuts(e: {
  metaKey?: boolean
  ctrlKey?: boolean
  meta?: boolean
  control?: boolean
  shiftKey?: boolean
  shift?: boolean
  key: string
}) {
  const isCmdOrCtrl = e.metaKey || e.ctrlKey || e.meta || e.control
  if (!isCmdOrCtrl) return

  const key = e.key.toLowerCase()
  if (key === 't') {
    if (e.shiftKey || e.shift) {
      const history = tabs$.recentlyClosedTabs.get()
      if (history.length) {
        tabs$.reopenClosedTab(history[0].id)
      }
    } else {
      const tabId = tabs$.openTab('', { source: 'manual' })
      if (tabId) {
        tabs$.setActiveTabById(tabId, 'open')
      }
    }
  } else if (key === 'w') {
    const index = tabs$.activeTabIndex.get()
    tabs$.closeTab(index)
  } else if (key >= '1' && key <= '9') {
    const targetIndex = parseInt(key) - 1
    const tabs = tabs$.tabs.get()
    if (targetIndex < tabs.length) {
      tabs$.setActiveTabIndex(targetIndex, 'user')
    }
  }
}
