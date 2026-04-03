import { Profile } from '@/states/settings'
import { clsx } from '@/lib/utils'
import { Pressable, View } from 'react-native'
import { NouText } from '../NouText'

type ProfileSelectorChipsProps = {
  profiles: Profile[]
  selectedProfileId: string
  onSelectProfile: (profileId: string) => void
  disabled?: boolean
  containerClassName?: string
}

export const ProfileSelectorChips: React.FC<ProfileSelectorChipsProps> = ({
  profiles,
  selectedProfileId,
  onSelectProfile,
  disabled = false,
  containerClassName,
}) => {
  return (
    <View className={clsx('flex-row flex-wrap gap-2', containerClassName)}>
      {profiles.map((profile) => {
        const selected = selectedProfileId === profile.id
        return (
          <Pressable
            key={profile.id}
            onPress={() => onSelectProfile(profile.id)}
            disabled={disabled}
            className={clsx(disabled && 'opacity-60')}
          >
            <View
              className={clsx(
                'flex-row items-center gap-2 rounded-full px-4 py-2 border',
                selected
                  ? 'bg-indigo-100 dark:bg-indigo-500/20 border-indigo-500 dark:border-indigo-400'
                  : 'bg-zinc-200 dark:bg-white/5 border-zinc-300 dark:border-zinc-700/60',
              )}
            >
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: profile.color }} />
              <NouText
                className={clsx(
                  'text-sm',
                  selected
                    ? 'text-zinc-900 dark:text-indigo-100 font-semibold'
                    : 'text-zinc-600 dark:text-gray-400',
                )}
              >
                {profile.name}
              </NouText>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}
