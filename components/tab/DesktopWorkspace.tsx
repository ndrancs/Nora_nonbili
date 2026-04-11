import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useValue } from '@legendapp/state/react'
import { getOrderedTabIds, sortTabsByOrder, tabs$ } from '@/states/tabs'
import { DECK_VIEW_ID, savedViews$ } from '@/states/saved-views'
import { DeckWorkspace } from './desktop/DeckWorkspace'
import { SavedViewWorkspace } from './desktop/SavedViewWorkspace'

export const DesktopWorkspace: React.FC = () => {
  const tabs = useValue(tabs$.tabs)
  const activeTabIndex = useValue(tabs$.activeTabIndex)
  const orders = useValue(tabs$.orders)
  const activeViewId = useValue(savedViews$.activeViewId)
  const savedViews = useValue(savedViews$.savedViews)
  const [focusedEmptySlotByView, setFocusedEmptySlotByView] = useState<Record<string, number>>({})
  const activeView = savedViews.find((view) => view.id === activeViewId)
  const isDeck = !activeView || activeViewId === DECK_VIEW_ID
  const tabIdsKey = tabs.map((tab) => tab.id).join('|')
  const orderedTabIds = useMemo(() => getOrderedTabIds(tabs, orders), [tabs, orders])
  const orderedTabs = useMemo(() => sortTabsByOrder(tabs, orders), [tabs, orders])
  const tabIdSet = useMemo(() => new Set(tabs.map((tab) => tab.id)), [tabs])
  const visibleSlots = activeView?.slotTabIds ?? []
  const visibleTabIds = visibleSlots.filter((tabId): tabId is string => typeof tabId === 'string' && tabIdSet.has(tabId))
  const visibleTabIdsKey = visibleTabIds.join('|')
  const activeTabId = tabs[activeTabIndex]?.id

  // Sync orders when tabs are added/removed.
  // Only depend on tabIdsKey to avoid a render loop: the effect sets
  // tabs$.orders which would change `orders` → recompute orderedTabIds
  // → re-trigger this effect endlessly.
  const ordersRef = useRef(orders)
  ordersRef.current = orders
  useEffect(() => {
    const currentOrders = ordersRef.current
    const currentTabIds = getOrderedTabIds(tabs$.tabs.get(), currentOrders)
    const nextOrders: Record<string, number> = {}
    currentTabIds.forEach((tabId, order) => {
      nextOrders[tabId] = order
    })

    const hasSameSize = Object.keys(nextOrders).length === Object.keys(currentOrders).length
    const hasSameOrder = hasSameSize && currentTabIds.every((tabId, index) => currentOrders[tabId] === index)
    if (!hasSameOrder) {
      tabs$.orders.set(nextOrders)
    }
  }, [tabIdsKey])

  useEffect(() => {
    if (isDeck || !tabs.length) {
      return
    }

    const activeTabId = tabs[activeTabIndex]?.id
    if (activeTabId && visibleTabIds.includes(activeTabId)) {
      return
    }

    const fallbackTabId = visibleTabIds.find((tabId) => tabIdSet.has(tabId))
    if (fallbackTabId) {
      tabs$.setActiveTabById(fallbackTabId, 'system')
    }
  }, [activeTabIndex, activeViewId, isDeck, savedViews, tabIdSet, tabs, visibleTabIds, visibleTabIdsKey])

  const slotIndexByTabId = useMemo(() => {
    const next = new Map<string, number>()
    if (!activeView) {
      return next
    }

    activeView.slotTabIds.forEach((tabId, slotIndex) => {
      if (tabId && tabIdSet.has(tabId)) {
        next.set(tabId, slotIndex)
      }
    })
    return next
  }, [activeView, tabIdSet])

  const fallbackEmptySlotIndex =
    activeView?.slotTabIds.findIndex((tabId) => !tabId || !tabIdSet.has(tabId)) ?? -1
  const activeSlotIndex =
    !activeView || isDeck
      ? null
      : activeTabId && slotIndexByTabId.has(activeTabId)
        ? slotIndexByTabId.get(activeTabId) ?? null
        : focusedEmptySlotByView[activeView.id] ?? (fallbackEmptySlotIndex >= 0 ? fallbackEmptySlotIndex : null)
  const focusSlot = (viewId: string, slotIndex: number) => {
    setFocusedEmptySlotByView((current) => {
      if (current[viewId] === slotIndex) {
        return current
      }
      return {
        ...current,
        [viewId]: slotIndex,
      }
    })
  }

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden">
      {isDeck ? (
        <DeckWorkspace orderedTabIds={orderedTabIds} orders={orders} tabs={tabs} />
      ) : activeView ? (
        <SavedViewWorkspace
          activeSlotIndex={activeSlotIndex}
          activeView={activeView}
          focusSlot={focusSlot}
          orderedTabs={orderedTabs}
          tabIdSet={tabIdSet}
          tabs={tabs}
        />
      ) : null}
    </div>
  )
}
