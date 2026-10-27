import { useEffect, useMemo, useState } from 'react'
import { Building2, Check, LoaderCircle, UserRound } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { authService } from '../../lib/authService'
import { clinicService } from '../../lib/clinicService'
import { getErrorMessage } from '../../lib/errorMessage'
import { isValidCnpj, maskCnpj, maskPhone, onlyDigits } from '../../lib/documents'
import type { User } from '../../types'
import '../../styles/settings.css'

function patchCurrentUser(partial: Partial<User>) {
  useAuthStore.setState((state) => ({
    ...state,
    user: state.user ? { ...state.user, ...partial } : state.user,
  }))
}

type FeedbackState = { kind: 'success' | 'error'; message: string } | null

function normalizeCrmv(value: string) {
  const trimmed = value.trim().toUpperCase()
  if (!trimmed) return ''

  const match = trimmed.match(/^(?:CRMV[-\s]?)?([A-Z]{2})[-\s]?(\d{4,6})$/)
  if (!match) return null

  const [, uf, number] = match
  return `CRMV-${uf} ${number}`
}

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)

  const isOwner = user?.role === 'OWNER'

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<User | null>(null)

  const [clinicForm, setClinicForm] = useState({ name: '', cnpj: '', address: '', phone: '' })
  const [profileForm, setProfileForm] = useState({ name: '', crmv: '' })

  const [clinicFeedback, setClinicFeedback] = useState<FeedbackState>(null)
  const [profileFeedback, setProfileFeedback] = useState<FeedbackState>(null)

  const [savingClinic, setSavingClinic] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const [meRes, clinicRes] = await Promise.all([
          authService.getMe(),
          clinicService.getMyClinic().catch(() => null),
        ])

        if (cancelled) return

        setProfile(meRes)
        const normalizedCrmv = normalizeCrmv(meRes.crmv ?? '')
        setProfileForm({ name: meRes.name ?? '', crmv: normalizedCrmv ?? (meRes.crmv ?? '') })

        if (clinicRes) {
          setClinicForm({
            name: clinicRes.name ?? '',
            cnpj: maskCnpj(clinicRes.cnpj ?? ''),
            address: clinicRes.address ?? '',
            phone: maskPhone(clinicRes.phone ?? ''),
          })
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setProfileFeedback({
            kind: 'error',
            message: getErrorMessage(err, 'Não foi possível carregar seus dados.'),
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleClinicSubmit(event: React.FormEvent) {
    event.preventDefault()
    setClinicFeedback(null)
    const cnpjDigits = onlyDigits(clinicForm.cnpj)
    if (cnpjDigits && !isValidCnpj(cnpjDigits)) {
      setClinicFeedback({ kind: 'error', message: 'CNPJ inválido.' })
      return
    }

    setSavingClinic(true)
    try {
      const updated = await clinicService.updateMyClinic({
        name: clinicForm.name.trim() || undefined,
        cnpj: cnpjDigits || null,
        address: clinicForm.address.trim() || null,
        phone: clinicForm.phone.trim() || null,
      })
      setClinicForm({
        name: updated.name ?? '',
        cnpj: maskCnpj(updated.cnpj ?? ''),
        address: updated.address ?? '',
        phone: maskPhone(updated.phone ?? ''),
      })
      setClinicFeedback({ kind: 'success', message: 'Dados da clínica atualizados.' })
    } catch (err: unknown) {
      setClinicFeedback({
        kind: 'error',
        message: getErrorMessage(err, 'Não foi possível salvar.'),
      })
    } finally {
      setSavingClinic(false)
    }
  }

  async function handleProfileSubmit(event: React.FormEvent) {
    event.preventDefault()
    setProfileFeedback(null)
    const normalizedCrmv = normalizeCrmv(profileForm.crmv)

    if (profileForm.crmv.trim() && !normalizedCrmv) {
      setProfileFeedback({
        kind: 'error',
        message: 'CRMV inválido. Use o formato CRMV-UF 12345.',
      })
      return
    }

    setSavingProfile(true)
    try {
      const updated = await authService.updateMe({
        name: profileForm.name.trim() || undefined,
        crmv: normalizedCrmv || null,
      })
      setProfile(updated)
      const updatedCrmv = normalizeCrmv(updated.crmv ?? '') ?? updated.crmv ?? null
      patchCurrentUser({ name: updated.name, crmv: updatedCrmv })
      setProfileForm((prev) => ({ ...prev, crmv: normalizedCrmv ?? '' }))
      setProfileFeedback({ kind: 'success', message: 'Perfil atualizado.' })
    } catch (err: unknown) {
      setProfileFeedback({
        kind: 'error',
        message: getErrorMessage(err, 'Não foi possível salvar.'),
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const showClinicCard = useMemo(() => isOwner, [isOwner])

  if (loading) {
    return (
      <div className="settings-state">
        <LoaderCircle className="settings-spin" />
      </div>
    )
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1>Informações do Veterinário</h1>
        <p>Mantenha seus dados cadastrais atualizados — eles aparecem em receitas e documentos emitidos.</p>
      </header>

      {showClinicCard && (
        <section className="settings-card">
          <div className="settings-card-title">
            <Building2 size={18} />
            <h2>Dados da Clínica</h2>
          </div>
          <p className="settings-card-subtitle">
            Informações exibidas no cabeçalho das receitas geradas.
          </p>

          <form className="settings-form" onSubmit={handleClinicSubmit}>
            <label className="settings-field">
              <span>Nome da clínica</span>
              <input
                type="text"
                value={clinicForm.name}
                onChange={(e) => setClinicForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Clínica Veterinária Exemplo"
              />
            </label>

            <label className="settings-field">
              <span>CNPJ</span>
              <input
                type="text"
                value={clinicForm.cnpj}
                onChange={(e) => setClinicForm((p) => ({ ...p, cnpj: maskCnpj(e.target.value) }))}
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                maxLength={18}
              />
            </label>

            <label className="settings-field settings-field-wide">
              <span>Endereço</span>
              <input
                type="text"
                value={clinicForm.address}
                onChange={(e) => setClinicForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="Rua, número, bairro, cidade/UF"
              />
            </label>

            <label className="settings-field">
              <span>Telefone</span>
              <input
                type="text"
                value={clinicForm.phone}
                onChange={(e) => setClinicForm((p) => ({ ...p, phone: maskPhone(e.target.value) }))}
                placeholder="(00) 00000-0000"
                inputMode="numeric"
                maxLength={15}
              />
            </label>

            {clinicFeedback && (
              <div className={`settings-feedback ${clinicFeedback.kind}`}>
                {clinicFeedback.kind === 'success' && <Check size={14} />}
                <span>{clinicFeedback.message}</span>
              </div>
            )}

            <div className="settings-actions">
              <button type="submit" className="settings-button" disabled={savingClinic}>
                {savingClinic ? 'Salvando…' : 'Salvar clínica'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="settings-card">
        <div className="settings-card-title">
          <UserRound size={18} />
          <h2>Meu Perfil</h2>
        </div>
        <p className="settings-card-subtitle">
          Nome e CRMV aparecem abaixo da sua assinatura nas receitas emitidas.
        </p>

        <form className="settings-form" onSubmit={handleProfileSubmit}>
          <label className="settings-field">
            <span>Nome completo</span>
            <input
              type="text"
              value={profileForm.name}
              onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Seu nome completo"
            />
          </label>

          <label className="settings-field">
            <span>CRMV</span>
            <input
              type="text"
              value={profileForm.crmv}
              onChange={(e) => setProfileForm((p) => ({ ...p, crmv: e.target.value.toUpperCase() }))}
              onBlur={() => {
                const normalizedCrmv = normalizeCrmv(profileForm.crmv)
                if (normalizedCrmv) {
                  setProfileForm((p) => ({ ...p, crmv: normalizedCrmv }))
                }
              }}
              placeholder="CRMV-XX 00000"
              maxLength={14}
            />
          </label>

          <label className="settings-field settings-field-wide settings-field-readonly">
            <span>E-mail</span>
            <input type="email" value={profile?.email ?? ''} readOnly />
          </label>

          {profileFeedback && (
            <div className={`settings-feedback ${profileFeedback.kind}`}>
              {profileFeedback.kind === 'success' && <Check size={14} />}
              <span>{profileFeedback.message}</span>
            </div>
          )}

          <div className="settings-actions">
            <button type="submit" className="settings-button" disabled={savingProfile}>
              {savingProfile ? 'Salvando…' : 'Salvar perfil'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default SettingsPage
