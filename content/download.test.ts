import { describe, expect, it } from 'bun:test'
import { getFacebookDownloadInfo, isDirectlyDownloadable, isDownloadable, normalizeDownloadUrl } from './download'

describe('isDownloadable', () => {
  for (const [url, expected] of [
    ['https://www.facebook.com/reel/404248063485974', true],
    ['https://m.facebook.com/RTLplay/videos/la-france-a-un-incroyable-talent-nouveau-sur-plug-rtl-rtlplay/404248063485974/', true],
  ] as const) {
    it(`${url} => ${expected}`, () => {
      expect(isDownloadable(url)).toBe(expected)
    })
  }
})

describe('isDirectlyDownloadable', () => {
  for (const [url, expected] of [
    ['https://www.facebook.com/reel/404248063485974', true],
    ['https://m.facebook.com/RTLplay/videos/la-france-a-un-incroyable-talent-nouveau-sur-plug-rtl-rtlplay/404248063485974/', false],
  ] as const) {
    it(`${url} => ${expected}`, () => {
      expect(isDirectlyDownloadable(url)).toBe(expected)
    })
  }
})

describe('normalizeDownloadUrl', () => {
  for (const [url, expected] of [
    ['https://www.facebook.com/reel/404248063485974/?mibextid=rS40aB7S9Ucbxw6v', 'https://m.facebook.com/reel/404248063485974/'],
    [
      'https://m.facebook.com/RTLplay/videos/la-france-a-un-incroyable-talent-nouveau-sur-plug-rtl-rtlplay/404248063485974/',
      'https://m.facebook.com/reel/404248063485974/',
    ],
  ] as const) {
    it(`${url} => ${expected}`, () => {
      expect(normalizeDownloadUrl(url)).toBe(expected)
    })
  }
})

describe('getFacebookDownloadInfo', () => {
  it('returns the best dash video-only url and the best progressive url separately', () => {
    expect(
      getFacebookDownloadInfo(
        [
          JSON.stringify({
            browser_native_hd_url: 'https://cdn.example.com/hd-with-audio.mp4',
            dash_prefetch_representations: {
              representations: [{ height: 720, base_url: 'https://cdn.example.com/video-only.mp4' }],
            },
          }),
        ],
        [],
        ['https://cdn.example.com/sd-with-audio.mp4'],
      ),
    ).toEqual({
      hdVideoOnlyUrl: 'https://cdn.example.com/video-only.mp4',
      standardWithAudioUrl: 'https://cdn.example.com/hd-with-audio.mp4',
    })
  })

  it('prefers the progressive data-video-url for the audio option when hd progressive is unavailable', () => {
    expect(
      getFacebookDownloadInfo(
        [
          JSON.stringify({
            dash_prefetch_representations: {
              representations: [{ height: 720, base_url: 'https://cdn.example.com/video-only.mp4' }],
            },
          }),
        ],
        [],
        ['https://cdn.example.com/video-with-audio.mp4'],
      ),
    ).toEqual({
      hdVideoOnlyUrl: 'https://cdn.example.com/video-only.mp4',
      standardWithAudioUrl: 'https://cdn.example.com/video-with-audio.mp4',
    })
  })

  it('finds progressive urls from html sources', () => {
    expect(
      getFacebookDownloadInfo(
        [],
        ['<script>{"playable_url_quality_hd":"https:\\/\\/cdn.example.com\\/hd-from-html.mp4"}</script>'],
        ['https://cdn.example.com/sd-with-audio.mp4'],
      ),
    ).toEqual({
      hdVideoOnlyUrl: undefined,
      standardWithAudioUrl: 'https://cdn.example.com/hd-from-html.mp4',
    })
  })

  it('collects values from multiple facebook nodes', () => {
    expect(
      getFacebookDownloadInfo(
        [
          JSON.stringify({
            dash_prefetch_representations: {
              representations: [{ height: 1080, base_url: 'https://cdn.example.com/hd-video-only.mp4' }],
            },
          }),
          JSON.stringify({
            browser_native_sd_url: 'https://cdn.example.com/sd-with-audio.mp4',
          }),
        ],
        [],
        [],
      ),
    ).toEqual({
      hdVideoOnlyUrl: 'https://cdn.example.com/hd-video-only.mp4',
      standardWithAudioUrl: 'https://cdn.example.com/sd-with-audio.mp4',
    })
  })
})
