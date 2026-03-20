type ScriptableWebview = {
  executeJavaScript?: (script: string) => unknown
}

export function executeWebviewJavaScript(webview: ScriptableWebview | null | undefined, script: string) {
  if (!webview?.executeJavaScript) {
    return Promise.resolve(undefined)
  }

  try {
    return Promise.resolve(webview.executeJavaScript(script))
  } catch (error) {
    return Promise.reject(error)
  }
}

export function executeWebviewJavaScriptQuietly(webview: ScriptableWebview | null | undefined, script: string) {
  return executeWebviewJavaScript(webview, script).catch(() => undefined)
}
