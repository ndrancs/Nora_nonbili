import { ui$ } from '@/states/ui'
import { useValue } from '@legendapp/state/react'
import { BaseModal } from './BaseModal'
import { ServiceIcon } from '../service/Services'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { clsx, isWeb, isIos, nIf } from '@/lib/utils'
import { settings$ } from '@/states/settings'
import { Tab, tabs$ } from '@/states/tabs'
import { NouMenu } from '../menu/NouMenu'
import { NouButton } from '../button/NouButton'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { t } from 'i18next'
import { colors } from '@/lib/colors'
import { getProfileColor } from '@/lib/profile'

const getTabLabel = (tab?: Pick<Tab, 'title' | 'url'> | null) => tab?.title || tab?.url || t('tabs.new')

export const TabModal = () => {
  const tabModalOpen = useValue(ui$.tabModalOpen)
  const oneHandMode = useValue(settings$.oneHandMode)
  const { tabs, activeTabIndex, recentlyClosedTabs } = useValue(tabs$)

  if (!tabModalOpen) {
    return null
  }

  const onPress = (index: number) => {
    tabs$.setActiveTabIndex(index, 'user')
    ui$.assign({ tabModalOpen: false })
  }

  const closeModal = () => ui$.tabModalOpen.set(false)

  const menuItems = [
    {
      label: isIos
        ? `${t('settings.oneHandMode')} (${oneHandMode ? t('common.on') : t('common.off')})`
        : t('settings.oneHandMode'),
      icon: <MaterialIcons name={oneHandMode ? 'pan-tool' : 'pan-tool-alt'} size={18} color={oneHandMode ? '#818cf8' : '#71717a'} />,
      meta: isIos
        ? undefined
        : (
            <View
              className={clsx(
                'rounded-full px-2 py-1',
                oneHandMode ? 'bg-indigo-500/20 border border-indigo-400/40' : 'bg-zinc-800 border border-zinc-700',
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
            onPress={() => {
              tabs$.openTab('')
              closeModal()
            }}
          >
            <MaterialIcons name="add" size={20} />
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
            <NouMenu
              trigger={
                isWeb ? <MaterialIcons name="more-vert" size={20} color={colors.icon} /> : isIos ? 'ellipsis' : 'filled.MoreVert'
              }
              items={menuItems}
            />
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
              <MaterialIcons name="close" size={20} color={colors.icon} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </BaseModal>
  )
}
