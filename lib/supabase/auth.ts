import * as WebBrowser from 'expo-web-browser'
import NoraViewModule from '@/modules/nora-view'
import { settings$ } from '@/states/settings'
import { supabaseAuth } from './client'

export const signOut = async () => {
  await supabaseAuth.signOut({ scope: 'local' })
  const profiles = settings$.profiles.peek()
  await Promise.all(profiles.map((p) => NoraViewModule.clearProfileData(p.id)))
}

export const onReceiveAuthUrl = async (url: string) => {
  const token = url.match(/[?&]t=([^&]+)/)?.[1]
  if (token) {
    try {
      await WebBrowser.dismissBrowser()
    } catch {
      // ignore
    }

    try {
      // https://github.com/orgs/supabase/discussions/27181#discussioncomment-10986267
      await supabaseAuth.verifyOtp({
        token_hash: token,
        type: 'email',
      })
    } catch (error) {
      console.error('verifyOtp failed', error)
    }
  }
}
