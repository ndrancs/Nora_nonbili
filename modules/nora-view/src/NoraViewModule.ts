import { NativeModule, requireNativeModule } from 'expo'

declare class NoraViewModule extends NativeModule {
  clearProfileData(profile: string): Promise<void>
  openExternalUrl(url: string): Promise<boolean>
  reloadBlocklistFromDisk?(enabled: boolean, revision: number): Promise<void>
  reloadBlocklistFromSourceFiles?(enabled: boolean, revision: number): Promise<boolean>
}

export default requireNativeModule<NoraViewModule>('NoraView')
