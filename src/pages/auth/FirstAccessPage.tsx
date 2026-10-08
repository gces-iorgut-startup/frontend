import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AxiosError } from 'axios'
import { ChevronLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { PawSvg, FishSvg, BoneSvg } from '../../components/auth/PetDecorations'
import { api } from '../../lib/api'
import { getErrorMessage, getValidationIssueMessage } from '../../lib/errorMessage'
import '../../styles/auth.css'

type VerifyTokenResponse = {
  email: string
  type: 'FIRST_ACCESS' | 'RECOVERY'
  role: 'OWNER' | 'VET' | 'TUTOR'
}

type TokenState =
  | { status: 'checking' }
  | { status: 'valid'; email: string; role: VerifyTokenResponse['role'] }
  | { status: 'invalid'; message: string }

const INVALID_LINK_MESSAGE = 'Link expirado ou já utilizado. Peça um novo convite à clínica.'

// Token inexistente (404) ou expirado/usado (400) recebem a mensagem amigável;
// outros erros (ex.: 429 do rate limit) mostram a mensagem da API
function getTokenErrorMessage(err: unknown): string {
  const status = err instanceof AxiosError ? err.response?.status : undefined
  if (status === 400 || status === 404) return INVALID_LINK_MESSAGE
  return getErrorMessage(err, 'Não foi possível validar o link. Tente novamente mais tarde.')
}

export function FirstAccessPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [tokenState, setTokenState] = useState<TokenState>(
    token ? { status: 'checking' } : { status: 'invalid', message: INVALID_LINK_MESSAGE },
  )

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  // O token vem do link do e-mail de convite e é validado antes de exibir o formulário
  useEffect(() => {
    if (!token) return

    let cancelled = false

    api
      .get<VerifyTokenResponse>('/auth/verify-token', { params: { token } })
      .then(({ data }) => {
        if (!cancelled) setTokenState({ status: 'valid', email: data.email, role: data.role })
      })
      .catch((err: unknown) => {
        if (!cancelled) setTokenState({ status: 'invalid', message: getTokenErrorMessage(err) })
      })

    return () => {
      cancelled = true
    }
  }, [token])

  // Mesmas regras do backend (setPasswordController)
  const hasMinLength = newPassword.length >= 6
  const hasMaxLength = newPassword.length <= 72
  const hasUppercase = /[A-Z]/.test(newPassword)
  const hasNumber = /[0-9]/.test(newPassword)
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword)

  const isValidPassword = hasMinLength && hasMaxLength && hasUppercase && hasNumber && hasSpecial
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setApiError('')

    if (!token || tokenState.status !== 'valid') return

    if (!isValidPassword) {
      setApiError('A senha não atende a todos os requisitos.')
      return
    }

    if (!passwordsMatch) return

    setLoading(true)

    try {
      await api.post('/auth/set-password', { token, newPassword })
      const loginPath = tokenState.role === 'TUTOR' ? '/portal/login' : '/login'
      navigate(loginPath, { state: { message: 'Senha definida com sucesso! Faça login para continuar.' } })
    } catch (err: unknown) {
      setApiError(
        getValidationIssueMessage(err) ?? getErrorMessage(err, 'Erro ao definir a senha. Tente novamente.'),
      )
    } finally {
      setLoading(false)
    }
  }

  const renderCheckItem = (label: string, valid: boolean) => (
    <div className={`password-check-item ${valid ? 'valid' : ''}`}>
      <CheckCircle2 size={16} className="check-icon" />
      <span>{label}</span>
    </div>
  )

  return (
    <div className="auth-page">
      <PawSvg className="auth-deco auth-deco-paw" />
      <FishSvg className="auth-deco auth-deco-fish" />
      <BoneSvg className="auth-deco auth-deco-bone" />
      <PawSvg className="auth-deco auth-deco-paw2" />

      <Link to="/portal/login" className="forgot-back-link">
        <ChevronLeft size={18} />
        Voltar
      </Link>

      <div className="auth-card reset-card">
        <h1 className="forgot-title text-center">Bem-vindo ao Portal do Tutor</h1>

        {tokenState.status === 'checking' && (
          <p className="forgot-description">Validando seu link de acesso...</p>
        )}

        {tokenState.status === 'invalid' && (
          <>
            <div className="form-error" role="alert">{tokenState.message}</div>
            <Link to="/portal/login" className="btn btn-primary auth-submit w-full">
              Ir para o login
            </Link>
          </>
        )}

        {tokenState.status === 'valid' && (
          <>
            <p className="forgot-description">
              Defina a senha de acesso para <strong>{tokenState.email}</strong>. Ela deve ter
              pelo menos 6 caracteres, incluindo uma letra maiúscula, um número e um símbolo.
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="first-access-password">
                  Senha
                </label>
                <div className="form-input-wrapper">
                  <input
                    id="first-access-password"
                    className="form-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="********"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    autoFocus
                    required
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

              <div className="form-group">
                <label className="form-label" htmlFor="first-access-confirm-password">
                  Confirmar senha
                </label>
                <div className="form-input-wrapper">
                  <input
                    id="first-access-confirm-password"
                    className={`form-input ${!passwordsMatch && confirmPassword.length > 0 ? 'input-error' : ''}`}
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="********"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="form-input-icon"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Esconder senha' : 'Mostrar senha'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {!passwordsMatch && confirmPassword.length > 0 && (
                  <span className="text-red-500 text-xs mt-1">ⓘ Senhas não coincidem</span>
                )}
              </div>

              {apiError && <div className="form-error" role="alert">{apiError}</div>}

              <div className="password-checklist">
                {renderCheckItem('Mínimo de 6 caracteres;', hasMinLength)}
                {renderCheckItem('Uma letra maiúscula;', hasUppercase)}
                {renderCheckItem('Um número;', hasNumber)}
                {renderCheckItem('Um caractere especial;', hasSpecial)}
              </div>

              <button
                type="submit"
                className="btn btn-primary auth-submit w-full"
                disabled={loading || !isValidPassword || !passwordsMatch}
              >
                {loading ? <span className="spinner" /> : 'Definir senha'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
