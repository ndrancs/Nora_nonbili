import { syncState, when } from '@legendapp/state'
import NoraViewModule from '@/modules/nora-view'
import { isWeb, isIos, isAndroid } from '@/lib/utils'
import { settings$ } from '@/states/settings'
import { blocklist$ } from '@/states/blocklist'
import { mergeFilterLists, mergeFilterListsAsync } from './parser'
import { shouldAutoRefresh } from './policy'
import { createWorkletRuntime, runOnRuntime, type WorkletRuntime } from 'react-native-worklets'
import {
  deleteBlocklistSourceFiles,
  hasBlocklistSourceFiles,
  readBlocklistSourceFile,
  writeBlocklistSourceFile,
} from './storage'
import {
  BLOCKLIST_SOURCE_IDS,
  BlocklistFetchSourceResult,
  BlocklistMatcherData,
  BlocklistPayload,
  BlocklistSnapshot,
  BlocklistSourceId,
  DesktopBlocklistPayload,
  RemoteTextResponse,
} from './types'

const MAIN_CHANNEL = 'channel:main'

const hasElectron = () => isWeb && typeof window !== 'undefined' && typeof window.electron !== 'undefined'

let payloadCache:
  | {
      revision: number
      matcherData: BlocklistMatcherData
      payload: BlocklistPayload
    }
  | undefined

let workletRuntime: WorkletRuntime | undefined
if (isIos || isAndroid) {
  try {
    workletRuntime = createWorkletRuntime('blocklist')
  } catch (err) {
    console.error('[blocklist] Failed to create worklet runtime', err)
  }
}

const readHeader = (headers: Record<string, string | undefined>, key: string) =>
  headers[key] || headers[key.toLowerCase()] || headers[key.toUpperCase()]

async function fetchRemoteText(url: string, headers: Record<string, string> = {}): Promise<RemoteTextResponse> {
  if (hasElectron()) {
    return window.electron.ipcRenderer.invoke(MAIN_CHANNEL, 'fetchText', url, headers)
  }

  const res = await fetch(url, { headers })
  return {
    status: res.status,
    body: await res.text(),
    headers: {
      etag: res.headers.get('etag') || undefined,
      'last-modified': res.headers.get('last-modified') || undefined,
    },
  }
}

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) {
    return false
  }
  return a.every((value, index) => value === b[index])
}

function getDesktopPartitions() {
  const partitions = settings$.profiles.get().map((profile) => `persist:${profile.id}`)
  return Array.from(new Set(['persist:default', ...partitions])).sort()
}

function emptyPayload(revision: number): BlocklistPayload {
  return {
    enabled: false,
    blockedHosts: '',
    allowedHosts: '',
    revision,
  }
}

function encodeHosts(hosts: string[]) {
  return hosts.join('\n')
}

function serializePayload(matcherData: BlocklistMatcherData): BlocklistPayload {
  return {
    enabled: matcherData.enabled,
    blockedHosts: encodeHosts(matcherData.blockedHosts),
    allowedHosts: encodeHosts(matcherData.allowedHosts),
    revision: matcherData.revision,
  }
}

function setPayloadCache(matcherData: BlocklistMatcherData) {
  payloadCache = {
    revision: matcherData.revision,
    matcherData,
    payload: serializePayload(matcherData),
  }
}

async function mergeFilterListsInBackground(bodies: string[]): Promise<{ blockedHosts: string[]; allowedHosts: string[] }> {
  if (workletRuntime) {
    try {
      const result = await runOnRuntime(workletRuntime, mergeFilterLists)(bodies)
      if (result && Array.isArray(result.blockedHosts) && Array.isArray(result.allowedHosts)) {
        return result
      }
      console.warn('[blocklist] Invalid worklet merge result, falling back to async parser')
    } catch (error) {
      console.warn('[blocklist] Worklet merge failed, falling back to async parser', error)
    }
  }
  return mergeFilterListsAsync(bodies)
}

async function readMergedPayloadFromFiles(revision: number): Promise<BlocklistMatcherData | null> {
  const bodies = await Promise.all(BLOCKLIST_SOURCE_IDS.map((id) => readBlocklistSourceFile(id)))
  if (bodies.some((body) => !body)) {
    return null
  }

  const { blockedHosts, allowedHosts } = await mergeFilterListsInBackground(bodies.map((body) => body || ''))

  if (!blockedHosts.length && !allowedHosts.length) {
    return null
  }

  return {
    enabled: true,
    blockedHosts,
    allowedHosts,
    revision,
  }
}

function getCachedPayload(revision: number) {
  return payloadCache?.revision === revision ? payloadCache.payload : undefined
}

async function getPersistedMatcherData(revision: number) {
  if (payloadCache?.revision === revision) {
    return payloadCache.matcherData
  }

  const matcherData = await readMergedPayloadFromFiles(revision)
  if (!matcherData) {
    return null
  }

  setPayloadCache(matcherData)
  return matcherData
}

export function supportsRuntimeBlocklist() {
  return !isWeb || hasElectron()
}

export async function waitForBlocklistPersist() {
  await when(syncState(blocklist$).isPersistLoaded)
}

export async function applyBlocklist() {
  if (!supportsRuntimeBlocklist()) {
    return
  }

  const state = blocklist$.get()
  let activePayload = emptyPayload(state.revision)
  if (state.enabled && state.hasSnapshot) {
    const cachedPayload = getCachedPayload(state.revision)
    if (cachedPayload) {
      activePayload = cachedPayload
    } else {
      const matcherData = await getPersistedMatcherData(state.revision)
      if (matcherData) {
        activePayload = serializePayload(matcherData)
      }
    }
  }

  if (hasElectron()) {
    const desktopPayload: DesktopBlocklistPayload = { ...activePayload, partitions: getDesktopPartitions() }
    await window.electron.ipcRenderer.invoke(MAIN_CHANNEL, 'setBlocklist', desktopPayload)
    return
  }

  NoraViewModule.setBlocklist(activePayload)
}

async function fetchSource(id: BlocklistSourceId, now: number): Promise<BlocklistFetchSourceResult> {
  const source = blocklist$.sources[id].get()
  const headers: Record<string, string> = {}
  if (source.etag) {
    headers['If-None-Match'] = source.etag
  }
  if (source.lastModified) {
    headers['If-Modified-Since'] = source.lastModified
  }

  const response = await fetchRemoteText(source.url, headers)
  if (response.status === 304) {
    const existingBody = await readBlocklistSourceFile(id)
    if (!existingBody) {
      throw new Error(`Received 304 without cached blocklist data for ${id}`)
    }
    return {
      id,
      status: response.status,
      etag: source.etag,
      lastModified: source.lastModified,
      lastFetchedAt: now,
    }
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Failed to fetch ${id}: HTTP ${response.status}`)
  }

  return {
    id,
    status: response.status,
    body: response.body,
    etag: readHeader(response.headers, 'etag'),
    lastModified: readHeader(response.headers, 'last-modified'),
    lastFetchedAt: now,
  }
}

async function getSourceBodiesFromRefreshResults(settled: PromiseSettledResult<BlocklistFetchSourceResult>[]) {
  const bodies = await Promise.all(
    BLOCKLIST_SOURCE_IDS.map(async (id, index) => {
      const result = settled[index]
      if (result?.status !== 'fulfilled') {
        return null
      }
      if (typeof result.value.body === 'string') {
        return result.value.body
      }

      const existingBody = await readBlocklistSourceFile(id)
      return existingBody || null
    }),
  )

  if (bodies.some((body) => !body)) {
    return null
  }

  return bodies.map((body) => body || '')
}

export async function refreshBlocklist({ manual = false } = {}) {
  await waitForBlocklistPersist()

  const current = blocklist$.get()
  const storedFilesReady = await hasBlocklistSourceFiles(BLOCKLIST_SOURCE_IDS)
  if (!manual && !shouldAutoRefresh(current)) {
    if (current.hasSnapshot && storedFilesReady) {
      return false
    }
  }
  if (current.phase === 'fetching') {
    return false
  }

  const previousPayload = current.hasSnapshot ? await getPersistedMatcherData(current.revision) : null

  blocklist$.assign({
    phase: 'fetching',
    lastError: undefined,
  })

  const now = Date.now()
  const settled = await Promise.allSettled(BLOCKLIST_SOURCE_IDS.map((id) => fetchSource(id, now)))
  const failure = settled.find((result) => result.status === 'rejected')
  if (failure) {
    blocklist$.assign({
      phase: 'error',
      lastError: failure.reason instanceof Error ? failure.reason.message : String(failure.reason),
    })
    return false
  }

  const nextSources = BLOCKLIST_SOURCE_IDS.reduce(
    (acc, id, index) => {
      const result = settled[index]
      if (result.status === 'fulfilled') {
        const value = result.value
        acc[id] = {
          ...current.sources[id],
          etag: value.etag,
          lastModified: value.lastModified,
          lastFetchedAt: value.lastFetchedAt,
        }
      }
      return acc
    },
    {} as BlocklistSnapshot['sources'],
  )

  const writes = settled
    .filter((result): result is PromiseFulfilledResult<BlocklistFetchSourceResult> => result.status === 'fulfilled')
    .filter((result) => result.value.status !== 304 && typeof result.value.body === 'string')
    .map((result) => writeBlocklistSourceFile(result.value.id, result.value.body || ''))
  const sourceBodies = await getSourceBodiesFromRefreshResults(settled)
  if (!sourceBodies) {
    blocklist$.assign({
      phase: 'error',
      lastError: 'Blocklist source files are missing or invalid',
    })
    return false
  }

  const payloadRevision = current.revision + 1
  const nextMatcherData = await (async () => {
    const { blockedHosts, allowedHosts } = await mergeFilterListsInBackground(sourceBodies)
    if (!blockedHosts.length && !allowedHosts.length) {
      return null
    }

    return {
      enabled: true,
      blockedHosts,
      allowedHosts,
      revision: payloadRevision,
    } satisfies BlocklistMatcherData
  })()
  try {
    await Promise.all(writes)
  } catch (error) {
    blocklist$.assign({
      phase: 'error',
      lastError: error instanceof Error ? error.message : String(error),
    })
    return false
  }
  if (!nextMatcherData) {
    blocklist$.assign({
      phase: 'error',
      lastError: 'Blocklist source files are missing or invalid',
    })
    return false
  }

  setPayloadCache(nextMatcherData)
  const previousBlockedHosts = previousPayload?.blockedHosts || []
  const previousAllowedHosts = previousPayload?.allowedHosts || []
  const hostsChanged =
    !arraysEqual(nextMatcherData.blockedHosts, previousBlockedHosts) ||
    !arraysEqual(nextMatcherData.allowedHosts, previousAllowedHosts)

  blocklist$.assign({
    phase: 'ready',
    hasSnapshot: true,
    lastUpdatedAt: now,
    lastError: undefined,
    revision: hostsChanged ? payloadRevision : current.revision,
    sources: nextSources,
  })
  if (!hostsChanged && current.revision !== nextMatcherData.revision) {
    setPayloadCache({
      ...nextMatcherData,
      revision: current.revision,
    })
  }
  return true
}

export async function refreshBlocklistIfDue() {
  return refreshBlocklist({ manual: false })
}

export async function resetBlocklist() {
  await waitForBlocklistPersist()

  const current = blocklist$.get()
  if (current.phase === 'fetching') {
    return false
  }

  await deleteBlocklistSourceFiles(BLOCKLIST_SOURCE_IDS)
  payloadCache = undefined

  const sources = BLOCKLIST_SOURCE_IDS.reduce(
    (acc, id) => {
      acc[id] = {
        url: current.sources[id].url,
      }
      return acc
    },
    {} as BlocklistSnapshot['sources'],
  )

  blocklist$.assign({
    phase: 'idle',
    hasSnapshot: false,
    lastUpdatedAt: undefined,
    lastError: undefined,
    revision: 0,
    sources,
  })

  return true
}
