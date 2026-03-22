import { NativeModule, requireNativeModule } from 'expo'

declare class NoraViewModule extends NativeModule {
  clearProfileData(profile: string): Promise<void>
}

export default requireNativeModule<NoraViewModule>('NoraView')
