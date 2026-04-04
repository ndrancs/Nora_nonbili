import { Pressable, View } from 'react-native'
import { clsx, isWeb, isIos } from '@/lib/utils'
import { useValue } from '@legendapp/state/react'
import { NouText } from '../NouText'
import { settings$, Profile } from '@/states/settings'
import { NouMenu } from '../menu/NouMenu'
import { t } from 'i18next'
import { MaterialButton } from '../button/IconButtons'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { ui$ } from '@/states/ui'

export const ProfileManager = () => {
  const profiles = useValue(settings$.profiles)

  const startEdit = (profile: Profile) => {
    ui$.assign({
      profileModalOpen: true,
      editingProfileId: profile.id,
    })
  }

  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-3">
        <NouText className="font-medium">{t('profiles.label')}</NouText>
        <Pressable
          onPress={() =>
            ui$.assign({
              profileModalOpen: true,
            })
          }
        >
          <MaterialIcons name="add-circle-outline" size={22} color="#6366f1" />
        </Pressable>
      </View>

      {profiles.map((profile, index) => (
        <View
          key={profile.id}
          className={clsx(
            'border-x border-zinc-300 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900/70 px-4 py-2',
            index === 0 && 'rounded-t-[20px] border-t',
            index !== 0 && 'border-t',
            index === profiles.length - 1 && 'rounded-b-[20px] border-b',
          )}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: profile.color }} />
              <NouText>{profile.name}</NouText>
              {profile.isDefault && <MaterialIcons name="lock-outline" size={14} color="#9ca3af" />}
            </View>
            <NouMenu
              trigger={isWeb ? <MaterialButton name="more-vert" /> : isIos ? 'ellipsis' : 'filled.MoreVert'}
              items={[
                { label: t('common.edit'), handler: () => startEdit(profile) },
                ...(profile.isDefault
                  ? []
                  : [{ label: t('menus.delete'), handler: () => settings$.deleteProfile(profile.id) }]),
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  )
}
