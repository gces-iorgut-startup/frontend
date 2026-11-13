import { AxiosError } from 'axios'

type ApiErrorData = {
  error?: string
  message?: string
  issues?: Record<string, string[]>
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorData | undefined

    const issueMessage = getValidationIssueMessage(error)
    if (issueMessage) return issueMessage

    const status = error.response?.status

    if (!error.response) {
      return error.code === 'ECONNABORTED'
        ? 'A requisição demorou demais. Tente novamente.'
        : 'Não foi possível conectar ao servidor. Verifique sua conexão.'
    }

    if (status && status >= 500) {
      return 'Erro interno no servidor. Tente novamente em instantes.'
    }

    return data?.message || data?.error || fallback
  }

  if (error instanceof Error) {
    return error.message || fallback
  }

  return fallback
}

export function getValidationIssueMessage(error: unknown): string | null {
  if (!(error instanceof AxiosError)) return null

  const data = error.response?.data as ApiErrorData | undefined
  const issues = data?.issues
  if (!issues) return null

  const firstField = Object.keys(issues)[0]
  return firstField ? issues[firstField]?.[0] || 'Erro de validacao.' : 'Erro de validacao.'
}

export function getValidationIssues(error: unknown): Record<string, string[]> | null {
  if (!(error instanceof AxiosError)) return null
  const data = error.response?.data as ApiErrorData | undefined
  return data?.issues ?? null
}
