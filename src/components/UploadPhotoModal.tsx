import { useState, useRef } from 'react'
import { Camera, X, Image as ImageIcon } from 'lucide-react'
import { photoService } from '../lib/photoService'
import { toTakenAtISO } from '../lib/photoDate'
import { getErrorMessage } from '../lib/errorMessage'
import type { PatientPhoto } from '../types'

interface UploadPhotoModalProps {
  patientId: string
  onClose: () => void
  onSuccess: (photo: PatientPhoto) => void
}

const MAX_FILE_SIZE = 10 * 1024 * 1024

export function UploadPhotoModal({ patientId, onClose, onSuccess }: UploadPhotoModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [description, setDescription] = useState('')
  const [takenAt, setTakenAt] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const today = new Date().toISOString().slice(0, 10)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    setError('')

    if (!selectedFile) return

    // A galeria é de acompanhamento visual: PDF de exame continua em /exames.
    if (!selectedFile.type.startsWith('image/')) {
      setError('Envie uma imagem (JPG, PNG ou WEBP).')
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('A imagem excede o limite de 10MB.')
      return
    }

    setFile(selectedFile)
    setPreviewUrl(URL.createObjectURL(selectedFile))
  }

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl('')
  }

  async function handleUpload() {
    if (!file) {
      setError('Selecione uma imagem.')
      return
    }

    setIsUploading(true)
    setError('')

    try {
      const photo = await photoService.uploadPatientPhoto({
        patientId,
        file,
        description,
        takenAt: toTakenAtISO(takenAt),
      })
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      onSuccess(photo)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível enviar a foto.'))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="patient-edit-modal-overlay" role="presentation">
      <div className="patient-edit-modal" style={{ minWidth: '420px' }}>
        <button
          className="modal-close-button"
          onClick={onClose}
          type="button"
          aria-label="Fechar"
          disabled={isUploading}
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
        >
          <X size={20} />
        </button>

        <Camera className="patient-edit-modal-icon save" />
        <h3>Adicionar foto</h3>
        <p>Registre a evolução visual do paciente — lesões, cicatrização, condição de pelagem.</p>

        {error && (
          <p className="patient-details-inline-error" style={{ fontSize: '0.875rem', marginTop: '8px' }}>
            {error}
          </p>
        )}

        <div style={{ marginTop: '20px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            aria-label="Arquivo da foto"
            style={{ display: 'none' }}
          />

          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter') fileInputRef.current?.click() }}
              role="button"
              tabIndex={0}
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '8px',
                padding: '32px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                backgroundColor: '#f8fafc',
              }}
            >
              <ImageIcon size={32} color="#94a3b8" />
              <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
                Clique para selecionar uma imagem
              </span>
            </div>
          ) : (
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              backgroundColor: '#f8fafc',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                <img
                  src={previewUrl}
                  alt="Pré-visualização da foto selecionada"
                  style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                    {file.name}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
              <button
                onClick={clearFile}
                type="button"
                aria-label="Remover imagem selecionada"
                disabled={isUploading}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#475569' }}>
              Descrição (opcional)
            </span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: lesão na pata direita"
              maxLength={255}
              disabled={isUploading}
              style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#475569' }}>
              Data da foto (opcional)
            </span>
            <input
              type="date"
              value={takenAt}
              max={today}
              onChange={(e) => setTakenAt(e.target.value)}
              disabled={isUploading}
              style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem' }}
            />
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Em branco, usamos a data de hoje.
            </span>
          </label>
        </div>

        <div className="patient-edit-modal-actions">
          <button type="button" className="ghost" onClick={onClose} disabled={isUploading}>
            Cancelar
          </button>
          <button
            type="button"
            className="confirm save"
            onClick={() => void handleUpload()}
            disabled={!file || isUploading}
          >
            {isUploading ? 'Enviando...' : 'Adicionar foto'}
          </button>
        </div>
      </div>
    </div>
  )
}
