import { useState, useRef } from 'react'
import { FileUp, X, FileText, Image as ImageIcon } from 'lucide-react'
import { examService } from '../lib/examService'
import { getErrorMessage } from '../lib/errorMessage'
import {
  CLINICAL_EXAM_TYPES,
  CLINICAL_EXAM_LABELS,
  type ExamFile,
  type ClinicalExamType,
} from '../types'

interface UploadExamModalProps {
  patientId: string
  onClose: () => void
  onSuccess: (exam: ExamFile) => void
}

export function UploadExamModal({ patientId, onClose, onSuccess }: UploadExamModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [clinicalType, setClinicalType] = useState<ClinicalExamType | ''>('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    setError('')
    
    if (!selectedFile) return

    // Basic validation
    const isValidType = selectedFile.type === 'application/pdf' || selectedFile.type.startsWith('image/')
    if (!isValidType) {
      setError('Formato inválido. Por favor envie um PDF ou uma Imagem.')
      return
    }

    // Max 10MB
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('O arquivo excede o limite de 10MB.')
      return
    }

    setFile(selectedFile)
  }

  async function handleUpload() {
    if (!file) {
      setError('Por favor selecione um arquivo.')
      return
    }

    setIsUploading(true)
    setError('')

    try {
      const result = await examService.uploadExamFile(
        patientId,
        file,
        undefined,
        clinicalType || undefined
      )
      onSuccess(result)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível fazer o upload do exame.'))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="patient-edit-modal-overlay" role="presentation">
      <div className="patient-edit-modal" style={{ minWidth: '400px' }}>
        <button 
          className="modal-close-button" 
          onClick={onClose} 
          type="button" 
          disabled={isUploading}
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
        >
          <X size={20} />
        </button>

        <FileUp className="patient-edit-modal-icon save" />
        <h3>Anexar Exame</h3>
        <p>Selecione o tipo clínico e o arquivo (PDF ou Imagem) do exame do paciente.</p>

        {error && <p className="patient-details-inline-error" style={{ fontSize: '0.875rem', marginTop: '8px' }}>{error}</p>}

        <div style={{ marginTop: '20px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label htmlFor="clinical-type-select" style={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>
            Tipo Clínico do Exame
          </label>
          <select
            id="clinical-type-select"
            aria-label="Tipo Clínico do Exame"
            value={clinicalType}
            onChange={(e) => setClinicalType(e.target.value as ClinicalExamType | '')}
            disabled={isUploading}
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              backgroundColor: '#fff',
              color: '#1e293b',
              outline: 'none',
              cursor: isUploading ? 'not-allowed' : 'pointer',
            }}
          >
            <option value="">Selecione o tipo clínico (opcional)</option>
            {CLINICAL_EXAM_TYPES.map((type) => (
              <option key={type} value={type}>
                {CLINICAL_EXAM_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="application/pdf,image/*"
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
                transition: 'border-color 0.2s',
                backgroundColor: '#f8fafc'
              }}
            >
              <FileUp size={32} color="#94a3b8" />
              <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
                Clique para selecionar arquivo (PDF ou Imagens)
              </span>
            </div>
          ) : (
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                {file.type === 'application/pdf' ? (
                  <FileText size={24} color="#ef4444" />
                ) : (
                  <ImageIcon size={24} color="#3b82f6" />
                )}
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
                onClick={() => setFile(null)} 
                type="button"
                disabled={isUploading}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="patient-edit-modal-actions">
          <button
            type="button"
            className="ghost"
            onClick={onClose}
            disabled={isUploading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="confirm save"
            onClick={() => void handleUpload()}
            disabled={!file || isUploading}
          >
            {isUploading ? 'Enviando...' : 'Anexar'}
          </button>
        </div>
      </div>
    </div>
  )
}
