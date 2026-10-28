import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { authService } from '../../lib/authService'
import { getErrorMessage, getValidationIssueMessage } from '../../lib/errorMessage'
import { useAuthStore } from '../../stores/authStore'
import { PawSvg, FishSvg, BoneSvg } from '../../components/auth/PetDecorations'
import { GoogleLoginButton, GoogleIcon } from '../../components/auth/GoogleLoginButton'
import { ClinicCodeInput } from '../../components/auth/ClinicCodeInput'
import { isGoogleOAuthConfigured } from '../../lib/googleOAuth'
import type { Clinic } from '../../types'
import '../../styles/auth.css'

type AccountType = 'OWNER' | 'VET'

const REGISTER_SUCCESS_MESSAGE = 'Conta criada com sucesso! Faça login para continuar.'

export function RegisterPage() {
  const [accountType, setAccountType] = useState<AccountType>('OWNER')
  const [name, setName] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [crmv, setCrmv] = useState('')
  const [clinicCode, setClinicCode] = useState('')
  const [resolvedClinic, setResolvedClinic] = useState<Clinic | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [googleLoading, setGoogleLoading] = useState(false)

  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  const isVet = accountType === 'VET'
  // O cadastro de VET só é liberado após a sigla ser validada pelo ClinicCodeInput
  const isVetClinicPending = isVet && !resolvedClinic

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (isVetClinicPending) return
    setError('')
    setLoading(true)

    try {
      if (isVet) {
        await authService.registerVet({ name, email, password, crmv, clinicCode })
      } else {
        await authService.register({ name, email, password, clinicName })
      }
      navigate('/login', { state: { message: REGISTER_SUCCESS_MESSAGE } })
    } catch (err: unknown) {
      const validationIssue = getValidationIssueMessage(err)
      setError(validationIssue || getErrorMessage(err, 'Erro ao criar conta.'))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (accessToken: string) => {
    setError('')
    setGoogleLoading(true)
    try {
      const data = await authService.googleLogin(accessToken)
      setAuth(data.user, data.accessToken, data.refreshToken)
      navigate('/login') // Força o VET a logar se precisar, ou vai direto. No Google é OWNER por padrão se novo.
      // Wait, let's navigate to home since setAuth is called.
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

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-account-tabs" role="group" aria-label="Tipo de conta">
            <button
              type="button"
              className={`auth-account-tab ${!isVet ? 'active' : ''}`}
              aria-pressed={!isVet}
              onClick={() => setAccountType('OWNER')}
            >
              Dono de Clínica
            </button>
            <button
              type="button"
              className={`auth-account-tab ${isVet ? 'active' : ''}`}
              aria-pressed={isVet}
              onClick={() => setAccountType('VET')}
            >
              Médico Veterinário
            </button>
          </div>

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

          {isVet ? (
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
                  onChange={(e) => setCrmv(e.target.value)}
                  required
                  minLength={2}
                  maxLength={40}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="register-clinic-code">
                  Sigla da clínica
                </label>
                <ClinicCodeInput
                  id="register-clinic-code"
                  value={clinicCode}
                  onChange={setClinicCode}
                  onClinicResolved={setResolvedClinic}
                  required
                />
              </div>
            </>
          ) : (
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
            disabled={loading || googleLoading || isVetClinicPending}
          >
            {loading ? (
              <span className="spinner" />
            ) : isVet ? (
              'Criar Conta de Veterinário'
            ) : (
              'Criar conta'
            )}
          </button>

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

          <div className="auth-switch text-center">
            Já tem conta?{' '}
            <Link to="/login">Entrar</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
