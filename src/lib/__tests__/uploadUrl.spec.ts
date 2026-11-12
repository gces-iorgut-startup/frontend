import { describe, it, expect, afterEach } from 'vitest'
import { resolveUploadUrl } from '../uploadUrl'
import { api } from '../api'

const originalBaseUrl = api.defaults.baseURL

describe('resolveUploadUrl', () => {
  afterEach(() => {
    api.defaults.baseURL = originalBaseUrl
  })

  it('devolve string vazia quando não há caminho', () => {
    expect(resolveUploadUrl('')).toBe('')
  })

  it('mantém URLs absolutas intactas', () => {
    expect(resolveUploadUrl('https://cdn.exemplo.com/foto.png')).toBe(
      'https://cdn.exemplo.com/foto.png'
    )
  })

  it('passa pelo proxy /api quando a baseURL é relativa', () => {
    api.defaults.baseURL = '/api'
    expect(resolveUploadUrl('/uploads/foto.png')).toBe('/api/uploads/foto.png')
  })

  it('normaliza caminho sem barra inicial', () => {
    api.defaults.baseURL = '/api'
    expect(resolveUploadUrl('uploads/foto.png')).toBe('/api/uploads/foto.png')
  })

  it('monta contra a origem do backend quando a baseURL é absoluta', () => {
    api.defaults.baseURL = 'https://api.exemplo.com'
    expect(resolveUploadUrl('/uploads/foto.png')).toBe('https://api.exemplo.com/uploads/foto.png')
  })

  it('não duplica barra quando a baseURL absoluta termina com /', () => {
    api.defaults.baseURL = 'https://api.exemplo.com/'
    expect(resolveUploadUrl('/uploads/foto.png')).toBe('https://api.exemplo.com/uploads/foto.png')
  })
})
