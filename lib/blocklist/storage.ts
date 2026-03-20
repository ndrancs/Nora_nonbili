import { Directory, File, Paths } from 'expo-file-system'
import { isWeb } from '@/lib/utils'
import type { BlocklistSourceId } from './types'

const MAIN_CHANNEL = 'channel:main'
const STORAGE_DIR_NAME = 'blocklist'
const SOURCE_FILENAMES: Record<BlocklistSourceId, string> = {
  easylist: 'easylist.txt',
  easyprivacy: 'easyprivacy.txt',
}

const hasElectron = () => isWeb && typeof window !== 'undefined' && typeof window.electron !== 'undefined'

function getNativeDocumentUri() {
  if (isWeb) {
    throw new Error('Native blocklist storage is unavailable on web targets')
  }

  const documentUri = Paths.document.uri
  if (!documentUri) {
    throw new Error('Document directory is unavailable')
  }

  return documentUri
}

function getNativeBlocklistDirUri() {
  return `${getNativeDocumentUri()}${STORAGE_DIR_NAME}`
}

function getNativeBlocklistFileUri(id: BlocklistSourceId) {
  return `${getNativeBlocklistDirUri()}/${SOURCE_FILENAMES[id]}`
}

function getNativeBlocklistDir() {
  return new Directory(getNativeBlocklistDirUri())
}

function getNativeBlocklistFile(id: BlocklistSourceId) {
  return new File(getNativeBlocklistFileUri(id))
}

export async function readBlocklistSourceFile(id: BlocklistSourceId) {
  if (hasElectron()) {
    return window.electron.ipcRenderer.invoke(MAIN_CHANNEL, 'readBlocklistSource', id)
  }

  const file = getNativeBlocklistFile(id)
  if (!file.exists) {
    return null
  }
  return file.text()
}

export async function writeBlocklistSourceFile(id: BlocklistSourceId, body: string) {
  if (hasElectron()) {
    return window.electron.ipcRenderer.invoke(MAIN_CHANNEL, 'writeBlocklistSource', id, body)
  }

  const dir = getNativeBlocklistDir()
  if (!dir.exists) {
    dir.create({ idempotent: true, intermediates: true })
  }

  const file = getNativeBlocklistFile(id)
  if (!file.exists) {
    file.create({ overwrite: true, intermediates: true })
  }
  file.write(body)
}

export async function deleteBlocklistSourceFiles(ids: readonly BlocklistSourceId[]) {
  if (hasElectron()) {
    return window.electron.ipcRenderer.invoke(MAIN_CHANNEL, 'deleteBlocklistSources', ids)
  }

  ids.forEach((id) => {
    const file = getNativeBlocklistFile(id)
    if (file.exists) {
      file.delete()
    }
  })
}

export async function hasBlocklistSourceFiles(ids: readonly BlocklistSourceId[]) {
  if (hasElectron()) {
    return window.electron.ipcRenderer.invoke(MAIN_CHANNEL, 'hasBlocklistSourceFiles', ids)
  }

  return ids.every((id) => {
    const file = getNativeBlocklistFile(id)
    return file.exists && file.size > 0
  })
}
