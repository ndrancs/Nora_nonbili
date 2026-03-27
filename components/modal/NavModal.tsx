import { ui$ } from '@/states/ui'
import { useValue } from '@legendapp/state/react'
import { BaseModal } from './BaseModal'
import { services } from '../service/Services'
import { View, Text, Pressable, ScrollView, TouchableHighlight, TextInput } from 'react-native'
import { clsx, nIf } from '@/lib/utils'
import { getHomeUrl } from '@/lib/page'
import { settings$ } from '@/states/settings'
import { tabs$ } from '@/states/tabs'
import { bookmarks$ } from '@/states/bookmarks'
import { Image } from 'expo-image'
import { t } from 'i18next'
import { useState } from 'react'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { NouMenu } from '../menu/NouMenu'
import {
  getEnabledSearchProviders,
  getResolvedSearchProvider,
  resolveSearchUrl,
  resolveUrlInput,
} from '@/lib/search'
import { SearchProviderIcon } from '../service/SearchProviderIcon'

const cls = 'flex-row items-center gap-2 rounded-full bg-sky-50 w-40 py-2 px-3 overflow-hidden'
const inputCls = 'flex-1 pl-3 pr-1 py-3 text-white'

interface NavModalContentProps {
  index?: number
  onOpenUrl?: (url: string, profileId: string) => void
  onSelectProfile?: (profileId: string) => void
  profileId?: string
}

export const NavModalContent: React.FC<NavModalContentProps> = ({
  index = 0,
  onOpenUrl,
  onSelectProfile,
  profileId,
}) => {
  const disabledServices = useValue(settings$.disabledServicesArr)
  const profiles = useValue(settings$.profiles)
  const bookmarks = useValue(bookmarks$.bookmarks)
  const oneHandMode = useValue(settings$.oneHandMode)
  const enabledSearchProviderIds = useValue(settings$.enabledSearchProviderIds)
  const customSearchProviders = useValue(settings$.customSearchProviders)
  const selectedSearchProviderId = useValue(settings$.selectedSearchProviderId)
  const currentTab = useValue(tabs$.tabs[index])
  const [input, setInput] = useState('')
  const selectedProfile = profileId || currentTab?.profile || 'default'
  const enabledSearchProviders = getEnabledSearchProviders(enabledSearchProviderIds, customSearchProviders)
  const selectedSearchProvider =
    getResolvedSearchProvider(selectedSearchProviderId, customSearchProviders) || enabledSearchProviders[0]

  const onPress = (url: string) => {
    if (onOpenUrl) {
      onOpenUrl(url, selectedProfile)
    } else {
      tabs$.updateTabUrl(url, index)
    }
    ui$.assign({ navModalOpen: false })
  }

  const selectProfile = (profileId: string) => {
    if (onSelectProfile) {
      onSelectProfile(profileId)
    } else {
      const tab$ = tabs$.tabs[index]
      if (tab$.get()) {
        tab$.profile.set(profileId)
      }
    }
    ui$.lastSelectedProfileId.set(profileId)
  }

  const submitInput = () => {
    const value = input.trim()
    if (!value || !selectedSearchProvider) {
      return
    }

    const nextUrl =
      selectedSearchProvider.kind === 'url'
        ? resolveUrlInput(value)
        : resolveSearchUrl(selectedSearchProvider.id, value, customSearchProviders)

    if (!nextUrl) {
      return
    }

    onPress(nextUrl)
    setInput('')
  }

  return (
    <View className="p-4 pt-8 bg-gray-950 h-full">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-4 px-4 flex-grow justify-center"
        className="flex-grow-0"
      >
        {profiles.map((profile) => (
          <Pressable key={profile.id} onPress={() => selectProfile(profile.id)}>
            <View
              className={clsx(
                'flex-row items-center gap-2 rounded-full px-4 py-2',
                selectedProfile === profile.id ? 'bg-white/20' : 'bg-white/5',
              )}
            >
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: profile.color }} />
              <Text
                className={clsx('text-sm', selectedProfile === profile.id ? 'text-white font-medium' : 'text-gray-400')}
              >
                {profile.name}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView
        className="flex-1"
        contentContainerClassName={clsx('pb-16 flex-grow', oneHandMode ? 'justify-end pt-[40vh]' : 'justify-center')}
      >
        <View className="mb-8 px-4">
          <View className="flex-row items-center overflow-hidden rounded-[24px] border border-zinc-800 bg-zinc-900">
            <NouMenu
              trigger={
                <View className="h-[52px] w-[48px] items-center justify-center border-r border-zinc-800 bg-zinc-900">
                  {selectedSearchProvider ? <SearchProviderIcon provider={selectedSearchProvider} size={22} /> : null}
                </View>
              }
              items={enabledSearchProviders.map((provider) => ({
                label: provider.name,
                handler: () => settings$.setSelectedSearchProvider(provider.id),
                icon: <SearchProviderIcon provider={provider} />,
              }))}
            />
            <TextInput
              className={inputCls}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={submitInput}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={
                selectedSearchProvider?.kind === 'url' ? t('newTab.search.urlPlaceholder') : t('newTab.search.searchPlaceholder')
              }
              placeholderTextColor="#71717a"
            />
            <Pressable
              onPress={submitInput}
              className="h-[52px] w-[52px] items-center justify-center border-l border-zinc-800 bg-zinc-900 active:bg-zinc-800"
            >
              <MaterialIcons
                name={selectedSearchProvider?.kind === 'url' ? 'arrow-forward' : 'search'}
                color="white"
                size={18}
              />
            </Pressable>
          </View>
        </View>
        <View className="flex-row flex-wrap justify-center gap-x-6 gap-y-7">
          {Object.entries(services).map(([value, [label, icon]]) =>
            nIf(
              !disabledServices.includes(value),
              <TouchableHighlight key={value} onPress={() => onPress(getHomeUrl(value))}>
                <View className={cls}>
                  {icon()}
                  <Text className="text-sm" numberOfLines={1}>
                    {label}
                  </Text>
                </View>
              </TouchableHighlight>,
            ),
          )}
          {bookmarks.map((bookmark, index) => (
            <TouchableHighlight key={index} onPress={() => onPress(bookmark.url)}>
              <View className={cls}>
                <Image source={bookmark.icon} style={{ width: 24, height: 24 }} />
                <Text className="text-sm" numberOfLines={1}>
                  {bookmark.title}
                </Text>
              </View>
            </TouchableHighlight>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

export const NavModal = () => {
  const navModalOpen = useValue(ui$.navModalOpen)

  if (!navModalOpen) {
    return null
  }

  return (
    <BaseModal onClose={() => ui$.navModalOpen.set(false)}>
      <NavModalContent />
    </BaseModal>
  )
}
