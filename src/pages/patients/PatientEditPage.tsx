import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Save, PawPrint, User, ImagePlus, CircleHelp } from 'lucide-react'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errorMessage'
import { isValidCpf, maskCep, maskCpf, maskDate, maskPhone, onlyDigits } from '../../lib/documents'
import { CepNotFoundError, CepRequestError, fetchAddressByCep } from '../../lib/cep'
import type { Patient } from '../../types'
import '../../styles/patients.css'

const SPECIES_OPTIONS = [
  'Cachorro',
  'Gato',
  'Pássaro',
  'Roedor',
  'Reptil',
  'Peixe',
  'Outro',
]

const INSURANCE_OPTIONS = [
  'Nenhum',
  'Dog Life',
  'PetLove',
  'Porto Seguro Pet',
  'Cobasi Saude',
  'Petcare',
  'Outro',
]

const STATES_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

interface EditFormData {
  petName: string
  birthDate: string
  species: string
  breed: string
  sex: string
  weightKg: string
  hasMicrochip: string
  microchipNumber: string
  observations: string
  photoUrl: string
  tutorFullName: string
  tutorCpf: string
  tutorPhone: string
  tutorEmail: string
  tutorInsurance: string
  cep: string
  state: string
  city: string
  neighborhood: string
  street: string
  addressNumber: string
  complement: string
}

const initialForm: EditFormData = {
  petName: '',
  birthDate: '',
  species: '',
  breed: '',
  sex: '',
  weightKg: '',
  hasMicrochip: '',
  microchipNumber: '',
  observations: '',
  photoUrl: '',
  tutorFullName: '',
  tutorCpf: '',
  tutorPhone: '',
  tutorEmail: '',
  tutorInsurance: '',
  cep: '',
  state: '',
  city: '',
  neighborhood: '',
  street: '',
  addressNumber: '',
  complement: '',
}

function toDateInputBR(value?: string | null) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  const day = `${parsed.getDate()}`.padStart(2, '0')
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0')
  return `${day}/${month}/${parsed.getFullYear()}`
}

function calculateAge(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return ''
  const [d, m, y] = dateStr.split('/').map(Number)
  if (!d || !m || !y) return ''

  const birth = new Date(y, m - 1, d)
  if (Number.isNaN(birth.getTime())) return ''

  const today = new Date()
  let years = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    years -= 1
  }

  return years >= 1 ? `${years} anos` : 'Menos de 1 ano'
}

function parseDateBR(dateStr: string): string | undefined {
  if (!dateStr || dateStr.length < 10) return undefined
  const parts = dateStr.split('/')
  if (parts.length !== 3) return undefined
  const [d, m, y] = parts.map(Number)
  if (Number.isNaN(d) || Number.isNaN(m) || Number.isNaN(y)) return undefined
  return new Date(y, m - 1, d).toISOString()
}

function isValidDateBR(dateStr: string): boolean {
  if (!dateStr || dateStr.length < 10) return false
  const parts = dateStr.split('/')
  if (parts.length !== 3) return false
  const day = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const year = parseInt(parts[2], 10)
  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return false
  if (month < 1 || month > 12) return false

  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
  )
}

function extractAddress(addressStr?: string | null) {
  const raw = {
    cep: '',
    state: '',
    city: '',
    neighborhood: '',
    street: '',
    num: '',
    complement: '',
  }

  if (!addressStr) return raw

  const parts = addressStr.split(',').map((item) => item.trim()).filter(Boolean)
  const cepPart = parts.find((item) => item.startsWith('CEP:'))
  const numPart = parts.find((item) => item.startsWith('nº'))

  raw.street = parts[0] || ''
  if (cepPart) raw.cep = cepPart.replace('CEP:', '').trim()
  if (numPart) raw.num = numPart.replace('nº', '').trim()

  let cursor = parts.length - 1
  if (cepPart) cursor -= 1

  if (cursor > 0 && parts[cursor] !== numPart && parts[cursor] !== raw.street) {
    raw.state = parts[cursor]
    cursor -= 1
  }
  if (cursor > 0 && parts[cursor] !== numPart && parts[cursor] !== raw.street) {
    raw.city = parts[cursor]
    cursor -= 1
  }
  if (cursor > 0 && parts[cursor] !== numPart && parts[cursor] !== raw.street) {
    raw.neighborhood = parts[cursor]
    cursor -= 1
  }

  if (numPart) {
    const numIdx = parts.indexOf(numPart)
    if (numIdx !== -1 && numIdx < cursor) {
      raw.complement = parts.slice(numIdx + 1, cursor + 1).join(', ')
    }
  } else if (cursor > 0) {
    raw.complement = parts.slice(1, cursor + 1).join(', ')
  }

  return raw
}

function extractWeightNumber(value: string): number | null {
  const normalized = value.replace(/[^\d.,]/g, '').replace(',', '.')
  if (!normalized) return null
  const num = Number(normalized)
  return Number.isNaN(num) ? null : num
}

export function PatientEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [form, setForm] = useState<EditFormData>(initialForm)
  const [errors, setErrors] = useState<Partial<Record<keyof EditFormData, string>>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isFetchingCep, setIsFetchingCep] = useState(false)
  const cepAbortRef = useRef<AbortController | null>(null)
  const addressNumberRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!id) return

    let cancelled = false
    setLoading(true)

    api.get(`/patients/${id}`)
      .then((response) => {
        if (cancelled) return
        const patientData = response.data.patient || response.data
        const tutorCpf = patientData.tutor?.cpf || ''
        const tutorPhone = patientData.tutor?.phone || ''
        const address = extractAddress(patientData.tutor?.address)
        const rawMicrochip = patientData.microchip || ''
        const hasMicrochip = rawMicrochip && rawMicrochip !== 'Não' ? 'Sim' : 'Não'
        const microchipNumber = rawMicrochip !== 'Sim' && rawMicrochip !== 'Não' ? rawMicrochip : ''

        setPatient(patientData)
        setForm({
          petName: patientData.name || '',
          birthDate: toDateInputBR(patientData.birthDate),
          species: patientData.species || '',
          breed: patientData.breed || '',
          sex: patientData.sex || '',
          weightKg: patientData.weightKg ? `${patientData.weightKg} kg` : '',
          hasMicrochip,
          microchipNumber,
          observations: patientData.observations || '',
          photoUrl: patientData.photoUrl || '',
          tutorFullName: patientData.tutor?.fullName || '',
          tutorCpf: maskCpf(tutorCpf),
          tutorPhone: maskPhone(tutorPhone),
          tutorEmail: patientData.tutor?.email || '',
          tutorInsurance: patientData.tutor?.insurance || '',
          cep: address.cep,
          state: address.state,
          city: address.city,
          neighborhood: address.neighborhood,
          street: address.street,
          addressNumber: address.num,
          complement: address.complement,
        })
      })
      .catch((err) => {
        console.error('Erro ao carregar dados para edicao:', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  function updateField(field: keyof EditFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  async function handleCepChange(rawValue: string) {
    const masked = maskCep(rawValue)
    updateField('cep', masked)

    const digits = masked.replace(/\D/g, '')
    if (digits.length !== 8) return

    cepAbortRef.current?.abort()
    const controller = new AbortController()
    cepAbortRef.current = controller

    setIsFetchingCep(true)
    try {
      const addr = await fetchAddressByCep(digits, controller.signal)
      setForm((prev) => ({
        ...prev,
        state: addr.state || prev.state,
        city: addr.city || prev.city,
        neighborhood: addr.neighborhood || prev.neighborhood,
        street: addr.street || prev.street,
      }))
      setErrors((prev) => {
        const next = { ...prev }
        delete next.cep
        if (addr.state) delete next.state
        if (addr.city) delete next.city
        if (addr.neighborhood) delete next.neighborhood
        if (addr.street) delete next.street
        return next
      })
      addressNumberRef.current?.focus()
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return
      const message =
        err instanceof CepNotFoundError
          ? 'CEP não encontrado'
          : err instanceof CepRequestError
            ? 'Não foi possível buscar o CEP. Preencha manualmente.'
            : 'Erro ao buscar CEP.'
      setErrors((prev) => ({ ...prev, cep: message }))
    } finally {
      if (cepAbortRef.current === controller) {
        cepAbortRef.current = null
        setIsFetchingCep(false)
      }
    }
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      if (base64) updateField('photoUrl', base64)
    }
    reader.readAsDataURL(file)
  }

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof EditFormData, string>> = {}

    if (!form.petName.trim()) nextErrors.petName = 'Nome do pet e obrigatorio'
    if (!form.birthDate || !isValidDateBR(form.birthDate)) nextErrors.birthDate = 'Data invalida'
    if (!form.species.trim()) nextErrors.species = 'Especie e obrigatoria'
    if (!form.breed.trim()) nextErrors.breed = 'Raca e obrigatoria'
    if (!form.sex.trim()) nextErrors.sex = 'Sexo e obrigatorio'

    if (!form.weightKg.trim()) {
      nextErrors.weightKg = 'Peso e obrigatorio'
    } else if (extractWeightNumber(form.weightKg) === null) {
      nextErrors.weightKg = 'Peso invalido'
    }

    if (!form.hasMicrochip) nextErrors.hasMicrochip = 'Informe se possui microchip'
    if (form.hasMicrochip === 'Sim' && !form.microchipNumber.trim()) {
      nextErrors.microchipNumber = 'Numero do microchip e obrigatorio'
    }

    if (!form.tutorFullName.trim()) nextErrors.tutorFullName = 'Nome do tutor e obrigatorio'
    if (!isValidCpf(form.tutorCpf)) nextErrors.tutorCpf = 'CPF invalido'
    if (form.tutorPhone.replace(/\D/g, '').length < 10) nextErrors.tutorPhone = 'Telefone invalido'
    if (!form.tutorEmail.trim()) nextErrors.tutorEmail = 'Email e obrigatorio'
    if (!form.tutorInsurance.trim()) nextErrors.tutorInsurance = 'Convenio e obrigatorio'

    if (!form.cep.trim()) nextErrors.cep = 'CEP e obrigatorio'
    if (!form.state.trim()) nextErrors.state = 'Estado e obrigatorio'
    if (!form.city.trim()) nextErrors.city = 'Cidade e obrigatoria'
    if (!form.neighborhood.trim()) nextErrors.neighborhood = 'Bairro e obrigatorio'
    if (!form.street.trim()) nextErrors.street = 'Logradouro e obrigatorio'
    if (!form.addressNumber.trim()) nextErrors.addressNumber = 'Numero e obrigatorio'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function performSave() {
    if (!id || !patient) return
    if (!validate()) return

    setSaving(true)
    try {
      const birthDateISO = parseDateBR(form.birthDate)
      const parsedWeight = extractWeightNumber(form.weightKg)
      const address = [
        form.street,
        form.addressNumber && `nº ${form.addressNumber}`,
        form.complement,
        form.neighborhood,
        form.city,
        form.state,
        form.cep && `CEP: ${form.cep}`,
      ].filter(Boolean).join(', ')

      const microchipPayload = form.hasMicrochip === 'Sim'
        ? (form.microchipNumber.trim() || 'Sim')
        : 'Não'

      await api.put(`/patients/${id}`, {
        name: form.petName,
        species: form.species,
        breed: form.breed,
        birthDate: birthDateISO,
        sex: form.sex,
        weightKg: parsedWeight ?? undefined,
        observations: form.observations || undefined,
        microchip: microchipPayload,
        photoUrl: form.photoUrl || undefined,
        tutor: {
          cpf: onlyDigits(form.tutorCpf),
          fullName: form.tutorFullName,
          phone: form.tutorPhone.replace(/\D/g, ''),
          email: form.tutorEmail,
          insurance: form.tutorInsurance,
          address,
        },
      })

      showToast('Dados atualizados com sucesso!', 'success')
      setTimeout(() => navigate(`/pacientes/${id}`), 900)
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Erro ao salvar alteracoes.')
      showToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    setShowSaveModal(true)
  }

  async function handleConfirmSave() {
    setShowSaveModal(false)
    await performSave()
  }

  if (loading) {
    return (
      <div className="patient-details-loading">
        <div className="spinner spinner-dark" />
      </div>
    )
  }

  if (!patient) {
    return <div className="patient-details-empty">Paciente nao encontrado.</div>
  }

  const age = calculateAge(form.birthDate)

  return (
    <div className="register-patient-page patient-edit-page">
      {toast && (
        <div className={`register-toast ${toast.type}`} role="alert">
          {toast.message}
        </div>
      )}

      <div className="register-top-bar patient-edit-topbar">
        <button className="register-back-btn" onClick={() => setShowExitModal(true)} type="button">
          <ChevronLeft />
          Voltar
        </button>

        <button className="register-submit-btn patient-edit-submit" onClick={() => setShowSaveModal(true)} type="button" disabled={saving}>
          <Save size={16} />
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="patient-edit-scroll">
        <div className="section-header">
          <PawPrint />
          <h2>Paciente</h2>
        </div>

        <div className="form-row-photo patient-edit-photo-row">
          <div className="photo-upload-container">
            <label className="register-label">Foto:</label>
            <div className="photo-upload" title="Alterar foto" onClick={() => document.getElementById('patient-edit-photo-upload')?.click()}>
              <input
                type="file"
                id="patient-edit-photo-upload"
                hidden
                accept="image/*"
                onChange={handlePhotoChange}
              />
              {form.photoUrl ? (
                <img src={form.photoUrl} alt={form.petName || 'Paciente'} />
              ) : (
                <PawPrint />
              )}
            </div>
            <label className="photo-upload-label" htmlFor="patient-edit-photo-upload">
              <ImagePlus size={14} /> Alterar foto
            </label>
          </div>

          <div className="form-group flex-1">
            <label className="register-label" htmlFor="pet-name">
              Nome do Pet: <span className="required">*</span>
            </label>
            <input id="pet-name" className="register-input" value={form.petName} onChange={(e) => updateField('petName', e.target.value)} />
            {errors.petName && <span className="field-error">{errors.petName}</span>}
          </div>

          <div className="form-group flex-1">
            <label className="register-label" htmlFor="birth-date">
              Data de nascimento: <span className="required">*</span>
            </label>
            <input
              id="birth-date"
              className="register-input"
              value={form.birthDate}
              onChange={(e) => updateField('birthDate', maskDate(e.target.value))}
              maxLength={10}
            />
            {errors.birthDate && <span className="field-error">{errors.birthDate}</span>}
          </div>

          <div className="form-group flex-1">
            <label className="register-label">Idade:</label>
            <input className="register-input" value={age} readOnly style={{ background: 'var(--gray-50)' }} />
          </div>

          <div className="form-group flex-1">
            <label className="register-label" htmlFor="species">
              Especie: <span className="required">*</span>
            </label>
            <select id="species" className="register-select" value={form.species} onChange={(e) => updateField('species', e.target.value)}>
              <option value="">Selecionar</option>
              {SPECIES_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {errors.species && <span className="field-error">{errors.species}</span>}
          </div>
        </div>

        <div className="form-row patient-edit-row-5">
          <div className="form-group">
            <label className="register-label" htmlFor="breed">
              Raca: <span className="required">*</span>
            </label>
            <input id="breed" className="register-input" value={form.breed} onChange={(e) => updateField('breed', e.target.value)} />
            {errors.breed && <span className="field-error">{errors.breed}</span>}
          </div>

          <div className="form-group">
            <label className="register-label" htmlFor="weight">
              Peso atual: <span className="required">*</span>
            </label>
            <input id="weight" className="register-input" value={form.weightKg} onChange={(e) => updateField('weightKg', e.target.value)} />
            {errors.weightKg && <span className="field-error">{errors.weightKg}</span>}
          </div>

          <div className="form-group">
            <label className="register-label">
              Sexo: <span className="required">*</span>
            </label>
            <div className="radio-group">
              <label className="radio-option">
                <input type="radio" name="sex" value="Feminino" checked={form.sex === 'Feminino'} onChange={(e) => updateField('sex', e.target.value)} />
                Feminino
              </label>
              <label className="radio-option">
                <input type="radio" name="sex" value="Masculino" checked={form.sex === 'Masculino'} onChange={(e) => updateField('sex', e.target.value)} />
                Masculino
              </label>
            </div>
            {errors.sex && <span className="field-error">{errors.sex}</span>}
          </div>

          <div className="form-group">
            <label className="register-label">
              Possui microchip? <span className="required">*</span>
            </label>
            <div className="radio-group">
              <label className="radio-option">
                <input type="radio" name="microchip" value="Sim" checked={form.hasMicrochip === 'Sim'} onChange={(e) => updateField('hasMicrochip', e.target.value)} />
                Sim
              </label>
              <label className="radio-option">
                <input type="radio" name="microchip" value="Nao" checked={form.hasMicrochip === 'Nao' || form.hasMicrochip === 'Não'} onChange={() => updateField('hasMicrochip', 'Não')} />
                Nao
              </label>
            </div>
            {errors.hasMicrochip && <span className="field-error">{errors.hasMicrochip}</span>}
          </div>
        </div>

        <div className="form-row patient-edit-row-2">
          <div className="form-group">
            <label className="register-label" htmlFor="microchip-number">
              Numero do microchip: <span className="required">*</span>
            </label>
            <input
              id="microchip-number"
              className="register-input"
              value={form.microchipNumber}
              disabled={form.hasMicrochip !== 'Sim'}
              onChange={(e) => updateField('microchipNumber', e.target.value)}
            />
            {errors.microchipNumber && <span className="field-error">{errors.microchipNumber}</span>}
          </div>

          <div className="form-group">
            <label className="register-label" htmlFor="observations">Observacoes:</label>
            <input id="observations" className="register-input" value={form.observations} onChange={(e) => updateField('observations', e.target.value)} />
          </div>
        </div>

        <div className="section-header patient-edit-tutor-title">
          <User />
          <h2>Tutor</h2>
        </div>

        <p className="section-subtitle">Dados basicos</p>

        <div className="form-row form-row-4">
          <div className="form-group">
            <label className="register-label" htmlFor="tutor-name">Nome completo: <span className="required">*</span></label>
            <input id="tutor-name" className="register-input" value={form.tutorFullName} onChange={(e) => updateField('tutorFullName', e.target.value)} />
            {errors.tutorFullName && <span className="field-error">{errors.tutorFullName}</span>}
          </div>

          <div className="form-group">
            <label className="register-label" htmlFor="tutor-cpf">CPF: <span className="required">*</span></label>
            <input id="tutor-cpf" className="register-input" value={form.tutorCpf} onChange={(e) => updateField('tutorCpf', maskCpf(e.target.value))} maxLength={14} />
            {errors.tutorCpf && <span className="field-error">{errors.tutorCpf}</span>}
          </div>

          <div className="form-group">
            <label className="register-label" htmlFor="tutor-phone">Contato: <span className="required">*</span></label>
            <input id="tutor-phone" className="register-input" value={form.tutorPhone} onChange={(e) => updateField('tutorPhone', maskPhone(e.target.value))} maxLength={15} />
            {errors.tutorPhone && <span className="field-error">{errors.tutorPhone}</span>}
          </div>

          <div className="form-group">
            <label className="register-label" htmlFor="tutor-email">Email: <span className="required">*</span></label>
            <input id="tutor-email" type="email" className="register-input" value={form.tutorEmail} onChange={(e) => updateField('tutorEmail', e.target.value)} />
            {errors.tutorEmail && <span className="field-error">{errors.tutorEmail}</span>}
          </div>
        </div>

        <div className="form-row form-row-4" style={{ marginBottom: 'var(--space-lg)' }}>
          <div className="form-group">
            <label className="register-label" htmlFor="tutor-insurance">Convenio: <span className="required">*</span></label>
            <select id="tutor-insurance" className="register-select" value={form.tutorInsurance} onChange={(e) => updateField('tutorInsurance', e.target.value)}>
              <option value="">Selecionar</option>
              {INSURANCE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {errors.tutorInsurance && <span className="field-error">{errors.tutorInsurance}</span>}
          </div>
        </div>

        <p className="section-subtitle">Endereco</p>

        <div className="form-row form-row-4">
          <div className="form-group">
            <label className="register-label" htmlFor="cep">CEP: <span className="required">*</span></label>
            <input id="cep" className="register-input" value={form.cep} onChange={(e) => void handleCepChange(e.target.value)} maxLength={9} inputMode="numeric" />
            {isFetchingCep && <span className="field-hint">Buscando endereço…</span>}
            {errors.cep && <span className="field-error">{errors.cep}</span>}
          </div>

          <div className="form-group">
            <label className="register-label" htmlFor="state">Estado: <span className="required">*</span></label>
            <select id="state" className="register-select" value={form.state} onChange={(e) => updateField('state', e.target.value)}>
              <option value="">Selecionar</option>
              {STATES_BR.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {errors.state && <span className="field-error">{errors.state}</span>}
          </div>

          <div className="form-group">
            <label className="register-label" htmlFor="city">Cidade: <span className="required">*</span></label>
            <input id="city" className="register-input" value={form.city} onChange={(e) => updateField('city', e.target.value)} />
            {errors.city && <span className="field-error">{errors.city}</span>}
          </div>

          <div className="form-group">
            <label className="register-label" htmlFor="neighborhood">Bairro: <span className="required">*</span></label>
            <input id="neighborhood" className="register-input" value={form.neighborhood} onChange={(e) => updateField('neighborhood', e.target.value)} />
            {errors.neighborhood && <span className="field-error">{errors.neighborhood}</span>}
          </div>
        </div>

        <div className="form-row form-row-3">
          <div className="form-group">
            <label className="register-label" htmlFor="street">Logradouro: <span className="required">*</span></label>
            <input id="street" className="register-input" value={form.street} onChange={(e) => updateField('street', e.target.value)} />
            {errors.street && <span className="field-error">{errors.street}</span>}
          </div>

          <div className="form-group">
            <label className="register-label" htmlFor="address-number">Numero: <span className="required">*</span></label>
            <input id="address-number" ref={addressNumberRef} className="register-input" value={form.addressNumber} onChange={(e) => updateField('addressNumber', e.target.value)} />
            {errors.addressNumber && <span className="field-error">{errors.addressNumber}</span>}
          </div>

          <div className="form-group">
            <label className="register-label" htmlFor="complement">Complemento:</label>
            <input id="complement" className="register-input" value={form.complement} onChange={(e) => updateField('complement', e.target.value)} />
          </div>
        </div>
      </form>

      {showSaveModal && (
        <div className="patient-edit-modal-overlay" role="presentation">
          <div className="patient-edit-modal">
            <Save className="patient-edit-modal-icon save" />
            <h3>Salvar alterações</h3>
            <p>Deseja salvar as alterações que realizou?</p>
            <div className="patient-edit-modal-actions">
              <button type="button" className="ghost" onClick={() => setShowSaveModal(false)}>
                Cancelar
              </button>
              <button type="button" className="confirm save" onClick={() => void handleConfirmSave()}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {showExitModal && (
        <div className="patient-edit-modal-overlay" role="presentation">
          <div className="patient-edit-modal">
            <CircleHelp className="patient-edit-modal-icon exit" />
            <h3>Deseja sair ?</h3>
            <p>Você não salvou as alterações que realizou, deseja sair mesmo assim?</p>
            <div className="patient-edit-modal-actions">
              <button type="button" className="ghost" onClick={() => setShowExitModal(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="confirm exit"
                onClick={() => {
                  setShowExitModal(false)
                  navigate(`/pacientes/${id}`)
                }}
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
