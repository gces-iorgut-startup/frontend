import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, Eye, EyeOff, Stethoscope } from 'lucide-react'
import { authService } from '../../lib/authService'
import { getErrorMessage, getValidationIssueMessage } from '../../lib/errorMessage'
import { normalizeCrmv } from '../../lib/documents'
import { useAuthStore } from '../../stores/authStore'
import { PawSvg, FishSvg, BoneSvg } from '../../components/auth/PetDecorations'
import { GoogleLoginButton, GoogleIcon } from '../../components/auth/GoogleLoginButton'
import { ClinicCodeInput } from '../../components/auth/ClinicCodeInput'
import { isGoogleOAuthConfigured } from '../../lib/googleOAuth'
import type { Clinic } from '../../types'
import '../../styles/auth.css'

export type RegisterRole = 'OWNER' | 'VET'

export function RegisterPage() {
  const [role, setRole] = useState<RegisterRole>('OWNER')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Campos específicos do Dono
  const [clinicName, setClinicName] = useState('')

  // Campos específicos do Veterinário
  const [crmv, setCrmv] = useState('')
  const [clinicCode, setClinicCode] = useState('')
  const [resolvedClinic, setResolvedClinic] = useState<Clinic | null>(null)

  const [googleLoading, setGoogleLoading] = useState(false)

  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  const handleRoleChange = (newRole: RegisterRole) => {
    setRole(newRole)
    setError('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (role === 'OWNER') {
      if (!clinicName.trim()) {
        setError('Nome da clínica é obrigatório.')
        return
      }

      setLoading(true)
      try {
        await authService.register({ name: name.trim(), email: email.trim(), password, clinicName: clinicName.trim() })
        navigate('/login', {
          state: { message: 'Conta criada com sucesso! Faça login para continuar.' },
        })
      } catch (err: unknown) {
        const validationIssue = getValidationIssueMessage(err)
        setError(validationIssue || getErrorMessage(err, 'Erro ao criar conta.'))
      } finally {
        setLoading(false)
      }
    } else {
      // Validações do Veterinário
      const normalizedCrmv = normalizeCrmv(crmv)
      if (!normalizedCrmv) {
        setError('CRMV inválido. Utilize o formato CRMV-UF 12345 (ex: CRMV-SP 12345).')
        return
      }

      if (!clinicCode.trim() || !resolvedClinic) {
        setError('Informe uma sigla válida de clínica cadastrada.')
        return
      }

      setLoading(true)
      try {
        await authService.registerVet({
          name: name.trim(),
          email: email.trim(),
          password,
          crmv: normalizedCrmv,
          clinicCode: clinicCode.trim().toUpperCase(),
        })
        navigate('/login', {
          state: { message: 'Cadastro de veterinário realizado com sucesso! Faça login para continuar.' },
        })
      } catch (err: unknown) {
        const validationIssue = getValidationIssueMessage(err)
        setError(validationIssue || getErrorMessage(err, 'Erro ao criar conta de veterinário.'))
      } finally {
        setLoading(false)
      }
    }
  }

  const handleGoogleSuccess = async (accessToken: string) => {
    setError('')
    setGoogleLoading(true)
    try {
      const data = await authService.googleLogin(accessToken)
      setAuth(data.user, data.accessToken, data.refreshToken)
      navigate(data.user.role === 'TUTOR' ? '/portal' : '/home')
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erro ao autenticar com o Google.'))
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <PawSvg className="auth-deco auth-deco-paw" />
      <FishSvg className="auth-deco auth-deco-fish" />
      <BoneSvg className="auth-deco auth-deco-bone" />
      <PawSvg className="auth-deco auth-deco-paw2" />

      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-text">
            iougurt
          </span>
        </div>

        {/* Alternador de Perfil: Dono vs Veterinário */}
        <div className="auth-role-tabs" role="tablist" aria-label="Tipo de conta">
          <button
            type="button"
            role="tab"
            aria-selected={role === 'OWNER'}
            className={`auth-role-tab ${role === 'OWNER' ? 'active' : ''}`}
            onClick={() => handleRoleChange('OWNER')}
            data-testid="tab-owner"
          >
            <Building2 size={18} />
            <span>Dono de Clínica</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={role === 'VET'}
            className={`auth-role-tab ${role === 'VET' ? 'active' : ''}`}
            onClick={() => handleRoleChange('VET')}
            data-testid="tab-vet"
          >
            <Stethoscope size={18} />
            <span>Médico Veterinário</span>
          </button>
        </div>

        <p className="auth-role-desc">
          {role === 'OWNER'
            ? 'Crie uma conta para sua clínica e gerencie sua equipe.'
            : 'Vincule-se à clínica da sua equipe utilizando a sigla fornecida pelo responsável.'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="register-name">
              Seu nome
            </label>
            <input
              id="register-name"
              className="form-input"
              type="text"
              placeholder="Digite seu nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              autoComplete="name"
            />
          </div>

          {/* Campo exclusivo para Dono de Clínica */}
          {role === 'OWNER' && (
            <div className="form-group">
              <label className="form-label" htmlFor="register-clinic">
                Nome da clínica
              </label>
              <input
                id="register-clinic"
                className="form-input"
                type="text"
                placeholder="Ex: Clínica Veterinária PetLife"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                required
                minLength={2}
              />
            </div>
          )}

          {/* Campos exclusivos para Médico Veterinário */}
          {role === 'VET' && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="register-crmv">
                  CRMV
                </label>
                <input
                  id="register-crmv"
                  className="form-input"
                  type="text"
                  placeholder="Ex: CRMV-SP 12345"
                  value={crmv}
                  onChange={(e) => setCrmv(e.target.value.toUpperCase())}
                  onBlur={() => {
                    const normalized = normalizeCrmv(crmv)
                    if (normalized) setCrmv(normalized)
                  }}
                  required
                  autoComplete="off"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="register-clinic-code">
                  Sigla da Clínica
                </label>
                <ClinicCodeInput
                  id="register-clinic-code"
                  value={clinicCode}
                  onChange={setClinicCode}
                  onClinicResolved={setResolvedClinic}
                  required
                  disabled={loading}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="register-email">
              E-mail
            </label>
            <input
              id="register-email"
              className="form-input"
              type="email"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-password">
              Senha
            </label>
            <div className="form-input-wrapper">
              <input
                id="register-password"
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="form-input-icon"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={loading || googleLoading || (role === 'VET' && !resolvedClinic)}
          >
            {loading ? (
              <span className="spinner" />
            ) : role === 'VET' ? (
              'Cadastrar como Veterinário'
            ) : (
              'Criar conta'
            )}
          </button>

          {role === 'OWNER' && (
            <>
              <div className="auth-divider"><span>ou</span></div>
              {isGoogleOAuthConfigured ? (
                <GoogleLoginButton
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Login com Google cancelado ou falhou.')}
                  disabled={loading || googleLoading}
                />
              ) : (
                <button
                  type="button"
                  className="btn auth-google-btn"
                  disabled={loading || googleLoading}
                  onClick={() =>
                    setError(
                      'Configure VITE_GOOGLE_CLIENT_ID em frontend/.env e reinicie o npm run dev.',
                    )
                  }
                >
                  <GoogleIcon />
                  Entrar com Google
                </button>
              )}
            </>
          )}

          <div className="auth-switch text-center">
            Já tem conta?{' '}
            <Link to="/login">Entrar</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
