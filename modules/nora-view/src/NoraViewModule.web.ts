import { registerWebModule, NativeModule } from 'expo'
import { mainClient } from '@/desktop/src/renderer/ipc/main'

class NoraViewModule extends NativeModule {
  async clearProfileData(profile: string) {
    if (!window.electron?.ipcRenderer) {
      return
    }

    await mainClient.clearProfileData(profile)
  }
}

export default registerWebModule(NoraViewModule, 'NoraViewModule')
