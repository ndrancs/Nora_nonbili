import React, { type CSSProperties } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { clsx } from '@/lib/utils'
import { NoraTab } from '@/components/tab/NoraTab'
import { type Tab, tabs$ } from '@/states/tabs'

export const DeckTab: React.FC<{
  tab: Tab
  index: number
  orders: Record<string, number>
}> = ({ tab, index, orders }) => {
  const { attributes, listeners, setNodeRef, transform, transition, over, isOver, active } = useSortable({
    id: tab.id,
  })

  const style: CSSProperties = {
    order: orders[tab.id] ?? index,
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'flex h-full transition-all',
        over && 'pointer-events-none',
        active?.id === tab.id && 'rotate-[1deg] translate-y-[-16px]',
        isOver &&
          active &&
          over &&
          (orders[active.id as string] < orders[over.id as string]
            ? 'border-r-2 border-r-sky-500 pr-2'
            : 'border-l-2 border-l-sky-500 pl-2'),
      )}
      style={style}
      onMouseDown={() => tabs$.setActiveTabIndex(index, 'user')}
      {...attributes}
      {...listeners}
    >
      <NoraTab tab={tab} index={index} desktopVariant="deck" />
    </div>
  )
}
