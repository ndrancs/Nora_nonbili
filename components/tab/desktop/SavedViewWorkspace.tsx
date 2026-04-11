import React from 'react'
import { clsx } from '@/lib/utils'
import { type CustomSavedView } from '@/states/saved-views'
import { type Tab } from '@/states/tabs'
import { EmptySlot } from './EmptySlot'
import { SavedViewTab } from './SavedViewTab'
import { SlotTabPicker } from './SlotTabPicker'

export const SavedViewWorkspace: React.FC<{
  activeSlotIndex: number | null
  activeView: CustomSavedView
  focusSlot: (viewId: string, slotIndex: number) => void
  orderedTabs: Tab[]
  tabIdSet: Set<string>
  tabs: Tab[]
}> = ({ activeSlotIndex, activeView, focusSlot, orderedTabs, tabIdSet, tabs }) => {
  const isSplit = activeView.layout === 'split-view'
  const slotIndexByTabId = new Map<string, number>()

  activeView.slotTabIds.forEach((tabId, slotIndex) => {
    if (tabId && tabIdSet.has(tabId)) {
      slotIndexByTabId.set(tabId, slotIndex)
    }
  })

  return (
    <div className={clsx(isSplit ? 'flex-1 min-w-0 flex flex-row gap-2 p-2' : 'relative flex-1 overflow-hidden p-2')}>
      {tabs.map((tab, index) => {
        const slotIndex = slotIndexByTabId.get(tab.id)

        return (
          <SavedViewTab
            key={tab.id}
            index={index}
            isSplit={isSplit}
            isVisible={slotIndex != null}
            slotIndex={slotIndex ?? null}
            slotSwitcher={
              slotIndex != null ? (
                <SlotTabPicker
                  currentTabId={tab.id}
                  isActive={slotIndex === activeSlotIndex}
                  onActivate={() => focusSlot(activeView.id, slotIndex)}
                  orderedTabs={orderedTabs}
                  slotIndex={slotIndex}
                  tabIdSet={tabIdSet}
                  view={activeView}
                />
              ) : undefined
            }
            tab={tab}
            viewLayout={activeView.layout}
          />
        )
      })}

      {activeView.slotTabIds
        .map((tabId, slotIndex) => ({ tabId, slotIndex }))
        .filter(({ tabId }) => !tabId || !tabIdSet.has(tabId))
        .map(({ slotIndex }) => (
          <EmptySlot
            key={`${activeView.id}-${slotIndex}`}
            isActive={slotIndex === activeSlotIndex}
            onActivate={() => focusSlot(activeView.id, slotIndex)}
            slotIndex={slotIndex}
            orderedTabs={orderedTabs}
            tabIdSet={tabIdSet}
            view={activeView}
            isSplit={isSplit}
          />
        ))}
    </div>
  )
}
