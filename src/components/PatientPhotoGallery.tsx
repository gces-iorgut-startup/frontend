import { useCallback, useEffect, useState } from 'react'
import { Camera, X } from 'lucide-react'
import { photoService } from '../lib/photoService'
import { getErrorMessage } from '../lib/errorMessage'
import { UploadPhotoModal } from './UploadPhotoModal'
import type { PatientPhoto } from '../types'

interface PatientPhotoGalleryProps {
  patientId: string
}

function formatPhotoDate(value?: string | null) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('pt-BR')
}

export function PatientPhotoGallery({ patientId }: PatientPhotoGalleryProps) {
  const [photos, setPhotos] = useState<PatientPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [zoomedPhoto, setZoomedPhoto] = useState<PatientPhoto | null>(null)

  const loadPhotos = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const items = await photoService.listPatientPhotos(patientId)
      setPhotos(items)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível carregar as fotos do paciente.'))
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    void loadPhotos()
  }, [loadPhotos])

  // Esc fecha o zoom — sem isso o único jeito de sair é mirar o X.
  useEffect(() => {
    if (!zoomedPhoto) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setZoomedPhoto(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [zoomedPhoto])

  return (
    <section className="patient-records-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b' }}>
          Acompanhamento fotográfico
        </h3>
        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'var(--pink-300)', color: '#fff', border: 'none',
            padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
            fontWeight: 500, fontSize: '0.875rem',
          }}
        >
          <Camera size={16} />
          Adicionar foto
        </button>
      </div>

      {error ? <p className="patient-details-inline-error">{error}</p> : null}

      {loading ? (
        <div className="patient-details-loading" style={{ padding: '32px 0' }}>
          <div className="spinner spinner-dark" />
        </div>
      ) : photos.length === 0 ? (
        <div
          style={{
            border: '1px dashed #cbd5e1',
            borderRadius: '8px',
            padding: '40px 16px',
            textAlign: 'center',
            color: '#64748b',
            backgroundColor: '#f8fafc',
          }}
        >
          <Camera size={28} color="#94a3b8" />
          <p style={{ marginTop: '12px', fontSize: '0.875rem' }}>
            Nenhuma foto registrada para este paciente.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '16px',
          }}
        >
          {photos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setZoomedPhoto(photo)}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                overflow: 'hidden',
                background: '#fff',
                padding: 0,
                cursor: 'zoom-in',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <img
                src={photoService.resolvePhotoUrl(photo.photoUrl)}
                alt={photo.description || `Foto do paciente de ${formatPhotoDate(photo.takenAt)}`}
                loading="lazy"
                style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }}
              />
              <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b' }}>
                  {formatPhotoDate(photo.takenAt)}
                </span>
                {photo.description ? (
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{photo.description}</span>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      )}

      {showUploadModal && (
        <UploadPhotoModal
          patientId={patientId}
          onClose={() => setShowUploadModal(false)}
          onSuccess={(photo) => {
            // A API devolve em ordem cronológica crescente; mantemos isso ao
            // inserir localmente para não bagunçar a leitura da evolução.
            setPhotos((prev) =>
              [...prev, photo].sort(
                (a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime()
              )
            )
            setShowUploadModal(false)
          }}
        />
      )}

      {zoomedPhoto && (
        <div
          className="patient-edit-modal-overlay"
          role="presentation"
          onClick={() => setZoomedPhoto(null)}
        >
          <div
            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <button
              type="button"
              aria-label="Fechar foto ampliada"
              onClick={() => setZoomedPhoto(null)}
              style={{
                position: 'absolute', top: 8, right: 8,
                background: 'rgba(15, 23, 42, 0.65)', color: '#fff',
                border: 'none', borderRadius: '999px', padding: '6px',
                cursor: 'pointer', display: 'flex',
              }}
            >
              <X size={18} />
            </button>
            <img
              src={photoService.resolvePhotoUrl(zoomedPhoto.photoUrl)}
              alt={zoomedPhoto.description || 'Foto ampliada do paciente'}
              style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: '10px', display: 'block' }}
            />
            <p style={{ color: '#fff', marginTop: '10px', fontSize: '0.875rem', textAlign: 'center' }}>
              {formatPhotoDate(zoomedPhoto.takenAt)}
              {zoomedPhoto.description ? ` — ${zoomedPhoto.description}` : ''}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
