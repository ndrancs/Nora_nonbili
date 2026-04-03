import { ui$ } from '@/states/ui'
import { useValue } from '@legendapp/state/react'
import { BaseModal } from './BaseModal'
import { ServiceIcon } from '../service/Services'
import { View, Text, ScrollView, TouchableOpacity, Pressable, Modal, useColorScheme, useWindowDimensions } from 'react-native'
import { clsx, isWeb, isIos, nIf } from '@/lib/utils'
import { settings$ } from '@/states/settings'
import { Tab, tabs$ } from '@/states/tabs'
import { NouMenu } from '../menu/NouMenu'
import { NouButton } from '../button/NouButton'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { t } from 'i18next'
import { colors } from '@/lib/colors'
import { getProfileColor } from '@/lib/profile'
import { useRef, useState } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const getTabLabel = (tab?: Pick<Tab, 'title' | 'url'> | null) => tab?.title || tab?.url || t('tabs.new')
type Anchor = { x: number; y: number; width: number; height: number }

export const TabModal = () => {
  const tabModalOpen = useValue(ui$.tabModalOpen)
  const oneHandMode = useValue(settings$.oneHandMode)
  const { tabs, activeTabIndex, recentlyClosedTabs } = useValue(tabs$)
  const colorScheme = useColorScheme()
  const isDark = colorScheme !== 'light'
  const iconColor = isDark ? colors.icon : '#334155'
  const [iosMenuOpen, setIosMenuOpen] = useState(false)
  const [iosMenuAnchor, setIosMenuAnchor] = useState<Anchor | null>(null)
  const iosMenuTriggerRef = useRef<View>(null)
  const { width: screenWidth, height: screenHeight } = useWindowDimensions()
  const insets = useSafeAreaInsets()

  if (!tabModalOpen) {
    return null
  }

  const onPress = (index: number) => {
    tabs$.setActiveTabIndex(index, 'user')
    ui$.assign({ tabModalOpen: false })
  }

  const closeModal = () => ui$.tabModalOpen.set(false)
  const openIosMenu = () => {
    iosMenuTriggerRef.current?.measureInWindow((x, y, width, height) => {
      setIosMenuAnchor({ x, y, width, height })
      setIosMenuOpen(true)
    })
  }

  const menuItems = [
    {
      label: t('settings.oneHandMode'),
      icon: <MaterialIcons name={oneHandMode ? 'pan-tool' : 'pan-tool-alt'} size={18} color={oneHandMode ? '#818cf8' : '#71717a'} />,
      metaLabel: oneHandMode ? t('common.on') : t('common.off'),
      meta: isIos
        ? undefined
        : (
            <View
              className={clsx(
                'rounded-full px-2 py-1',
                oneHandMode
                  ? 'bg-indigo-500/20 border border-indigo-400/40'
                  : 'bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700',
              )}
            >
              <Text className={clsx('text-[11px] font-medium', oneHandMode ? 'text-indigo-200' : 'text-zinc-400')}>
                {oneHandMode ? t('common.on') : t('common.off')}
              </Text>
            </View>
          ),
      handler: () => settings$.oneHandMode.toggle(),
    },
    {
      label: '',
      handler: () => {},
      kind: 'separator' as const,
    },
    {
      label: t('tabs.recentlyClosed'),
      handler: () => {},
      kind: 'label' as const,
    },
    ...(recentlyClosedTabs.length
      ? recentlyClosedTabs.map((tab) => ({
          label: getTabLabel(tab),
          description: tab.title && tab.url && tab.title !== tab.url ? tab.url : undefined,
          icon: <ServiceIcon url={tab.url} icon={tab.icon} />,
          handler: () => {
            tabs$.reopenClosedTab(tab.id)
            closeModal()
          },
        }))
      : [
          {
            label: t('tabs.noRecentlyClosed'),
            handler: () => {},
            disabled: true,
          },
        ]),
  ]

  return (
    <BaseModal onClose={closeModal}>
      <ScrollView
        className="my-4 pl-4 min-h-full"
        contentContainerClassName={clsx('min-h-full pb-20', oneHandMode && 'justify-end pt-[35vh]')}
      >
        <View className="flex-row items-center justify-between mb-4 pr-4">
          <NouButton
            className="bg-indigo-500 dark:bg-indigo-600"
            onPress={() => {
              tabs$.openTab('')
              closeModal()
            }}
          >
            <MaterialIcons name="add" size={20} color="#eef2ff" />
          </NouButton>
          <View className="flex-row items-center gap-2">
            {nIf(
              tabs.length,
              <NouButton
                variant="outline"
                size="1"
                onPress={() => {
                  tabs$.closeAll()
                  closeModal()
                }}
              >
                {t('buttons.closeAll')}
              </NouButton>,
            )}
            {isIos ? (
              <View ref={iosMenuTriggerRef} collapsable={false}>
                <Pressable onPress={openIosMenu} className="h-10 w-10 items-center justify-center rounded-full">
                  <MaterialIcons name="more-horiz" size={20} color={iconColor} />
                </Pressable>
              </View>
            ) : (
              <NouMenu
                trigger={isWeb ? <MaterialIcons name="more-vert" size={20} color={iconColor} /> : 'filled.MoreVert'}
                items={menuItems}
              />
            )}
          </View>
        </View>
        {tabs.map((tab, index) => (
          <View className="flex-row items-center justify-between gap-2 pr-4" key={tab.id || index}>
            <TouchableOpacity className="flex-1 min-w-0" onPress={() => onPress(index)}>
              <View
                className={clsx(
                  'flex-1 flex-row items-center gap-2 rounded-md',
                  'py-2 px-2 my-3',
                  index === activeTabIndex ? 'bg-indigo-200' : 'bg-white',
                )}
                style={{ borderLeftWidth: 5, borderLeftColor: getProfileColor(tab.profile) }}
              >
                <ServiceIcon url={tab.url} icon={tab.icon} />
                <Text className="text-sm" numberOfLines={1}>
                  {getTabLabel(tab)}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              className="p-2 rounded-full"
              accessibilityRole="button"
              accessibilityLabel={t('menus.close')}
              onPress={() => tabs$.closeTab(index)}
            >
              <MaterialIcons name="close" size={20} color={iconColor} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      {isIos && iosMenuOpen && iosMenuAnchor ? (
        <Modal transparent visible onRequestClose={() => setIosMenuOpen(false)}>
          <View className="flex-1" pointerEvents="box-none">
            <Pressable className="absolute inset-0" onPress={() => setIosMenuOpen(false)} />
            <View
              className="absolute overflow-hidden rounded-2xl border border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900"
              style={{
                top: Math.min(
                  iosMenuAnchor.y + iosMenuAnchor.height + 6,
                  screenHeight - insets.bottom - Math.min(48 + Math.max(recentlyClosedTabs.length, 1) * 56 + 24, 360) - 8,
                ),
                left: Math.min(
                  Math.max(iosMenuAnchor.x + iosMenuAnchor.width - 280, 8),
                  Math.max(8, screenWidth - 280 - 8),
                ),
                width: 280,
                maxHeight: 360,
              }}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <Pressable
                  className="flex-row items-center gap-3 px-4 py-3 active:bg-zinc-200 dark:active:bg-zinc-800"
                  onPress={() => {
                    settings$.oneHandMode.toggle()
                    setIosMenuOpen(false)
                  }}
                >
                  <MaterialIcons
                    name={oneHandMode ? 'pan-tool' : 'pan-tool-alt'}
                    size={18}
                    color={oneHandMode ? '#818cf8' : '#a1a1aa'}
                  />
                  <Text className="flex-1 text-sm text-zinc-900 dark:text-white">{t('settings.oneHandMode')}</Text>
                  <Text className="text-xs text-zinc-600 dark:text-zinc-400">{oneHandMode ? t('common.on') : t('common.off')}</Text>
                </Pressable>
                <View className="mx-3 my-1 h-px bg-zinc-300 dark:bg-zinc-800" />
                <View className="px-4 pt-2 pb-1">
                  <Text className="text-[11px] uppercase tracking-[1px] text-zinc-600 dark:text-zinc-500">{t('tabs.recentlyClosed')}</Text>
                </View>
                {recentlyClosedTabs.length ? (
                  recentlyClosedTabs.map((tab) => (
                    <Pressable
                      key={tab.id}
                      className="flex-row items-center gap-3 px-4 py-3 active:bg-zinc-200 dark:active:bg-zinc-800"
                      onPress={() => {
                        tabs$.reopenClosedTab(tab.id)
                        setIosMenuOpen(false)
                        closeModal()
                      }}
                    >
                      <ServiceIcon url={tab.url} icon={tab.icon} />
                      <View className="flex-1 min-w-0">
                        <Text className="text-sm text-zinc-900 dark:text-white" numberOfLines={1}>
                          {getTabLabel(tab)}
                        </Text>
                        {tab.title && tab.url && tab.title !== tab.url ? (
                          <Text className="text-xs text-zinc-600 dark:text-zinc-500" numberOfLines={1}>
                            {tab.url}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <View className="px-4 py-4">
                    <Text className="text-sm text-zinc-600 dark:text-zinc-500">{t('tabs.noRecentlyClosed')}</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </BaseModal>
  )
}
