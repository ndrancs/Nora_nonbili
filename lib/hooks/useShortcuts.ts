import { useEffect } from 'react'
import { handleShortcuts } from '@/desktop/src/renderer/lib/shortcuts'

export const useShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      handleShortcuts(e)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
