import React, { type CSSProperties, type ReactNode } from 'react'
import { clsx } from '@/lib/utils'
import { NoraTab } from '@/components/tab/NoraTab'
import { settings$ } from '@/states/settings'
import { type CustomSavedView } from '@/states/saved-views'
import { type Tab, tabs$ } from '@/states/tabs'
import { getHiddenTabStyle, getSlotStyle } from './desktopWorkspaceShared'

export const SavedViewTab: React.FC<{
  index: number
  isSplit: boolean
  isVisible: boolean
  slotIndex: number | null
  slotSwitcher?: ReactNode
  tab: Tab
  viewLayout: CustomSavedView['layout']
}> = ({ index, isSplit, isVisible, slotIndex, slotSwitcher, tab, viewLayout }) => {
  let style: CSSProperties
  if (isSplit && isVisible) {
    style = { flex: 1, minWidth: 0, order: slotIndex ?? 0 }
  } else if (slotIndex != null) {
    style = getSlotStyle(viewLayout, slotIndex)
  } else {
    style = getHiddenTabStyle(settings$.deckTabWidth.get())
  }

  return (
    <div
      className={clsx(
        isSplit && isVisible
          ? 'flex-1 min-w-0 h-full overflow-hidden'
          : slotIndex != null
            ? 'absolute overflow-hidden border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950'
            : 'absolute overflow-hidden',
      )}
      style={style}
      onMouseDown={() => tabs$.setActiveTabIndex(index, 'user')}
    >
      <NoraTab tab={tab} index={index} desktopVariant="saved-view" slotSwitcher={slotSwitcher} />
    </div>
  )
}
