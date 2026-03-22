import { colors } from '@/lib/colors'
import { Button, ContextMenu, Divider, Host, Section } from '@expo/ui/swift-ui'
import { frame } from '@expo/ui/swift-ui/modifiers'
import type { Item } from './NouMenu'
import { ReactNode } from 'react'

export const NouMenu: React.FC<{ trigger: ReactNode; items: Item[] }> = ({ trigger, items }) => {
  const groups = items.reduce<Item[][]>((acc, item) => {
    if (item.kind === 'separator') {
      acc.push([])
      return acc
    }

    const current = acc[acc.length - 1]
    current.push(item)
    return acc
  }, [[]]).filter((group) => group.length)

  const menuItems = groups.map((group, groupIndex) => {
    const header = group.find((item) => item.kind === 'label')
    const buttons = group
      .filter((item) => item.kind !== 'label')
      .map((item, itemIndex) => (
        <Button key={`${groupIndex}-${itemIndex}`} color={colors.text} onPress={item.handler}>
          {item.label}
        </Button>
      ))

    const content = header ? (
      <Section key={`section-${groupIndex}`} title={header.label}>
        {buttons}
      </Section>
    ) : (
      buttons
    )

    return (
      <>
        {groupIndex > 0 ? <Divider key={`divider-${groupIndex}`} /> : null}
        {content}
      </>
    )
  })

  return (
    <Host matchContents>
      <ContextMenu activationMethod="singlePress">
        <ContextMenu.Items>{menuItems}</ContextMenu.Items>
        <ContextMenu.Trigger>
          <Button variant="borderless" color={colors.icon} systemImage={trigger as any} modifiers={[frame({ width: 44, height: 44 })]} />
        </ContextMenu.Trigger>
      </ContextMenu>
    </Host>
  )
}
