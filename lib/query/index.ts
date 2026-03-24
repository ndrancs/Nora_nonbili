import { UseQueryOptions } from '@tanstack/react-query'
import { auth$ } from '@/states/auth'

const HOST = 'https://a.inks.page'

export interface NoraIosEntitlement {
  status: string
  productId?: string | null
  expiresAt?: string | null
  willRenew?: boolean | null
  linkedEmail?: string | null
}

export interface NoraEntitlement {
  plan: string
  source: 'none' | 'stripe' | 'app_store'
  email?: string | null
  ios?: NoraIosEntitlement | null
}

export interface PrepareIosPurchaseResponse {
  appAccountToken: string
  email: string
  entitlement: NoraEntitlement
}

export interface SyncIosTransactionResponse {
  entitlement: NoraEntitlement
}

const defaultEntitlement: NoraEntitlement = {
  plan: 'free',
  source: 'none',
}

function getErrorMessage(payload: any) {
  return payload?.error?.json?.message || payload?.message || 'Request failed'
}

async function callNoraApi<T>(path: string, init?: RequestInit): Promise<T> {
  const authorization = auth$.accessToken.get()
  const headers = new Headers(init?.headers)
  if (authorization) {
    headers.set('authorization', authorization)
  }
  if (init?.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }

  const res = await fetch(`${HOST}/api/${path}`, {
    ...init,
    headers,
  })

  const payload = await res.json().catch(() => null)
  if (!res.ok || payload?.error) {
    throw new Error(getErrorMessage(payload))
  }
  return payload?.result?.data as T
}

export const getMeQuery = (options?: Partial<UseQueryOptions<NoraEntitlement>>) => ({
  queryKey: ['me'],
  queryFn: async () => {
    const authorization = auth$.accessToken.get()
    if (!authorization) {
      return defaultEntitlement
    }
    return callNoraApi<NoraEntitlement>('nora.me')
  },
  staleTime: 15 * 60 * 1000, // 15 minutes
  ...options,
})

export const prepareIosPurchase = () => callNoraApi<PrepareIosPurchaseResponse>('nora.prepareIosPurchase', { method: 'POST' })

export const syncIosTransaction = (signedTransactionInfo: string) =>
  callNoraApi<SyncIosTransactionResponse>('nora.syncIosTransaction', {
    method: 'POST',
    body: JSON.stringify({ signedTransactionInfo }),
  })
