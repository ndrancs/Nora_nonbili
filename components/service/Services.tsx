import { ReactNode } from 'react'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import {
  IconBluesky,
  IconFacebook,
  IconInstagram,
  IconLinkedIn,
  IconReddit,
  IconThreads,
  IconTikTok,
  IconTumblr,
  IconTwitter,
  IconVK,
  IconFacebookMessenger,
} from '../icons/Icons'
import { Image } from 'expo-image'
import { View } from 'react-native'
import { clsx, isWeb } from '@/lib/utils'
import { NouText } from '../NouText'
import { NouSwitch } from '../switch/NouSwitch'
import { settings$ } from '@/states/settings'
import { useValue } from '@legendapp/state/react'
import { hostHomes } from '@/content/css'
import { t } from 'i18next'

export const services: Record<string, [string, () => ReactNode]> = {
  bluesky: ['Bluesky', () => <IconBluesky />],
  facebook: ['Facebook', () => <IconFacebook />],
  'facebook-messenger': ['Facebook Messenger', () => <IconFacebookMessenger />],
  instagram: ['Instagram', () => <IconInstagram />],
  linkedin: ['LinkedIn', () => <IconLinkedIn />],
  reddit: ['Reddit', () => <IconReddit />],
  threads: ['Threads', () => <IconThreads />],
  tiktok: ['TikTok', () => <IconTikTok />],
  tumblr: ['Tumblr', () => <IconTumblr />],
  vk: ['VK', () => <IconVK />],
  x: ['X', () => <IconTwitter />],
}

export const ServiceManager: React.FC<{ hideTitle?: boolean }> = ({ hideTitle = false }) => {
  const disabledServices = useValue(settings$.disabledServicesArr)
  const entries = Object.entries(services)

  return (
    <View className="">
      {!hideTitle ? <NouText className="font-medium mb-2">{t('settings.services')}</NouText> : null}
      {entries.map(([value, [label, icon]], index) => (
        <View className={clsx('px-4 py-4', index !== entries.length - 1 && 'border-b border-zinc-800')} key={value}>
          <NouSwitch
            label={
              <View className="flex-row items-center gap-2">
                {icon()}
                <NouText>{label}</NouText>
              </View>
            }
            value={!disabledServices.includes(value)}
            onPress={() => settings$.toggleService(value)}
          />
        </View>
      ))}
    </View>
  )
}

export const ServiceIcon: React.FC<{ url: string; icon?: string }> = ({ url, icon }) => {
  const size = isWeb ? 20 : 24
  const fallbackColor = url ? '#52525b' : '#a1a1aa'

  if (icon) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Image source={icon} style={{ width: size, height: size }} contentFit="contain" />
      </View>
    )
  }

  let home: any
  try {
    const { host } = new URL(url)
    home = hostHomes[host]
  } catch {}

  const fallback = services[home]?.[1]?.()
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {fallback || <MaterialIcons name="language" size={Math.max(16, size - 4)} color={fallbackColor} />}
    </View>
  )
}
