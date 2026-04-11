import contentJs from 'nora/assets/scripts/main.bjs?raw'
import { MainPage } from 'nora/components/page/MainPage'
import { Toaster } from 'react-hot-toast'
import { useObserveEffect } from '@legendapp/state/react'
import { useEffect } from 'react'
import { initUiChannel } from './ipc/ui'
import { handleShortcuts } from './lib/shortcuts'

function App(): React.JSX.Element {
  useEffect(() => {
    initUiChannel()
    window.addEventListener('keydown', handleShortcuts)
    return () => window.removeEventListener('keydown', handleShortcuts)
  }, [])

  return (
    <>
      <MainPage contentJs={contentJs} />
      <Toaster position="bottom-right" />
    </>
  )
}
export default App
