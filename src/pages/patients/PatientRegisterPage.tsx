import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Save, PawPrint, User, Plus } from 'lucide-react'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errorMessage'
import { isValidCpf, maskCep, maskCpf, maskDate, maskPhone, onlyDigits } from '../../lib/documents'
import { CepNotFoundError, CepRequestError, fetchAddressByCep } from '../../lib/cep'
import { TutorsService } from '../../services/tutors.service'
import type { Tutor } from '../../types'
import '../../styles/patients.css'

const SPECIES_OPTIONS = [
  'Cachorro',
  'Gato',
  'Pássaro',
  'Roedor',
  'Réptil',
  'Peixe',
  'Outro',
]

const INSURANCE_OPTIONS = [
  'Nenhum',
  'PetLove',
  'Porto Seguro Pet',
  'Cobasi Saúde',
  'Petcare',
  'Outro',
]

const STATES_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

type TutorMode = 'new' | 'existing'

interface FormData {
  // Patient
  petName: string
  birthDate: string
  species: string
  breed: string
  sex: string
  weightKg: string
  hasMicrochip: string
  microchipNumber: string
  observations: string
  photoUrl?: string
  // Tutor
  tutorFullName: string
  tutorCpf: string
  tutorPhone: string
  tutorEmail: string
  tutorInsurance: string
  // Address
  cep: string
  state: string
  city: string
  neighborhood: string
  street: string
  addressNumber: string
  complement: string
}

const initialForm: FormData = {
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

function calculateAge(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return ''
  const parts = dateStr.split('/')
  if (parts.length !== 3) return ''
  const day = parseInt(parts[0])
  const month = parseInt(parts[1]) - 1
  const year = parseInt(parts[2])
  if (isNaN(day) || isNaN(month) || isNaN(year)) return ''
  const birth = new Date(year, month, day)
  const today = new Date()
  let years = today.getFullYear() - birth.getFullYear()
  let months = today.getMonth() - birth.getMonth()
  if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
    years--
    months += 12
  }
  if (years > 0) return `${years} ano${years > 1 ? 's' : ''}`
  if (months > 0) return `${months} m${months > 1 ? 'eses' : 'ês'}`
  return 'Recém-nascido'
}

function parseDateBR(dateStr: string): string | undefined {
  if (!dateStr || dateStr.length < 10) return undefined
  const parts = dateStr.split('/')
  if (parts.length !== 3) return undefined
  const [d, m, y] = parts.map(Number)
  if (isNaN(d) || isNaN(m) || isNaN(y)) return undefined
  return new Date(y, m - 1, d).toISOString()
}

function isValidDateBR(dateStr: string): boolean {
  if (!dateStr || dateStr.length < 10) return false
  const parts = dateStr.split('/')
  if (parts.length !== 3) return false
  const day = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const year = parseInt(parts[2], 10)
  if (isNaN(day) || isNaN(month) || isNaN(year)) return false
  if (month < 1 || month > 12) return false
  
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false
  }
  return true
}

function extractWeightNumber(value: string): number | null {
  const normalized = value.replace(/[^\d.,]/g, '').replace(',', '.')
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isNaN(parsed) ? null : parsed
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function extractAddressFields(addressStr?: string | null) {
  const raw = {
    cep: '',
    state: '',
    city: '',
    neighborhood: '',
    street: '',
    addressNumber: '',
    complement: '',
  }

  if (!addressStr) return raw

  const parts = addressStr.split(',').map((item) => item.trim()).filter(Boolean)
  const cepPart = parts.find((item) => item.startsWith('CEP:'))
  const numberPart = parts.find((item) => item.startsWith('nº'))

  raw.street = parts[0] || ''
  if (cepPart) raw.cep = cepPart.replace('CEP:', '').trim()
  if (numberPart) raw.addressNumber = numberPart.replace('nº', '').trim()

  let cursor = parts.length - 1
  if (cepPart) cursor -= 1

  if (cursor > 0 && parts[cursor] !== numberPart && parts[cursor] !== raw.street) {
    raw.state = parts[cursor]
    cursor -= 1
  }
  if (cursor > 0 && parts[cursor] !== numberPart && parts[cursor] !== raw.street) {
    raw.city = parts[cursor]
    cursor -= 1
  }
  if (cursor > 0 && parts[cursor] !== numberPart && parts[cursor] !== raw.street) {
    raw.neighborhood = parts[cursor]
    cursor -= 1
  }

  if (numberPart) {
    const numberIdx = parts.indexOf(numberPart)
    if (numberIdx !== -1 && numberIdx < cursor) {
      raw.complement = parts.slice(numberIdx + 1, cursor + 1).join(', ')
    }
  } else if (cursor > 0) {
    raw.complement = parts.slice(1, cursor + 1).join(', ')
  }

  return raw
}

export function PatientRegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormData>(initialForm)
  const [tutorMode, setTutorMode] = useState<TutorMode>('new')
  const [tutorSearch, setTutorSearch] = useState('')
  const [tutorSearchResults, setTutorSearchResults] = useState<Tutor[]>([])
  const [selectedTutorId, setSelectedTutorId] = useState('')
  const [searchingTutor, setSearchingTutor] = useState(false)
  const [tutorSelectionError, setTutorSelectionError] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [isFetchingCep, setIsFetchingCep] = useState(false)
  const cepAbortRef = useRef<AbortController | null>(null)
  const addressNumberRef = useRef<HTMLInputElement | null>(null)

  function updateField(field: keyof FormData, value: string) {
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
    setTimeout(() => setToast(null), 4000)
  }

  function handleMicrochipSelection(value: string) {
    setForm((prev) => ({
      ...prev,
      hasMicrochip: value,
      microchipNumber: value === 'Sim' ? prev.microchipNumber : '',
    }))

    setErrors((prev) => {
      const next = { ...prev }
      delete next.hasMicrochip
      if (value !== 'Sim') delete next.microchipNumber
      return next
    })
  }

  function clearTutorFields() {
    setForm((prev) => ({
      ...prev,
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
    }))
  }

  function clearTutorErrors() {
    setErrors((prev) => {
      const next = { ...prev }
      delete next.tutorFullName
      delete next.tutorCpf
      delete next.tutorPhone
      delete next.tutorEmail
      delete next.tutorInsurance
      delete next.cep
      delete next.state
      delete next.city
      delete next.neighborhood
      delete next.street
      delete next.addressNumber
      delete next.complement
      return next
    })
  }

  function handleTutorModeChange(mode: TutorMode) {
    setTutorMode(mode)
    setTutorSearch('')
    setTutorSearchResults([])
    setSelectedTutorId('')
    setTutorSelectionError('')
    clearTutorFields()
    clearTutorErrors()
  }

  async function listAllTutors() {
    const tutors: Tutor[] = []
    let page = 1
    let total = 0

    do {
      const response = await TutorsService.list(page)
      tutors.push(...response.tutors)
      total = response.total
      page += 1
    } while (tutors.length < total && page <= 20)

    return tutors
  }

  async function handleSearchTutor() {
    const query = tutorSearch.trim()
    if (!query) {
      setTutorSelectionError('Digite nome ou CPF para buscar um tutor')
      setTutorSearchResults([])
      setSelectedTutorId('')
      return
    }

    setSearchingTutor(true)
    setTutorSelectionError('')
    setTutorSearchResults([])
    setSelectedTutorId('')

    try {
      const cpfDigits = onlyDigits(query)
      let tutors: Tutor[] = []

      if (cpfDigits.length >= 3) {
        tutors = await listAllTutors()
      } else {
        const response = await TutorsService.list(1, query)
        tutors = response.tutors
      }

      const normalizedQuery = normalizeText(query)
      const filtered = tutors.filter((tutor) => {
        const tutorName = normalizeText(tutor.fullName)
        const tutorCpfDigits = onlyDigits(tutor.cpf)
        const matchesName = tutorName.includes(normalizedQuery)
        const matchesCpf = cpfDigits.length > 0 && tutorCpfDigits.includes(cpfDigits)
        return matchesName || matchesCpf
      })

      const uniqueResults = Array.from(new Map(filtered.map((item) => [item.id, item])).values())
      setTutorSearchResults(uniqueResults)

      if (uniqueResults.length === 0) {
        setTutorSelectionError('Nenhum tutor encontrado para o termo informado')
      }
    } catch {
      showToast('Não foi possível buscar tutores agora.', 'error')
    } finally {
      setSearchingTutor(false)
    }
  }

  function handleSelectExistingTutor(tutorId: string) {
    setSelectedTutorId(tutorId)

    if (!tutorId) {
      clearTutorFields()
      setTutorSelectionError('Selecione um tutor existente para continuar')
      return
    }

    const tutor = tutorSearchResults.find((item) => item.id === tutorId)
    if (!tutor) return

    const address = extractAddressFields(tutor.address)
    setForm((prev) => ({
      ...prev,
      tutorFullName: tutor.fullName,
      tutorCpf: maskCpf(tutor.cpf),
      tutorPhone: maskPhone(tutor.phone),
      tutorEmail: tutor.email || '',
      tutorInsurance: tutor.insurance || 'Nenhum',
      cep: address.cep,
      state: address.state,
      city: address.city,
      neighborhood: address.neighborhood,
      street: address.street,
      addressNumber: address.addressNumber,
      complement: address.complement,
    }))

    clearTutorErrors()
    setTutorSelectionError('')
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
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
    const newErrors: Partial<Record<keyof FormData, string>> = {}
    if (!form.petName.trim()) newErrors.petName = 'Nome do pet é obrigatório'
    if (!form.species) newErrors.species = 'Espécie é obrigatória'
    if (!form.breed.trim()) newErrors.breed = 'Raça é obrigatória'
    if (!form.sex) newErrors.sex = 'Sexo é obrigatório'
    if (!form.hasMicrochip) newErrors.hasMicrochip = 'Informe se possui microchip'
    if (form.hasMicrochip === 'Sim' && !form.microchipNumber.trim()) {
      newErrors.microchipNumber = 'Número do microchip é obrigatório'
    }
    if (form.weightKg.trim()) {
      const parsedWeight = extractWeightNumber(form.weightKg)
      if (parsedWeight === null) {
        newErrors.weightKg = 'Peso inválido'
      } else if (parsedWeight > 999.99) {
        newErrors.weightKg = 'Peso deve ser menor ou igual a 999,99 kg'
      }
    }
    if (!form.birthDate || form.birthDate.length < 10) {
      newErrors.birthDate = 'Data de nascimento é obrigatória'
    } else if (!isValidDateBR(form.birthDate)) {
      newErrors.birthDate = 'Data de nascimento inválida'
    }
    const missingTutorSelection = tutorMode === 'existing' && !selectedTutorId
    if (missingTutorSelection) {
      setTutorSelectionError('Selecione um tutor existente para continuar')
    } else {
      setTutorSelectionError('')
    }

    if (tutorMode === 'new') {
      if (!form.tutorFullName.trim()) newErrors.tutorFullName = 'Nome do tutor é obrigatório'
      if (!form.tutorCpf || !isValidCpf(form.tutorCpf)) newErrors.tutorCpf = 'CPF inválido'
      if (!form.tutorPhone || form.tutorPhone.replace(/\D/g, '').length < 10) newErrors.tutorPhone = 'Telefone inválido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0 && !missingTutorSelection
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) {
      return
    }

    setLoading(true)
    try {
      let tutorId: string

      if (tutorMode === 'existing') {
        if (!selectedTutorId) {
          setTutorSelectionError('Selecione um tutor existente para continuar')
          setLoading(false)
          return
        }
        tutorId = selectedTutorId
      } else {
        const addressParts = [
          form.street,
          form.addressNumber && `nº ${form.addressNumber}`,
          form.complement,
          form.neighborhood,
          form.city,
          form.state,
          form.cep && `CEP: ${form.cep}`,
        ].filter(Boolean)
        const addressStr = addressParts.length > 0 ? addressParts.join(', ') : undefined
        const cpfClean = onlyDigits(form.tutorCpf)
        const phoneClean = form.tutorPhone.replace(/\D/g, '')

        const tutorPayload = {
          fullName: form.tutorFullName,
          cpf: cpfClean,
          phone: phoneClean,
          email: form.tutorEmail || undefined,
          address: addressStr,
          insurance: form.tutorInsurance && form.tutorInsurance !== 'Nenhum' ? form.tutorInsurance : undefined,
        }

        try {
          const tutorRes = await api.post('/tutors', tutorPayload)
          tutorId = tutorRes.data.tutor.id
        } catch (err: unknown) {
          if (
            typeof err === 'object' &&
            err &&
            'response' in err &&
            (err as { response?: { status?: number } }).response?.status === 409
          ) {
            showToast('Tutor já cadastrado. Use a opção "Selecionar tutor existente".', 'error')
            setLoading(false)
            return
          }
          throw err
        }
      }

      // 3. Create patient
      const birthDateISO = parseDateBR(form.birthDate)
      const microchipValue = form.microchipNumber.trim()
      const parsedWeight = extractWeightNumber(form.weightKg)
      const patientPayload = {
        name: form.petName,
        tutorId,
        species: form.species,
        breed: form.breed || undefined,
        birthDate: birthDateISO,
        sex: form.sex || undefined,
        weightKg: parsedWeight ?? undefined,
        observations: form.observations || undefined,
        microchip: form.hasMicrochip === 'Sim' ? (microchipValue || 'Sim') : undefined,
        photoUrl: form.photoUrl || undefined,
      };
      
      await api.post('/patients', patientPayload)

      showToast('Paciente cadastrado com sucesso!', 'success')
      setTimeout(() => navigate('/pacientes'), 1500)
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Ocorreu um erro inesperado. Tente novamente.')
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const age = calculateAge(form.birthDate)

  return (
    <div className="register-patient-page">
      {/* Toast */}
      {toast && (
        <div className={`register-toast ${toast.type}`} role="alert">
          {toast.message}
        </div>
      )}

      {/* Top bar */}
      <div className="register-top-bar">
        <button
          className="register-back-btn"
          onClick={() => navigate('/pacientes')}
          type="button"
        >
          <ChevronLeft />
          Voltar
        </button>
        <button
          className="register-submit-btn"
          onClick={handleSubmit}
          disabled={loading}
          id="finalize-registration-btn"
          type="button"
        >
          <Save />
          {loading ? 'Salvando...' : 'Finalizar cadastro'}
        </button>
      </div>

      <h1 className="register-title">Cadastro de novo paciente</h1>

      <form onSubmit={handleSubmit} noValidate>
        {/* ═══ PACIENTE ═══ */}
        <div className="section-header">
          <PawPrint />
          <h2>Paciente</h2>
        </div>

        {/* Photo + first row of fields */}
        <div className="form-row-photo">
          {/* Photo */}
          <div className="photo-upload-container">
            <label className="register-label">Foto:</label>
            <div 
              className="photo-upload" 
              title="Adicionar foto" 
              onClick={() => document.getElementById('photo-upload')?.click()}
            >
              <input 
                type="file" 
                id="photo-upload" 
                hidden 
                accept="image/*" 
                onChange={handlePhotoChange} 
              />
              {form.photoUrl ? (
                <img src={form.photoUrl} alt="Pet" />
              ) : (
                <PawPrint />
              )}
            </div>
            <label className="photo-upload-label" htmlFor="photo-upload">
              <Plus size={14} /> {form.photoUrl ? 'Trocar foto' : 'Adicionar foto'}
            </label>
          </div>

          {/* Nome do Pet */}
          <div className="form-group flex-1">
            <label className="register-label" htmlFor="pet-name">
              Nome do Pet: <span className="required">*</span>
            </label>
            <input
              id="pet-name"
              className="register-input"
              type="text"
              placeholder="Nome"
              value={form.petName}
              onChange={(e) => updateField('petName', e.target.value)}
            />
            {errors.petName && <span className="field-error">{errors.petName}</span>}
          </div>

          {/* Data de nascimento */}
          <div className="form-group flex-1">
            <label className="register-label" htmlFor="birth-date">
              Data de nascimento: <span className="required">*</span>
            </label>
            <input
              id="birth-date"
              className="register-input"
              type="text"
              placeholder="dd/mm/aaaa"
              value={form.birthDate}
              onChange={(e) => updateField('birthDate', maskDate(e.target.value))}
              maxLength={10}
            />
            {errors.birthDate && <span className="field-error">{errors.birthDate}</span>}
          </div>

          {/* Idade (auto-calculated) */}
          <div className="form-group flex-1">
            <label className="register-label">Idade:</label>
            <input
              className="register-input"
              type="text"
              placeholder="Idade"
              value={age}
              readOnly
              style={{ background: 'var(--gray-50)', cursor: 'default' }}
            />
          </div>

          {/* Espécie */}
          <div className="form-group flex-1">
            <label className="register-label" htmlFor="species">
              Espécie: <span className="required">*</span>
            </label>
            <select
              id="species"
              className="register-select"
              value={form.species}
              onChange={(e) => updateField('species', e.target.value)}
            >
              <option value="">Selecionar</option>
              {SPECIES_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {errors.species && <span className="field-error">{errors.species}</span>}
          </div>
        </div>

        {/* Second row: Raça, Peso, Sexo, Microchip */}
        <div className="form-row form-row-4">
          {/* Raça */}
          <div className="form-group">
            <label className="register-label" htmlFor="breed">
              Raça: <span className="required">*</span>
            </label>
            <input
              id="breed"
              className="register-input"
              type="text"
              placeholder="Raça"
              value={form.breed}
              onChange={(e) => updateField('breed', e.target.value)}
            />
            {errors.breed && <span className="field-error">{errors.breed}</span>}
          </div>

          {/* Peso atual */}
          <div className="form-group">
            <label className="register-label" htmlFor="weight">
              Peso atual:
            </label>
            <input
              id="weight"
              className="register-input"
              type="text"
              placeholder="Peso"
              value={form.weightKg}
              onChange={(e) => {
                const val = e.target.value.replace(/[^\d.,]/g, '')
                updateField('weightKg', val)
              }}
            />
            {errors.weightKg && <span className="field-error">{errors.weightKg}</span>}
          </div>

          {/* Sexo */}
          <div className="form-group">
            <label className="register-label">
              Sexo: <span className="required">*</span>
            </label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="sex"
                  value="Feminino"
                  checked={form.sex === 'Feminino'}
                  onChange={(e) => updateField('sex', e.target.value)}
                />
                Feminino
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="sex"
                  value="Masculino"
                  checked={form.sex === 'Masculino'}
                  onChange={(e) => updateField('sex', e.target.value)}
                />
                Masculino
              </label>
            </div>
            {errors.sex && <span className="field-error">{errors.sex}</span>}
          </div>

          {/* Microchip */}
          <div className="form-group">
            <label className="register-label">
              Possui microchip? <span className="required">*</span>
            </label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="microchip"
                  value="Sim"
                  checked={form.hasMicrochip === 'Sim'}
                  onChange={(e) => handleMicrochipSelection(e.target.value)}
                />
                Sim
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="microchip"
                  value="Não"
                  checked={form.hasMicrochip === 'Não'}
                  onChange={(e) => handleMicrochipSelection(e.target.value)}
                />
                Não
              </label>
            </div>
            {errors.hasMicrochip && <span className="field-error">{errors.hasMicrochip}</span>}
          </div>
        </div>

        {form.hasMicrochip === 'Sim' && (
          <div className="form-row form-row-1">
            <div className="form-group">
              <label className="register-label" htmlFor="microchip-number">
                Número do microchip: <span className="required">*</span>
              </label>
              <input
                id="microchip-number"
                className="register-input"
                type="text"
                placeholder="Digite o número do microchip"
                value={form.microchipNumber}
                onChange={(e) => updateField('microchipNumber', e.target.value)}
              />
              {errors.microchipNumber && <span className="field-error">{errors.microchipNumber}</span>}
            </div>
          </div>
        )}

        {/* Observações */}
        <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
          <label className="register-label" htmlFor="observations">
            Observações:
          </label>
          <textarea
            id="observations"
            className="register-textarea"
            placeholder="Escreva uma observação se necessário"
            value={form.observations}
            onChange={(e) => updateField('observations', e.target.value)}
          />
        </div>

        <hr className="form-separator" />

        {/* ═══ TUTOR ═══ */}
        <div className="section-header">
          <User />
          <h2>Tutor</h2>
        </div>

        <p className="section-subtitle">Vínculo do tutor</p>

        <div className="form-row form-row-1">
          <div className="form-group">
            <label className="register-label">Como deseja vincular o tutor?</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="tutor-mode"
                  checked={tutorMode === 'new'}
                  onChange={() => handleTutorModeChange('new')}
                />
                Cadastrar novo tutor
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="tutor-mode"
                  checked={tutorMode === 'existing'}
                  onChange={() => handleTutorModeChange('existing')}
                />
                Selecionar tutor existente
              </label>
            </div>
          </div>
        </div>

        {tutorMode === 'existing' && (
          <>
            <div className="form-row form-row-2">
              <div className="form-group">
                <label className="register-label" htmlFor="existing-tutor-search">
                  Buscar tutor por CPF ou nome:
                </label>
                <input
                  id="existing-tutor-search"
                  className="register-input"
                  type="text"
                  placeholder="Digite CPF ou nome do tutor"
                  value={tutorSearch}
                  onChange={(e) => setTutorSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void handleSearchTutor()
                    }
                  }}
                />
              </div>

              <div className="form-group">
                <label className="register-label">&nbsp;</label>
                <button
                  className="register-submit-btn tutor-search-btn"
                  type="button"
                  onClick={() => void handleSearchTutor()}
                  disabled={searchingTutor || !tutorSearch.trim() || loading}
                >
                  {searchingTutor ? 'Buscando...' : 'Buscar tutor'}
                </button>
              </div>
            </div>

            <div className="form-row form-row-1">
              <div className="form-group">
                <label className="register-label" htmlFor="existing-tutor-results">
                  Resultado da busca:
                </label>
                <select
                  id="existing-tutor-results"
                  className="register-select"
                  value={selectedTutorId}
                  onChange={(e) => handleSelectExistingTutor(e.target.value)}
                  disabled={searchingTutor || tutorSearchResults.length === 0}
                >
                  <option value="">
                    {tutorSearchResults.length > 0 ? 'Selecione um tutor' : 'Nenhum tutor listado'}
                  </option>
                  {tutorSearchResults.map((tutor) => (
                    <option key={tutor.id} value={tutor.id}>
                      {`${tutor.fullName} • CPF ${maskCpf(tutor.cpf)}`}
                    </option>
                  ))}
                </select>
                {tutorSelectionError && <span className="field-error">{tutorSelectionError}</span>}
              </div>
            </div>
          </>
        )}

        <p className="section-subtitle">Dados básicos</p>

        <div className="form-row form-row-4">
          {/* Nome completo */}
          <div className="form-group">
            <label className="register-label" htmlFor="tutor-name">
              Nome completo:
            </label>
            <input
              id="tutor-name"
              className="register-input"
              type="text"
              placeholder="Nome completo"
              value={form.tutorFullName}
              disabled={tutorMode === 'existing'}
              onChange={(e) => updateField('tutorFullName', e.target.value)}
            />
            {errors.tutorFullName && <span className="field-error">{errors.tutorFullName}</span>}
          </div>

          {/* CPF */}
          <div className="form-group">
            <label className="register-label" htmlFor="tutor-cpf">
              CPF:
            </label>
            <input
              id="tutor-cpf"
              className="register-input"
              type="text"
              placeholder="___.___.___-__"
              value={form.tutorCpf}
              disabled={tutorMode === 'existing'}
              onChange={(e) => updateField('tutorCpf', maskCpf(e.target.value))}
              maxLength={14}
            />
            {errors.tutorCpf && <span className="field-error">{errors.tutorCpf}</span>}
          </div>

          {/* Contato */}
          <div className="form-group">
            <label className="register-label" htmlFor="tutor-phone">
              Contato:
            </label>
            <input
              id="tutor-phone"
              className="register-input"
              type="text"
              placeholder="(__) _____-____"
              value={form.tutorPhone}
              disabled={tutorMode === 'existing'}
              onChange={(e) => updateField('tutorPhone', maskPhone(e.target.value))}
              maxLength={15}
            />
            {errors.tutorPhone && <span className="field-error">{errors.tutorPhone}</span>}
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="register-label" htmlFor="tutor-email">
              Email:
            </label>
            <input
              id="tutor-email"
              className="register-input"
              type="email"
              placeholder="exemplo@gmail.com"
              value={form.tutorEmail}
              disabled={tutorMode === 'existing'}
              onChange={(e) => updateField('tutorEmail', e.target.value)}
            />
          </div>
        </div>

        {/* Convênio */}
        <div className="form-row form-row-4" style={{ marginBottom: 'var(--space-lg)' }}>
          <div className="form-group">
            <label className="register-label" htmlFor="tutor-insurance">
              Convênio:
            </label>
            <select
              id="tutor-insurance"
              className="register-select"
              value={form.tutorInsurance}
              disabled={tutorMode === 'existing'}
              onChange={(e) => updateField('tutorInsurance', e.target.value)}
            >
              <option value="">Selecionar</option>
              {INSURANCE_OPTIONS.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
        </div>

        <p className="section-subtitle">Endereço</p>

        <div className="form-row form-row-4">
          {/* CEP */}
          <div className="form-group">
            <label className="register-label" htmlFor="cep">
              CEP:
            </label>
            <input
              id="cep"
              className="register-input"
              type="text"
              placeholder="_____-___"
              value={form.cep}
              disabled={tutorMode === 'existing'}
              onChange={(e) => void handleCepChange(e.target.value)}
              maxLength={9}
              inputMode="numeric"
            />
            {isFetchingCep && <span className="field-hint">Buscando endereço…</span>}
            {errors.cep && <span className="field-error">{errors.cep}</span>}
          </div>

          {/* Estado */}
          <div className="form-group">
            <label className="register-label" htmlFor="state">
              Estado:
            </label>
            <select
              id="state"
              className="register-select"
              value={form.state}
              disabled={tutorMode === 'existing'}
              onChange={(e) => updateField('state', e.target.value)}
            >
              <option value="">Selecionar</option>
              {STATES_BR.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Cidade */}
          <div className="form-group">
            <label className="register-label" htmlFor="city">
              Cidade:
            </label>
            <input
              id="city"
              className="register-input"
              type="text"
              placeholder="Cidade"
              value={form.city}
              disabled={tutorMode === 'existing'}
              onChange={(e) => updateField('city', e.target.value)}
            />
          </div>

          {/* Bairro */}
          <div className="form-group">
            <label className="register-label" htmlFor="neighborhood">
              Bairro:
            </label>
            <input
              id="neighborhood"
              className="register-input"
              type="text"
              placeholder="Bairro"
              value={form.neighborhood}
              disabled={tutorMode === 'existing'}
              onChange={(e) => updateField('neighborhood', e.target.value)}
            />
          </div>
        </div>

        <div className="form-row form-row-3">
          {/* Logradouro */}
          <div className="form-group">
            <label className="register-label" htmlFor="street">
              Logradouro:
            </label>
            <input
              id="street"
              className="register-input"
              type="text"
              placeholder="Logradouro"
              value={form.street}
              disabled={tutorMode === 'existing'}
              onChange={(e) => updateField('street', e.target.value)}
            />
          </div>

          {/* Número */}
          <div className="form-group">
            <label className="register-label" htmlFor="address-number">
              Número:
            </label>
            <input
              id="address-number"
              ref={addressNumberRef}
              className="register-input"
              type="text"
              placeholder="Número"
              value={form.addressNumber}
              disabled={tutorMode === 'existing'}
              onChange={(e) => updateField('addressNumber', e.target.value)}
            />
          </div>

          {/* Complemento */}
          <div className="form-group">
            <label className="register-label" htmlFor="complement">
              Complemento:
            </label>
            <input
              id="complement"
              className="register-input"
              type="text"
              placeholder="Complemento"
              value={form.complement}
              disabled={tutorMode === 'existing'}
              onChange={(e) => updateField('complement', e.target.value)}
            />
          </div>
        </div>
      </form>
    </div>
  )
}
