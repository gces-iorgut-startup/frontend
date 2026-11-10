import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Save } from 'lucide-react'
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

const SPECIES_API: Record<string, string> = {
  Cachorro: 'CANINE',
  Gato: 'FELINE',
  Pássaro: 'BIRD',
  Roedor: 'RODENT',
  Réptil: 'REPTILE',
}

const SEX_API: Record<string, string> = {
  Masculino: 'MALE',
  Feminino: 'FEMALE',
}

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
          const tutorRes = aliasPostTutor(tutorPayload)
          tutorId = (await tutorRes).data.tutor.id
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
        species: SPECIES_API[form.species] ?? form.species,
        breed: form.breed || undefined,
        birthDate: birthDateISO,
        sex: SEX_API[form.sex] ?? undefined,
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

  function aliasPostTutor(payload: unknown) {
    return api.post('/tutors', payload)
  }

  const age = calculateAge(form.birthDate)

  return (
    <div className="patient-register-container">
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.message}
        </div>
      )}

      <div className="page-header">
        <button type="button" className="back-button" onClick={() => navigate('/pacientes')}>
          <ChevronLeft size={20} />
          Voltar
        </button>
        <h1>Cadastrar Novo Paciente</h1>
      </div>

      <form onSubmit={handleSubmit} className="patient-form">
        <section className="form-section">
          <h2>Informações do Tutor</h2>
          
          <div className="tutor-mode-selector">
            <button
              type="button"
              className={`mode-btn ${tutorMode === 'new' ? 'active' : ''}`}
              onClick={() => handleTutorModeChange('new')}
            >
              Novo Tutor
            </button>
            <button
              type="button"
              className={`mode-btn ${tutorMode === 'existing' ? 'active' : ''}`}
              onClick={() => handleTutorModeChange('existing')}
            >
              Selecionar Tutor Existente
            </button>
          </div>

          {tutorMode === 'existing' && (
            <div className="existing-tutor-search">
              <div className="search-input-group">
                <input
                  type="text"
                  placeholder="Buscar por nome ou CPF..."
                  value={tutorSearch}
                  onChange={(e) => setTutorSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchTutor())}
                />
                <button type="button" onClick={handleSearchTutor} disabled={searchingTutor}>
                  {searchingTutor ? 'Buscando...' : 'Buscar'}
                </button>
              </div>

              {tutorSearchResults.length > 0 && (
                <div className="search-results-list">
                  <select
                    value={selectedTutorId}
                    onChange={(e) => handleSelectExistingTutor(e.target.value)}
                  >
                    <option value="">Selecione um tutor na lista...</option>
                    {tutorSearchResults.map((tutor) => (
                      <option key={tutor.id} value={tutor.id}>
                        {tutor.fullName} - CPF: {maskCpf(tutor.cpf)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {tutorSelectionError && <span className="error-text">{tutorSelectionError}</span>}
            </div>
          )}

          <div className="form-grid">
            <div className="form-group">
              <label>Nome Completo do Tutor *</label>
              <input
                type="text"
                value={form.tutorFullName}
                disabled={tutorMode === 'existing'}
                onChange={(e) => updateField('tutorFullName', e.target.value)}
              />
              {errors.tutorFullName && <span className="error-text">{errors.tutorFullName}</span>}
            </div>

            <div className="form-group">
              <label>CPF *</label>
              <input
                type="text"
                value={form.tutorCpf}
                disabled={tutorMode === 'existing'}
                maxLength={14}
                onChange={(e) => updateField('tutorCpf', maskCpf(e.target.value))}
              />
              {errors.tutorCpf && <span className="error-text">{errors.tutorCpf}</span>}
            </div>

            <div className="form-group">
              <label>Telefone / WhatsApp *</label>
              <input
                type="text"
                value={form.tutorPhone}
                disabled={tutorMode === 'existing'}
                maxLength={15}
                onChange={(e) => updateField('tutorPhone', maskPhone(e.target.value))}
              />
              {errors.tutorPhone && <span className="error-text">{errors.tutorPhone}</span>}
            </div>

            <div className="form-group">
              <label>E-mail</label>
              <input
                type="email"
                value={form.tutorEmail}
                disabled={tutorMode === 'existing'}
                onChange={(e) => updateField('tutorEmail', e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="form-section">
          <h2>Endereço</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>CEP</label>
              <div className="cep-input-group">
                <input
                  type="text"
                  value={form.cep}
                  disabled={tutorMode === 'existing'}
                  maxLength={9}
                  placeholder="00000-000"
                  onChange={(e) => handleCepChange(e.target.value)}
                />
                {isFetchingCep && <span className="cep-loading">Buscando...</span>}
              </div>
              {errors.cep && <span className="error-text">{errors.cep}</span>}
            </div>

            <div className="form-group">
              <label>Estado (UF)</label>
              <select
                value={form.state}
                disabled={tutorMode === 'existing'}
                onChange={(e) => updateField('state', e.target.value)}
              >
                <option value="">Selecione...</option>
                {STATES_BR.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Cidade</label>
              <input
                type="text"
                value={form.city}
                disabled={tutorMode === 'existing'}
                onChange={(e) => updateField('city', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Bairro</label>
              <input
                type="text"
                value={form.neighborhood}
                disabled={tutorMode === 'existing'}
                onChange={(e) => updateField('neighborhood', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Rua / Logradouro</label>
              <input
                type="text"
                value={form.street}
                disabled={tutorMode === 'existing'}
                onChange={(e) => updateField('street', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Número</label>
              <input
                type="text"
                ref={addressNumberRef}
                value={form.addressNumber}
                disabled={tutorMode === 'existing'}
                onChange={(e) => updateField('addressNumber', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Complemento</label>
              <input
                type="text"
                value={form.complement}
                disabled={tutorMode === 'existing'}
                onChange={(e) => updateField('complement', e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="form-section">
          <h2>Informações do Paciente (Pet)</h2>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Nome do Pet *</label>
              <input
                type="text"
                value={form.petName}
                onChange={(e) => updateField('petName', e.target.value)}
              />
              {errors.petName && <span className="error-text">{errors.petName}</span>}
            </div>

            <div className="form-group">
              <label>Espécie *</label>
              <select
                value={form.species}
                onChange={(e) => updateField('species', e.target.value)}
              >
                <option value="">Selecione a espécie...</option>
                {SPECIES_OPTIONS.map((spec) => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
              {errors.species && <span className="error-text">{errors.species}</span>}
            </div>

            <div className="form-group">
              <label>Raça *</label>
              <input
                type="text"
                value={form.breed}
                onChange={(e) => updateField('breed', e.target.value)}
              />
              {errors.breed && <span className="error-text">{errors.breed}</span>}
            </div>

            <div className="form-group">
              <label>Sexo *</label>
              <select
                value={form.sex}
                onChange={(e) => updateField('sex', e.target.value)}
              >
                <option value="">Selecione o sexo...</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
              </select>
              {errors.sex && <span className="error-text">{errors.sex}</span>}
            </div>

            <div className="form-group">
              <label>Data de Nascimento *</label>
              <input
                type="text"
                placeholder="DD/MM/AAAA"
                maxLength={10}
                value={form.birthDate}
                onChange={(e) => updateField('birthDate', maskDate(e.target.value))}
              />
              {age && <span className="helper-text">Idade calculada: {age}</span>}
              {errors.birthDate && <span className="error-text">{errors.birthDate}</span>}
            </div>

            <div className="form-group">
              <label>Peso (kg)</label>
              <input
                type="text"
                placeholder="Ex: 5,4"
                value={form.weightKg}
                onChange={(e) => updateField('weightKg', e.target.value)}
              />
              {errors.weightKg && <span className="error-text">{errors.weightKg}</span>}
            </div>

            <div className="form-group">
              <label>Possui Microchip? *</label>
              <select
                value={form.hasMicrochip}
                onChange={(e) => handleMicrochipSelection(e.target.value)}
              >
                <option value="">Selecione...</option>
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
              {errors.hasMicrochip && <span className="error-text">{errors.hasMicrochip}</span>}
            </div>

            {form.hasMicrochip === 'Sim' && (
              <div className="form-group">
                <label>Número do Microchip *</label>
                <input
                  type="text"
                  value={form.microchipNumber}
                  onChange={(e) => updateField('microchipNumber', e.target.value)}
                />
                {errors.microchipNumber && <span className="error-text">{errors.microchipNumber}</span>}
              </div>
            )}
          </div>

          <div className="form-group full-width">
            <label>Observações Clínicas</label>
            <textarea
              rows={3}
              value={form.observations}
              onChange={(e) => updateField('observations', e.target.value)}
            />
          </div>
        </section>

        <div className="form-actions">
          <button type="submit" className="save-btn" disabled={loading}>
            <Save size={18} />
            {loading ? 'Salvando...' : 'Salvar Paciente'}
          </button>
        </div>
      </form>
    </div>
  )
}