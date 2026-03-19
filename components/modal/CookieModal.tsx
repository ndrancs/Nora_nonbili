import { NoraView } from '@/modules/nora-view'
import { getUserAgent } from '@/lib/useragent'
import { clsx, isIos } from '@/lib/utils'
import { showToast } from '@/lib/toast'
import { settings$ } from '@/states/settings'
import { tabs$ } from '@/states/tabs'
import { ui$ } from '@/states/ui'
import { useValue } from '@legendapp/state/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { NouButton } from '../button/NouButton'
import { NouText } from '../NouText'
import { BaseCenterModal } from './BaseCenterModal'

type InjectionRequest = {
  id: number
  entries: string[]
  profileId: string
  url: string
  desktopMode?: boolean
}

type TabLike = {
  url?: string
  profile?: string
  desktopMode?: boolean
}

const getCookieEntries = (value: string) =>
  value
    .split(';')
    .map((entry) => entry.trim())
    .filter((entry) => entry.includes('='))

const buildCookieScript = (entries: string[]) => `(() => {
  const entries = ${JSON.stringify(entries)};
  for (const entry of entries) {
    document.cookie = entry + '; path=/; max-age=31536000';
  }
  return document.cookie;
})()`

const getHost = (url?: string) => {
  if (!url) {
    return ''
  }

  try {
    return new URL(url).host
  } catch {
    return ''
  }
}

const getInjectionContext = (tabs: TabLike[], activeTabIndex: number, profileId: string) => {
  const toContext = (tab?: TabLike | null) => {
    const url = tab?.url?.trim()
    if (!url) {
      return null
    }
    return {
      url,
      desktopMode: tab?.desktopMode,
    }
  }

  const selectedProfileTab = tabs.find((tab) => tab?.profile === profileId && tab?.url?.trim())

  return (
    toContext(selectedProfileTab) ||
    toContext(tabs[activeTabIndex]) ||
    toContext(tabs.find((tab) => tab?.url?.trim())) ||
    null
  )
}

export const CookieModal = () => {
  const cookieModalOpen = useValue(ui$.cookieModalOpen)
  const profiles = useValue(settings$.profiles)
  const tabs = useValue(tabs$.tabs)
  const activeTabIndex = useValue(tabs$.activeTabIndex)
  const lastSelectedProfileId = useValue(ui$.lastSelectedProfileId)

  const currentTab = tabs[activeTabIndex]

  const [text, setText] = useState('')
  const [selectedProfileId, setSelectedProfileId] = useState('default')
  const [submitting, setSubmitting] = useState(false)
  const [injectorReady, setInjectorReady] = useState(false)
  const [request, setRequest] = useState<InjectionRequest | null>(null)

  const effectiveProfileId = selectedProfileId || currentTab?.profile || 'default'
  const injectionContext = getInjectionContext(tabs, activeTabIndex, effectiveProfileId)

  const injectorRef = useRef<any>(null)
  const requestRef = useRef<InjectionRequest | null>(null)
  const startedRequestIdRef = useRef<number | null>(null)

  const resetState = useCallback(() => {
    setText('')
    setSubmitting(false)
    setInjectorReady(false)
    setRequest(null)
    requestRef.current = null
    startedRequestIdRef.current = null
    injectorRef.current = null
  }, [])

  const onClose = useCallback(() => {
    resetState()
    ui$.cookieModalOpen.set(false)
  }, [resetState])

  useEffect(() => {
    if (!cookieModalOpen) {
      resetState()
      return
    }

    setSelectedProfileId(currentTab?.profile || lastSelectedProfileId || profiles[0]?.id || 'default')
    setText('')
    setSubmitting(false)
    setInjectorReady(false)
    setRequest(null)
    requestRef.current = null
    startedRequestIdRef.current = null
  }, [cookieModalOpen, currentTab?.profile, lastSelectedProfileId, profiles, resetState])

  useEffect(() => {
    requestRef.current = request
  }, [request])

  const onInjectorRef = useCallback((ref: any) => {
    injectorRef.current = ref
    setInjectorReady(Boolean(ref))
  }, [])

  useEffect(() => {
    if (!request || !injectorReady || !injectorRef.current) {
      return
    }

    const injector = injectorRef.current
    const timer = setTimeout(() => {
      if (requestRef.current?.id !== request.id || injectorRef.current !== injector) {
        return
      }

      void Promise.resolve(injector.loadUrl(request.url)).catch(() => {
        if (requestRef.current?.id !== request.id) {
          return
        }
        showToast('Failed to open the target website')
        setSubmitting(false)
        setRequest(null)
        requestRef.current = null
      })
    }, 50)

    return () => clearTimeout(timer)
  }, [injectorReady, request])

  const onInjectorLoad = useCallback(async (e: { nativeEvent?: { url?: string } }) => {
    const activeRequest = requestRef.current
    const injector = injectorRef.current
    const loadedHost = getHost(e.nativeEvent?.url)

    if (!activeRequest || !injector || !loadedHost || startedRequestIdRef.current === activeRequest.id) {
      return
    }

    startedRequestIdRef.current = activeRequest.id

    try {
      await Promise.resolve(injector.executeJavaScript(buildCookieScript(activeRequest.entries)))

      const activeProfileId = tabs$.currentTab()?.profile || 'default'
      if (activeProfileId === activeRequest.profileId) {
        const webview = ui$.webview.get()
        void Promise.resolve(webview?.executeJavaScript?.('document.location.reload()')).catch(() => {})
      }

      const profileName =
        settings$.profiles.get().find((profile) => profile.id === activeRequest.profileId)?.name || 'selected profile'
      showToast(`Injected ${activeRequest.entries.length} cookies into ${profileName}`)
      onClose()
    } catch {
      showToast('Failed to inject cookie')
      setSubmitting(false)
      setRequest(null)
      requestRef.current = null
      startedRequestIdRef.current = null
    }
  }, [onClose])

  const onSubmit = useCallback(() => {
    const entries = getCookieEntries(text.trim())
    if (!entries.length) {
      showToast('Invalid cookie header')
      return
    }

    if (!injectionContext?.url) {
      showToast('Open any page before injecting cookies')
      return
    }

    ui$.lastSelectedProfileId.set(effectiveProfileId)
    setSubmitting(true)
    setInjectorReady(false)
    setRequest({
      id: Date.now(),
      entries,
      profileId: effectiveProfileId,
      url: injectionContext.url,
      desktopMode: injectionContext.desktopMode,
    })
  }, [effectiveProfileId, injectionContext, text])

  if (!cookieModalOpen) {
    return null
  }

  const canSubmit = Boolean(text.trim() && injectionContext?.url && !submitting)

  return (
    <BaseCenterModal onClose={onClose}>
      <View className="w-full p-5">
        <NouText className="text-lg font-semibold">Inject cookies into a profile</NouText>
        <NouText className="mt-2 text-sm leading-6 text-gray-400">
          Paste a Cookie header and choose which profile should receive it.
        </NouText>

        <View className="mt-5">
          <NouText className="mb-3 text-sm font-medium text-gray-200">Target profile</NouText>
          <View className="flex-row flex-wrap gap-2">
            {profiles.map((profile) => {
              const selected = profile.id === selectedProfileId
              return (
                <Pressable
                  key={profile.id}
                  disabled={submitting}
                  onPress={() => setSelectedProfileId(profile.id)}
                >
                  <View
                    className={clsx(
                      'flex-row items-center gap-2 rounded-full border px-4 py-2',
                      selected ? 'border-white bg-white/10' : 'border-zinc-800 bg-zinc-900',
                    )}
                  >
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: profile.color }} />
                    <NouText className={clsx(selected ? 'text-white' : 'text-gray-400')}>{profile.name}</NouText>
                  </View>
                </Pressable>
              )
            })}
          </View>
        </View>

        <View className="mt-5">
          <NouText className="mb-3 text-sm font-medium text-gray-200">Cookie header</NouText>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            className="min-h-[144px] rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-white"
            editable={!submitting}
            multiline
            onChangeText={setText}
            placeholder="auth_token=xxx; ct0=xxx"
            placeholderTextColor="#71717a"
            style={{ textAlignVertical: 'top' }}
            value={text}
          />
          <NouText className="mt-2 text-xs leading-5 text-gray-500">
            Paste the full Cookie request header value from a signed-in browser session.
          </NouText>
          {!injectionContext?.url ? (
            <NouText className="mt-2 text-xs leading-5 text-amber-300">
              Open any page once before injecting cookies.
            </NouText>
          ) : null}
        </View>

        <View className="mt-6 flex-row gap-3">
          <NouButton className="flex-1" variant="outline" onPress={onClose} disabled={submitting}>
            Close
          </NouButton>
          <NouButton className="flex-1" onPress={onSubmit} disabled={!canSubmit} loading={submitting}>
            Inject
          </NouButton>
        </View>

        {request ? (
          <View pointerEvents="none" style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}>
            <NoraView
              key={`${request.id}:${request.profileId}`}
              ref={onInjectorRef}
              profile={request.profileId}
              useragent={getUserAgent(isIos ? 'ios' : 'android', request.desktopMode)}
              onLoad={onInjectorLoad}
            />
          </View>
        ) : null}
      </View>
    </BaseCenterModal>
  )
}
