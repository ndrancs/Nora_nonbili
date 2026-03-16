import { openDownloadWindow } from 'main/lib/download-window.js'
import { MAIN_CHANNEL } from './constants.js'
import { ipcMain, session } from 'electron'
import {
  deleteDesktopBlocklistSources,
  hasDesktopBlocklistSourceFiles,
  readDesktopBlocklistSource,
  setDesktopBlocklist,
  writeDesktopBlocklistSource,
} from '../lib/blocklist.js'

const interfaces = {
  clearData: () => {
    session.fromPartition('persist:webview').clearData()
  },
  fetchText: async (url: string, headers: Record<string, string> = {}) => {
    const res = await fetch(url, { headers })
    return {
      status: res.status,
      body: await res.text(),
      headers: {
        etag: res.headers.get('etag') || undefined,
        'last-modified': res.headers.get('last-modified') || undefined,
      },
    }
  },
  downloadVideo: (url: string) => {
    openDownloadWindow(url)
  },
  deleteBlocklistSources: deleteDesktopBlocklistSources,
  hasBlocklistSourceFiles: hasDesktopBlocklistSourceFiles,
  readBlocklistSource: readDesktopBlocklistSource,
  writeBlocklistSource: writeDesktopBlocklistSource,
  setBlocklist: setDesktopBlocklist,
}

export type MainInterface = typeof interfaces
type MainInterfaceKey = keyof MainInterface

function setupChannel() {
  ipcMain.handle(MAIN_CHANNEL, (_, name: string, ...args) => {
    console.log(MAIN_CHANNEL, name, JSON.stringify(args).slice(0, 100))
    const fn = interfaces[name as MainInterfaceKey]
    if (!fn) {
      console.error(`${fn} unimplemented`)
      return
    }
    // @ts-expect-error ??
    return fn(...args)
  })
}

export function initMainChannel() {
  setupChannel()
}
