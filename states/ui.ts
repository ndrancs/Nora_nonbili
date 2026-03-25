import { observable } from '@legendapp/state'

interface Store {
  url: string
  title: string

  // header
  headerHeight: number
  headerShown: boolean

  // modals
  bookmarkModalOpen: boolean
  cookieModalOpen: boolean
  downloadVideoModalUrl: string
  navModalOpen: boolean
  profileModalOpen: boolean
  editingProfileId: string | null
  lastSelectedProfileId: string
  renameViewModalTargetViewId: string | null
  settingsModalOpen: boolean
  tabModalOpen: boolean
  toolsModalOpen: boolean
  urlModalOpen: boolean

  // webview
  activeCanGoBack: boolean
  webview: any
}

export const ui$ = observable<Store>({
  url: '',
  title: '',

  // header
  headerHeight: 0,
  headerShown: true,

  // modals
  bookmarkModalOpen: false,
  cookieModalOpen: false,
  downloadVideoModalUrl: '',
  navModalOpen: false,
  profileModalOpen: false,
  editingProfileId: null,
  renameViewModalTargetViewId: null,
  settingsModalOpen: false,
  tabModalOpen: false,
  toolsModalOpen: false,
  urlModalOpen: false,
  lastSelectedProfileId: 'default',

  // webview
  activeCanGoBack: false,
  webview: undefined,
})
