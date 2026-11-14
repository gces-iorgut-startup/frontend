import type { Page, Request, Response } from '@playwright/test'
import { expect } from '@playwright/test'

export interface RuntimeMonitor {
  consoleErrors: string[]
  pageErrors: string[]
  serverErrors: string[]
  failedRequests: string[]
  assertClean: () => void
  reset: () => void
}

function isSameOrigin(url: string, baseOrigin: string): boolean {
  try {
    return new URL(url).origin === baseOrigin
  } catch {
    return false
  }
}

/**
 * Monitora erros de console, exceções não tratadas (pageerror),
 * respostas HTTP >= 500 e falhas de rede na mesma origem durante os smoke tests.
 */
export function attachProdMonitor(page: Page, baseOrigin: string): RuntimeMonitor {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  const serverErrors: string[] = []
  const failedRequests: string[] = []

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    // Ignora erros de carregamento de avatar externo (ex.: Unsplash em runner isolado)
    if (text.includes('Failed to load resource') && msg.location()?.url && !isSameOrigin(msg.location().url, baseOrigin)) {
      return
    }
    consoleErrors.push(text)
  })

  page.on('pageerror', (error: Error) => {
    pageErrors.push(error.stack || error.message)
  })

  page.on('response', (response: Response) => {
    if (response.status() >= 500) {
      serverErrors.push(`${response.status()} ${response.url()}`)
    }
  })

  page.on('requestfailed', (request: Request) => {
    const errorText = request.failure()?.errorText ?? 'unknown'
    if (errorText.includes('ERR_ABORTED')) return
    if (!isSameOrigin(request.url(), baseOrigin)) return
    failedRequests.push(`${request.method()} ${request.url()} -> ${errorText}`)
  })

  return {
    consoleErrors,
    pageErrors,
    serverErrors,
    failedRequests,
    reset() {
      consoleErrors.length = 0
      pageErrors.length = 0
      serverErrors.length = 0
      failedRequests.length = 0
    },
    assertClean() {
      expect(pageErrors, `Exceções JavaScript detectadas: ${pageErrors.join(' | ')}`).toEqual([])
      expect(serverErrors, `Respostas HTTP >= 500 detectadas: ${serverErrors.join(' | ')}`).toEqual([])
      expect(failedRequests, `Requisições same-origin falharam: ${failedRequests.join(' | ')}`).toEqual([])
      expect(consoleErrors, `Erros no console do navegador: ${consoleErrors.join(' | ')}`).toEqual([])
    },
  }
}
