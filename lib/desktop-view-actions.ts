import { savedViews$ } from '@/states/saved-views'
import { openDesktopTab, tabs$ } from '@/states/tabs'

export const openTabForActiveDesktopView = () => {
  const activeViewId = savedViews$.activeViewId.get()
  const activeView = savedViews$.savedViews.get().find((view) => view.id === activeViewId)

  if (activeView?.layout === 'split-view') {
    savedViews$.appendSplitViewSlot(activeView.id)
    return
  }

  const tabId = openDesktopTab('')
  if (!tabId) {
    return
  }

  tabs$.setActiveTabById(tabId, 'open')
}
