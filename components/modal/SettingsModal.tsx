import { BackHandler, Linking, Pressable, ScrollView, View, useWindowDimensions } from 'react-native'
import { NouText } from '../NouText'
import { version } from '../../package.json'
import { version as desktopVersion } from '../../desktop/package.json'
import { PropsWithChildren, useCallback, useEffect, useState } from 'react'
import { clsx, isIos, isWeb } from '@/lib/utils'
import { useValue } from '@legendapp/state/react'
import { settings$ } from '@/states/settings'
import { ui$ } from '@/states/ui'
import { BaseModal } from './BaseModal'
import {
  SettingsBrowsingContent,
  SettingsAppearanceContent,
  SettingsProfilesContent,
  SettingsBookmarksContent,
} from './SettingsModalTabSettings'
import { SettingsUserStylesContent } from './SettingsUserStylesContent'
import { t } from 'i18next'
import { SettingsModalTabSync } from './SettingsModalTabSync'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { auth$ } from '@/states/auth'
import { capitalize } from 'es-toolkit'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supportsRuntimeBlocklist } from '@/lib/blocklist'

const repo = 'https://github.com/nonbili/Nora'
const donateLinks = [
  { label: 'GitHub Sponsors', detail: 'github.com/sponsors/rnons', url: 'https://github.com/sponsors/rnons' },
  { label: 'Liberapay', detail: 'liberapay.com/rnons', url: 'https://liberapay.com/rnons' },
  { label: 'PayPal', detail: 'paypal.me/rnons', url: 'https://paypal.me/rnons' },
]
const surfaceCls = 'overflow-hidden rounded-[24px] border border-zinc-800 bg-zinc-900/70'
const sectionLabelCls = 'mb-2 px-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500'
const iconWrapCls = 'h-10 w-10 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950'

type SettingsPage = 'home' | 'browsing' | 'styles' | 'appearance' | 'profiles' | 'bookmarks' | 'sync' | 'about'

const SettingsSection = ({ label, children }: PropsWithChildren<{ label?: string }>) => {
  return (
    <View>
      {label ? <NouText className={sectionLabelCls}>{label}</NouText> : null}
      {children}
    </View>
  )
}

const SettingsNavRow: React.FC<{
  title: string
  description: string
  icon: keyof typeof MaterialIcons.glyphMap
  meta?: string
  onPress: () => void
  isLast?: boolean
}> = ({ title, description, icon, meta, onPress, isLast = false }) => {
  return (
    <Pressable
      onPress={onPress}
      className={clsx('flex-row items-center gap-3 px-4 py-4 active:bg-zinc-800/80', !isLast && 'border-b border-zinc-800')}
    >
      <View className={iconWrapCls}>
        <MaterialIcons name={icon} color="#d4d4d8" size={18} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <NouText className="flex-1 font-medium">{title}</NouText>
          {meta ? <NouText className="text-xs uppercase tracking-[0.16em] text-zinc-500">{meta}</NouText> : null}
        </View>
        <NouText className="mt-1 text-sm leading-5 text-zinc-400">{description}</NouText>
      </View>
      <MaterialIcons name="chevron-right" color="#71717a" size={20} />
    </Pressable>
  )
}

const SettingsExternalRow: React.FC<{
  title: string
  detail: string
  href: string
  icon?: keyof typeof MaterialIcons.glyphMap
  isLast?: boolean
}> = ({ title, detail, href, icon = 'open-in-new', isLast = false }) => {
  return (
    <Pressable
      onPress={() => {
        void Linking.openURL(href)
      }}
      className={clsx('flex-row items-center gap-3 px-4 py-4 active:bg-zinc-800/80', !isLast && 'border-b border-zinc-800')}
    >
      <View className={iconWrapCls}>
        <MaterialIcons name={icon} color="#d4d4d8" size={18} />
      </View>
      <View className="flex-1">
        <NouText className="font-medium">{title}</NouText>
        <NouText className="mt-1 text-sm leading-5 text-zinc-400">{detail}</NouText>
      </View>
      <MaterialIcons name="chevron-right" color="#71717a" size={20} />
    </Pressable>
  )
}

function formatPlanLabel(plan?: string) {
  return plan ? capitalize(plan) : 'Free'
}

export const SettingsModal = () => {
  const settingsModalOpen = useValue(ui$.settingsModalOpen)
  const urlModalOpen = useValue(ui$.urlModalOpen)
  const cookieModalOpen = useValue(ui$.cookieModalOpen)
  const profileModalOpen = useValue(ui$.profileModalOpen)
  const theme = useValue(settings$.theme)
  const { user, plan } = useValue(auth$)
  const { width } = useWindowDimensions()
  const [pageStack, setPageStack] = useState<SettingsPage[]>(['home'])

  const isNarrowNative = !isWeb && width < 768
  const currentPage = pageStack[pageStack.length - 1]
  const canGoBack = pageStack.length > 1
  const appVersion = isWeb ? desktopVersion : version
  const planLabel = formatPlanLabel(plan)
  const themeLabel =
    theme === 'dark' ? t('settings.theme.dark') : theme === 'light' ? t('settings.theme.light') : t('settings.theme.system')
  const showBlocklist = supportsRuntimeBlocklist()
  const showBrowsing = !isWeb || showBlocklist
  const showSync = !isIos
  const browsingDescription = !isWeb ? t('settings.browsing.descriptionNative') : t('settings.browsing.descriptionWeb')

  useEffect(() => {
    if (!settingsModalOpen) {
      setPageStack(['home'])
    }
  }, [settingsModalOpen])

  const closeSettingsChildren = useCallback(() => {
    ui$.assign({
      urlModalOpen: false,
      cookieModalOpen: false,
      profileModalOpen: false,
      editingProfileId: null,
    })
  }, [])

  const closeSettingsTree = useCallback(() => {
    closeSettingsChildren()
    ui$.settingsModalOpen.set(false)
  }, [closeSettingsChildren])

  const closeTopOverlay = useCallback(() => {
    if (profileModalOpen) {
      ui$.assign({ profileModalOpen: false, editingProfileId: null })
      return true
    }
    if (cookieModalOpen) {
      ui$.cookieModalOpen.set(false)
      return true
    }
    if (urlModalOpen) {
      ui$.urlModalOpen.set(false)
      return true
    }
    return false
  }, [cookieModalOpen, profileModalOpen, urlModalOpen])

  const pushPage = useCallback((page: SettingsPage) => {
    setPageStack((stack) => (stack[stack.length - 1] === page ? stack : stack.concat(page)))
  }, [])

  const popPage = useCallback(() => {
    setPageStack((stack) => (stack.length > 1 ? stack.slice(0, -1) : stack))
  }, [])

  const handleBack = useCallback(() => {
    if (closeTopOverlay()) {
      return true
    }
    if (canGoBack) {
      popPage()
      return true
    }
    closeSettingsTree()
    return true
  }, [canGoBack, closeSettingsTree, closeTopOverlay, popPage])

  useEffect(() => {
    if (!settingsModalOpen || isWeb) {
      return
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBack)
    return () => subscription.remove()
  }, [handleBack, settingsModalOpen])

  useEffect(() => {
    if (!settingsModalOpen || !isWeb || typeof window === 'undefined' || !window.addEventListener) {
      return
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') {
        return
      }
      handleBack()
      e.preventDefault()
      e.stopPropagation()
    }

    window.addEventListener('keyup', onKeyUp, true)
    return () => window.removeEventListener('keyup', onKeyUp, true)
  }, [handleBack, settingsModalOpen])

  const pageMeta: Record<SettingsPage, string> = {
    home: t('settings.label'),
    browsing: t('settings.pages.browsing'),
    styles: t('settings.userStyles.label'),
    appearance: t('settings.pages.appearance'),
    profiles: t('settings.pages.profiles'),
    bookmarks: t('settings.pages.bookmarks'),
    sync: t('sync.label'),
    about: t('about.label'),
  }

  const renderPage = () => {
    if (currentPage === 'home') {
      return (
        <View className="gap-8">
          <SettingsSection label={t('settings.sections.experience')}>
            <View className={surfaceCls}>
              {showBrowsing ? (
                <SettingsNavRow
                  title={t('settings.pages.browsing')}
                  description={browsingDescription}
                  icon="tune"
                  onPress={() => pushPage('browsing')}
                  isLast={isWeb}
                />
              ) : null}
              {!isWeb ? (
                <SettingsNavRow
                  title={t('settings.pages.appearance')}
                  description={t('settings.appearance.description')}
                  icon="palette"
                  meta={themeLabel}
                  onPress={() => pushPage('appearance')}
                />
              ) : null}
              <SettingsNavRow
                title={t('settings.userStyles.label')}
                description={t('settings.userStyles.hint')}
                icon="brush"
                onPress={() => pushPage('styles')}
                isLast
              />
            </View>
          </SettingsSection>

          <SettingsSection label={t('settings.sections.accounts')}>
            <View className={surfaceCls}>
              <SettingsNavRow
                title={t('settings.pages.profiles')}
                description={t('settings.profiles.description')}
                icon="people"
                onPress={() => pushPage('profiles')}
              />
              <SettingsNavRow
                title={t('settings.pages.bookmarks')}
                description={t('settings.bookmarks.description')}
                icon="bookmark"
                onPress={() => pushPage('bookmarks')}
                isLast={!showSync}
              />
              {showSync ? (
                <SettingsNavRow
                  title={t('sync.label')}
                  description={user?.email || t('sync.hint')}
                  icon="sync"
                  meta={planLabel}
                  onPress={() => pushPage('sync')}
                  isLast
                />
              ) : null}
            </View>
          </SettingsSection>

          <SettingsSection label={t('settings.sections.about')}>
            <View className={surfaceCls}>
              <SettingsNavRow
                title={t('about.label')}
                description={t('about.hint')}
                icon="info-outline"
                meta={`v${appVersion}`}
                onPress={() => pushPage('about')}
                isLast
              />
            </View>
          </SettingsSection>
        </View>
      )
    }

    if (currentPage === 'browsing') return <SettingsBrowsingContent />
    if (currentPage === 'styles') return <SettingsUserStylesContent />
    if (currentPage === 'appearance') return <SettingsAppearanceContent />
    if (currentPage === 'profiles') return <SettingsProfilesContent />
    if (currentPage === 'bookmarks') return <SettingsBookmarksContent />

    if (currentPage === 'sync' && showSync) {
      return <SettingsModalTabSync />
    }

    return (
      <View className="gap-6">
        <View className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 px-5 py-5">
          <NouText className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Nora</NouText>
          <NouText className="mt-2 text-xl font-semibold tracking-tight">v{appVersion}</NouText>
        </View>

        <SettingsSection label={t('about.code')}>
          <View className={surfaceCls}>
            <SettingsExternalRow title="GitHub" detail="github.com/nonbili/Nora" href={repo} icon="code" isLast />
          </View>
        </SettingsSection>

        <SettingsSection label={t('about.donate')}>
          <View className={surfaceCls}>
            {donateLinks.map((item, index) => (
              <SettingsExternalRow
                key={item.url}
                title={item.label}
                detail={item.detail}
                href={item.url}
                isLast={index === donateLinks.length - 1}
              />
            ))}
          </View>
        </SettingsSection>
      </View>
    )
  }

  const content = (
    <View className="flex-1 bg-zinc-950">
      <View className="border-b border-zinc-800 px-3 py-3">
        <View className="flex-row items-center gap-2">
          <Pressable onPress={handleBack} className="h-11 w-11 items-center justify-center rounded-full bg-zinc-900">
            <MaterialIcons name={canGoBack ? 'arrow-back' : 'close'} color="white" size={22} />
          </Pressable>
          <View className="flex-1">
            <NouText className="text-lg font-semibold">{pageMeta[currentPage]}</NouText>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-5">
          {renderPage()}
          <View className="h-16" />
        </View>
      </ScrollView>
    </View>
  )

  if (!settingsModalOpen) {
    return null
  }

  return isNarrowNative ? (
    <View className="absolute inset-0 z-10 bg-zinc-950">
      <SafeAreaView className="flex-1" edges={['top']}>
        {content}
      </SafeAreaView>
    </View>
  ) : (
    <BaseModal onClose={closeSettingsTree} onRequestClose={handleBack} className="bg-transparent">
      {content}
    </BaseModal>
  )
}
