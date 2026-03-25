import { useMemo } from 'react'
import { Platform, Pressable, Switch, View } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useValue } from '@legendapp/state/react'
import { t } from 'i18next'
import { NouText } from '../NouText'
import { clsx } from '@/lib/utils'
import {
  builtinUserStyleDefinitions,
} from '@/lib/user-styles'
import { userStyles$ } from '@/states/user-styles'
import { ui$ } from '@/states/ui'

const surfaceCls = 'overflow-hidden rounded-[24px] border border-zinc-800 bg-zinc-900/70'
const subheaderCls = 'mb-3 text-xs uppercase tracking-[0.18em] text-gray-500'
const rowCls = 'px-4 py-4'
const rowBorderCls = 'border-b border-zinc-800'

const formatHostGlobs = (hostGlobs: string[]) => hostGlobs.join(', ')

export const SettingsUserStylesContent = () => {
  const customStyles = useValue(userStyles$.customStyles)
  const builtins = useValue(userStyles$.builtins)
  const hasStyles = customStyles.length > 0

  const sortedBuiltins = useMemo(() => builtinUserStyleDefinitions, [])

  const startAddCustomStyle = () => {
    ui$.editingUserStyleId.set(null)
    ui$.userStyleModalOpen.set(true)
  }

  const startEditCustomStyle = (id: string) => {
    ui$.editingUserStyleId.set(id)
    ui$.userStyleModalOpen.set(true)
  }

  const startPreviewBuiltin = (id: string) => {
    ui$.previewBuiltinId.set(id)
    ui$.userStyleModalOpen.set(true)
  }

  return (
    <View className="pb-4">
      <View>
        <NouText className={subheaderCls}>{t('settings.userStyles.builtin.label')}</NouText>
        <View className={surfaceCls}>
          {sortedBuiltins.map((definition, index) => (
            <Pressable
              key={definition.id}
              onPress={() => startPreviewBuiltin(definition.id)}
              className={clsx(rowCls, 'flex-row items-center justify-between active:bg-zinc-800/50', index !== sortedBuiltins.length - 1 && rowBorderCls)}
            >
              <View className="flex-1 pr-4">
                <NouText className="font-medium" numberOfLines={1}>
                  {t(definition.labelKey)}
                </NouText>
                <View className="mt-1.5 flex-row items-center gap-1.5">
                  <MaterialIcons name="language" color="#71717a" size={12} />
                  <NouText className="flex-1 text-xs text-zinc-400" numberOfLines={1}>
                    {formatHostGlobs(definition.hostGlobs)}
                  </NouText>
                </View>
              </View>
              <Switch
                value={builtins[definition.id]?.enabled ?? true}
                onValueChange={() => userStyles$.toggleBuiltin(definition.id)}
                trackColor={{ false: '#27272a', true: '#3730a3' }}
                thumbColor={(builtins[definition.id]?.enabled ?? true) ? '#818cf8' : '#71717a'}
                {...Platform.select({
                  ios: { style: { transform: [{ scale: 0.7 }] } },
                })}
              />
            </Pressable>
          ))}
        </View>
      </View>

      <View className="mt-10">
        <View className="mb-3 flex-row items-center justify-between">
          <NouText className={subheaderCls}>{t('settings.userStyles.custom.label')}</NouText>
          <Pressable
            onPress={startAddCustomStyle}
            className="flex-row items-center gap-1 rounded-full bg-indigo-600/10 px-3 py-1.5 active:bg-indigo-600/20"
          >
            <MaterialIcons name="add" color="#818cf8" size={18} />
            <NouText className="text-xs font-semibold text-indigo-400">{t('settings.userStyles.add')}</NouText>
          </Pressable>
        </View>
        <View className={surfaceCls}>
          {!hasStyles ? (
            <View className="items-center justify-center px-6 py-10">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950">
                <MaterialIcons name="brush" color="#3f3f46" size={24} />
              </View>
              <NouText className="mt-4 text-center text-sm leading-6 text-zinc-500">{t('settings.userStyles.custom.empty')}</NouText>
            </View>
          ) : null}
          {customStyles.map((style, index) => (
            <Pressable
              key={style.id}
              onPress={() => startEditCustomStyle(style.id)}
              className={clsx(rowCls, 'flex-row items-center justify-between active:bg-zinc-800/50', index !== customStyles.length - 1 && rowBorderCls)}
            >
              <View className="flex-1 pr-4">
                <NouText className={clsx('font-medium', !style.enabled && 'text-zinc-500')} numberOfLines={1}>
                  {style.name}
                </NouText>
                <View className="mt-1.5 flex-row items-center gap-1.5">
                  <MaterialIcons name="language" color="#71717a" size={12} />
                  <NouText className="flex-1 text-xs text-zinc-400" numberOfLines={1}>
                    {formatHostGlobs(style.hostGlobs)}
                  </NouText>
                </View>
              </View>
              <Switch
                value={style.enabled}
                onValueChange={() => userStyles$.toggleCustomStyle(style.id)}
                trackColor={{ false: '#27272a', true: '#3730a3' }}
                thumbColor={style.enabled ? '#818cf8' : '#71717a'}
                {...Platform.select({
                  ios: { style: { transform: [{ scale: 0.7 }] } },
                })}
              />
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  )
}
