import { useState } from 'react'
import { Activity } from 'lucide-react'
import { hospitalizationService } from '../lib/hospitalizationService'
import { getErrorMessage } from '../lib/errorMessage'
import { getVitalSignError, parseVitalSign } from '../lib/hospitalizationFields'
import type { HospitalizationEvolution } from '../types'

interface HospitalizationEvolutionFormProps {
  clinicId: string
  hospitalizationId: string
  onSuccess: (evolution: HospitalizationEvolution) => void
  onError: (message: string) => void
}

const EMPTY_FORM = {
  temperature: '',
  heartRate: '',
  respiratoryRate: '',
  mucousMembranes: '',
  notes: '',
}

export function HospitalizationEvolutionForm({
  clinicId,
  hospitalizationId,
  onSuccess,
  onError,
}: HospitalizationEvolutionFormProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  function handleChange(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!form.notes.trim()) {
      setError('Descreva a evolução do paciente.')
      return
    }

    // Avisa antes de gastar a requisição. A validação que vale é a do backend.
    const vitalError =
      getVitalSignError('temperature', form.temperature) ??
      getVitalSignError('heartRate', form.heartRate) ??
      getVitalSignError('respiratoryRate', form.respiratoryRate)

    if (vitalError) {
      setError(vitalError)
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const evolution = await hospitalizationService.addEvolution(clinicId, hospitalizationId, {
        // `parseVitalSign` devolve undefined para campo vazio, e o service
        // omite a chave — sinal vital em branco é "não aferi", não zero.
        temperature: parseVitalSign(form.temperature) ?? undefined,
        heartRate: parseVitalSign(form.heartRate) ?? undefined,
        respiratoryRate: parseVitalSign(form.respiratoryRate) ?? undefined,
        mucousMembranes: form.mucousMembranes,
        notes: form.notes,
      })

      setForm(EMPTY_FORM)
      onSuccess(evolution)
    } catch (err: unknown) {
      onError(getErrorMessage(err, 'Não foi possível registrar a evolução.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="hospitalization-evolution-form" onSubmit={(event) => void handleSubmit(event)}>
      <h3>
        <Activity size={16} />
        Nova aferição
      </h3>

      {error && (
        <p className="hospitalization-form-error" role="alert">
          {error}
        </p>
      )}

      <div className="hospitalization-vitals-grid">
        <label>
          <span>Temperatura (°C)</span>
          <input
            type="text"
            inputMode="decimal"
            value={form.temperature}
            onChange={(event) => handleChange('temperature', event.target.value)}
            placeholder="38,5"
            disabled={isSaving}
          />
        </label>

        <label>
          <span>FC (bpm)</span>
          <input
            type="text"
            inputMode="numeric"
            value={form.heartRate}
            onChange={(event) => handleChange('heartRate', event.target.value)}
            placeholder="90"
            disabled={isSaving}
          />
        </label>

        <label>
          <span>FR (mpm)</span>
          <input
            type="text"
            inputMode="numeric"
            value={form.respiratoryRate}
            onChange={(event) => handleChange('respiratoryRate', event.target.value)}
            placeholder="24"
            disabled={isSaving}
          />
        </label>

        <label>
          <span>Mucosas</span>
          <input
            type="text"
            value={form.mucousMembranes}
            onChange={(event) => handleChange('mucousMembranes', event.target.value)}
            placeholder="Normocoradas"
            maxLength={120}
            disabled={isSaving}
          />
        </label>
      </div>

      <label className="hospitalization-notes-field">
        <span>Observações do plantão</span>
        <textarea
          value={form.notes}
          onChange={(event) => handleChange('notes', event.target.value)}
          placeholder="Alimentação, hidratação, medicações aplicadas"
          maxLength={2000}
          rows={3}
          disabled={isSaving}
        />
      </label>

      <button type="submit" className="confirm save" disabled={isSaving}>
        {isSaving ? 'Registrando...' : 'Registrar aferição'}
      </button>
    </form>
  )
}
