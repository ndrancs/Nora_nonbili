import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native'
import { useValue } from '@legendapp/state/react'
import { BaseCenterModal } from '../modal/BaseCenterModal'
import { NouButton } from '../button/NouButton'
import { NouMenu } from '../menu/NouMenu'
import { NouText } from '../NouText'
import { DECK_VIEW_ID, type CustomSavedViewLayout, createDesktopSavedView, savedViews$ } from '@/states/saved-views'
import { openDesktopTab, sortTabsByOrder, tabs$ } from '@/states/tabs'
import { ui$ } from '@/states/ui'
import { clsx } from '@/lib/utils'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { NouContextMenu, type ContextItem } from '../menu/NouContextMenu'

const getFirstVisibleTabId = (viewId: string, viewTabIds: Record<string, string[]>, orderedTabIds: string[]) => {
  if (viewId === DECK_VIEW_ID) {
    return orderedTabIds[0]
  }
  return viewTabIds[viewId]?.find(Boolean)
}

const ViewTypeIcon = ({ layout, size = 20, color = '#71717a' }: { layout: string; size?: number; color?: string }) => {
  let name: React.ComponentProps<typeof MaterialIcons>['name'] = 'view-column'
  if (layout === 'split-view') name = 'view-week'
  if (layout === 'grid-4') name = 'grid-view'
  if (layout === 'deck') name = 'home'

  return <MaterialIcons name={name} size={size} color={color} />
}

export const SavedViewsPicker = () => {
  const { activeViewId, savedViews } = useValue(savedViews$)
  const { tabs, orders } = useValue(tabs$)
  const { width } = useWindowDimensions()
  const activeView = savedViews.find((view) => view.id === activeViewId) || null
  const isVertical = width >= 1024

  const orderedTabs = sortTabsByOrder(tabs, orders)
  const orderedTabIds = orderedTabs.map((tab) => tab.id)
  const tabIdSet = useMemo(() => new Set(orderedTabIds), [orderedTabIds.join('|')])
  const viewTabIds = useMemo(
    () =>
      Object.fromEntries(
        savedViews.map((view) => [
          view.id,
          view.slotTabIds.filter((tabId): tabId is string => typeof tabId === 'string' && tabIdSet.has(tabId)),
        ]),
      ),
    [savedViews, tabIdSet],
  )

  const focusView = (viewId: string) => {
    savedViews$.setActiveView(viewId)
    const tabId = getFirstVisibleTabId(viewId, viewTabIds, orderedTabIds)
    if (tabId) {
      tabs$.setActiveTabById(tabId, 'user')
    }
  }

  const createView = (layout: CustomSavedViewLayout) => {
    const viewId = createDesktopSavedView(layout, orderedTabIds)
    const tabId = getFirstVisibleTabId(viewId, viewTabIds, orderedTabIds) || orderedTabIds[0]
    if (tabId) {
      tabs$.setActiveTabById(tabId, 'system')
    }
  }

  const createTabForCurrentView = () => {
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

  const quickViews = [
    { id: DECK_VIEW_ID, label: '', layout: 'deck', meta: '' },
    ...savedViews.map((view) => ({
      id: view.id,
      label: view.name,
      layout: view.layout,
      meta: view.layout === 'split-view' ? 'Split view' : '4-tabs grid',
    })),
  ]

  return (
    <>
      <View className="items-center w-full">
        <ScrollView
          horizontal={!isVertical}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          className={clsx('w-full flex-grow-0', isVertical && 'max-h-[50vh]')}
          contentContainerClassName={clsx('items-center', isVertical ? 'gap-3' : 'gap-2 px-1')}
        >
          {quickViews.map((view) => {
            const isActive = view.id === activeViewId
            const contextItems: ContextItem[] =
              view.id === DECK_VIEW_ID
                ? []
                : [
                    {
                      label: 'Rename',
                      icon: <MaterialIcons name="edit" size={14} color="#71717a" />,
                      handler: () => {
                        ui$.renameViewModalTargetViewId.set(view.id)
                      },
                    },
                    {
                      label: 'Delete',
                      icon: <MaterialIcons name="delete" size={14} color="#f87171" />,
                      color: 'red',
                      handler: () => savedViews$.deleteView(view.id),
                    },
                  ]

            const content = (
              <Pressable onPress={() => focusView(view.id)}>
                <View className="items-center">
                  <View
                    className={clsx(
                      'w-10 h-10 items-center justify-center rounded-xl transition-all duration-200',
                      isActive
                        ? 'bg-indigo-500/25'
                        : 'border border-zinc-800/50 bg-zinc-900/50 hover:bg-zinc-800',
                    )}
                  >
                    <ViewTypeIcon layout={view.layout} color={isActive ? '#f4f4f5' : '#a1a1aa'} size={22} />
                  </View>
                  {isVertical && view.label ? (
                    <NouText
                      className={clsx(
                        'mt-1 max-w-[48px] text-xs text-center text-zinc-500',
                        isActive && 'text-zinc-300',
                      )}
                      numberOfLines={1}
                    >
                      {view.label}
                    </NouText>
                  ) : null}                </View>
              </Pressable>
            )

            if (!contextItems.length) return <View key={view.id}>{content}</View>

            return (
              <NouContextMenu key={view.id} items={contextItems}>
                {content}
              </NouContextMenu>
            )
          })}
          <NouMenu
            trigger={
              <Pressable
                className={clsx(
                  'w-10 h-10 items-center justify-center rounded-xl border border-zinc-800/50 bg-zinc-900/30 hover:bg-zinc-800',
                  isVertical ? 'mt-2' : 'ml-2',
                )}
              >
                <MaterialIcons name="add" size={20} color="#a1a1aa" />
              </Pressable>
            }
            items={[
              ...(activeView?.layout === 'grid-4'
                ? []
                : [
                    {
                      label: 'New tab',
                      icon: <MaterialIcons name="add" size={14} color="#71717a" />,
                      handler: createTabForCurrentView,
                    },
                  ]),
              {
                label: 'New split view',
                icon: <ViewTypeIcon layout="split-view" size={14} />,
                handler: () => createView('split-view'),
              },
              {
                label: 'New grid view',
                icon: <ViewTypeIcon layout="grid-4" size={14} />,
                handler: () => createView('grid-4'),
              },
            ]}
          />
        </ScrollView>
      </View>
    </>
  )
}
