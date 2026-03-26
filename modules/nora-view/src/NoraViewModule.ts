import { NativeModule, requireNativeModule } from 'expo'

declare class NoraViewModule extends NativeModule {
  clearProfileData(profile: string): Promise<void>
  openExternalUrl(url: string): Promise<boolean>
}

export default requireNativeModule<NoraViewModule>('NoraView')
