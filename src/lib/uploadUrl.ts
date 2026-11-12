import { api } from './api'

/**
 * Converte o caminho relativo devolvido pelo backend (ex.: `/uploads/foto.png`)
 * na URL que o navegador consegue abrir.
 *
 * Vive aqui, e não dentro de um service, porque tanto exames quanto fotos do
 * paciente precisam da mesma regra — e eram duas cópias fáceis de divergir.
 */
export function resolveUploadUrl(fileUrl: string): string {
  if (!fileUrl) return ''
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl

  const normalizedPath = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`
  const baseUrl = api.defaults.baseURL ?? ''

  // API externa (prod): monta a URL contra a origem do backend diretamente.
  // Proxy de mesma origem (local/docker): passa por /api para o nginx repassar.
  if (/^https?:\/\//i.test(baseUrl)) {
    return baseUrl.replace(/\/+$/, '') + normalizedPath
  }

  return `/api${normalizedPath}`
}
