import { test, expect, type Page } from '@playwright/test'
import { attachProdMonitor } from './helpers/prod-monitor'

const REQUIRE_CREDS = process.env.SMOKE_REQUIRE_CREDENTIALS === 'true'
const EXPECT_SWAGGER_DISABLED = process.env.EXPECT_SWAGGER_DISABLED !== 'false'

const OWNER_EMAIL = process.env.PROD_SMOKE_OWNER_EMAIL?.trim() ?? ''
const OWNER_PASSWORD = process.env.PROD_SMOKE_OWNER_PASSWORD ?? ''
const VET_EMAIL = process.env.PROD_SMOKE_VET_EMAIL?.trim() ?? ''
const VET_PASSWORD = process.env.PROD_SMOKE_VET_PASSWORD ?? ''
const TUTOR_EMAIL = process.env.PROD_SMOKE_TUTOR_EMAIL?.trim() ?? ''
const TUTOR_PASSWORD = process.env.PROD_SMOKE_TUTOR_PASSWORD ?? ''

function assertOrSkipOwnerCredentials() {
  if (OWNER_EMAIL && OWNER_PASSWORD) return
  if (REQUIRE_CREDS) {
    throw new Error(
      'SMOKE_REQUIRE_CREDENTIALS=true, mas PROD_SMOKE_OWNER_EMAIL / PROD_SMOKE_OWNER_PASSWORD não foram configurados.',
    )
  }
  test.skip(true, 'Credenciais Canary de OWNER não configuradas (PROD_SMOKE_OWNER_*).')
}

async function loginAsStaff(page: Page, email: string, password: string) {
  await page.goto('/login')
  await expect(page.locator('#login-email')).toBeVisible()
  await page.locator('#login-email').fill(email)
  await page.locator('#login-password').fill(password)

  const loginResponsePromise = page.waitForResponse(
    (res) => res.url().includes('/api/auth/login') && res.request().method() === 'POST',
  )
  await page.locator('button.auth-submit').click()

  const loginResponse = await loginResponsePromise
  expect(loginResponse.status(), 'POST /api/auth/login deve retornar 200').toBe(200)

  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole('heading', { name: 'Últimos atendimentos' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Agenda do dia' })).toBeVisible()
}

test.describe('WEB-05 — Smoke Tests e Regressão Pós-Deploy em Produção', () => {
  test('Smoke 00: Readiness da API, blindagem /test e contratos básicos (Camada 1)', async ({
    request,
  }) => {
    const htmlRes = await request.get('/')
    expect(htmlRes.status()).toBe(200)
    const htmlBody = await htmlRes.text()
    expect(htmlBody).toContain('<div id="root">')

    const healthRes = await request.get('/api/health')
    expect(healthRes.status()).toBe(200)
    const healthJson = await healthRes.json()
    expect(healthJson.status).toBe('ok')

    const readyRes = await request.get('/api/health/ready')
    expect(readyRes.status()).toBe(200)
    const readyJson = await readyRes.json()
    expect(readyJson).toMatchObject({ status: 'ok', database: 'up' })

    // Rotas de apoio E2E nunca podem existir em produção
    const testTokenRes = await request.post('/api/test/first-access-token', {
      data: { email: 'smoke-check@iougurt.com' },
    })
    expect(
      testTokenRes.status(),
      'FALHA DE SEGURANÇA: POST /api/test/first-access-token exposto em produção',
    ).toBe(404)

    const testCleanupRes = await request.delete(
      '/api/test/clinics/11111111-1111-4111-8111-111111111111',
    )
    expect(
      testCleanupRes.status(),
      'FALHA DE SEGURANÇA: DELETE /api/test/clinics/:id exposto em produção',
    ).toBe(404)

    // Endpoint autenticado deve exigir JWT
    const unauthPatientsRes = await request.get('/api/patients')
    expect(unauthPatientsRes.status()).toBe(401)

    if (EXPECT_SWAGGER_DISABLED) {
      const docsRes = await request.get('/api/docs')
      expect(docsRes.status()).toBe(404)
    }
  })

  test('Smoke 01: Carregamento público (Landing Page, Login e SPA Fallback) sem erros de runtime', async ({
    page,
    baseURL,
  }) => {
    const baseOrigin = new URL(baseURL ?? 'http://127.0.0.1:8080').origin
    const monitor = attachProdMonitor(page, baseOrigin)

    await page.goto('/')
    await expect(page.locator('.landing-logo')).toContainText('iougurt')
    await expect(page.locator('.landing-login-btn')).toBeVisible()
    await expect(
      page.locator('h1', { hasText: 'Transforme a gestão da sua clínica' }),
    ).toBeVisible()

    // Abre dropdown de Login -> Veterinário (/login)
    await page.locator('.landing-login-btn').click()
    await page.locator('.landing-dropdown-item', { hasText: 'Veterinário' }).click()

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.locator('#login-email')).toBeVisible()
    await expect(page.locator('#login-password')).toBeVisible()
    await expect(page.locator('button.auth-submit')).toBeVisible()

    // Reload direto em rota SPA verifica Nginx try_files -> /index.html
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.locator('#login-email')).toBeVisible()

    monitor.assertClean()
  })

  test('Smoke 02: Jornada OWNER Canary — Login, Pacientes, Dashboard, Reload SPA e Logout', async ({
    page,
    baseURL,
  }) => {
    assertOrSkipOwnerCredentials()

    const baseOrigin = new URL(baseURL ?? 'http://127.0.0.1:8080').origin
    const monitor = attachProdMonitor(page, baseOrigin)

    await loginAsStaff(page, OWNER_EMAIL, OWNER_PASSWORD)

    // Pacientes
    const patientsPromise = page.waitForResponse(
      (res) => res.url().includes('/api/patients') && res.request().method() === 'GET',
    )
    await page.locator('a[href="/pacientes"]').click()
    const patientsRes = await patientsPromise
    expect(patientsRes.status()).toBe(200)

    await expect(page).toHaveURL(/\/pacientes$/)
    await expect(page.locator('.patients-loading')).toBeHidden()
    await expect(page.locator('#patients-table, .patients-empty')).toBeVisible()

    // Dashboard Gerencial (OWNER)
    const dashboardPromise = page.waitForResponse(
      (res) =>
        res.url().includes('/api/dashboard/admin') &&
        !res.url().includes('appointments-trend') &&
        res.request().method() === 'GET',
    )
    await page.locator('a[href="/dashboard"]').click()
    const dashboardRes = await dashboardPromise
    expect(dashboardRes.status()).toBe(200)

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.locator('h1', { hasText: 'Painel Gerencial' })).toBeVisible()
    await expect(page.locator('.dashboard-metrics-grid')).toBeVisible()

    // Reload no /dashboard valida SPA fallback + persistência de auth (localStorage iougurt-auth) + refetch API
    const reloadDashboardPromise = page.waitForResponse(
      (res) =>
        res.url().includes('/api/dashboard/admin') &&
        !res.url().includes('appointments-trend') &&
        res.request().method() === 'GET',
    )
    await page.reload({ waitUntil: 'domcontentloaded' })
    const reloadDashboardRes = await reloadDashboardPromise
    expect(reloadDashboardRes.status()).toBe(200)

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.locator('h1', { hasText: 'Painel Gerencial' })).toBeVisible()
    const persistedAuth = await page.evaluate(() => window.localStorage.getItem('iougurt-auth'))
    expect(persistedAuth).toBeTruthy()

    // Logout real
    await page.locator('button.sidebar-logout').click()
    await expect(page).toHaveURL(/\/login$/)

    monitor.assertClean()
  })

  test('Smoke 03: Persistência E2E idempotente no PostgreSQL (Agenda + Limpeza)', async ({
    page,
    baseURL,
  }) => {
    assertOrSkipOwnerCredentials()

    const baseOrigin = new URL(baseURL ?? 'http://127.0.0.1:8080').origin
    const monitor = attachProdMonitor(page, baseOrigin)

    await loginAsStaff(page, OWNER_EMAIL, OWNER_PASSWORD)

    const initialAgendaPromise = page.waitForResponse(
      (res) => res.url().includes('/api/appointments') && res.request().method() === 'GET',
    )
    await page.locator('a[href="/agenda"]').click()
    const initialAgendaRes = await initialAgendaPromise
    expect(initialAgendaRes.status()).toBe(200)
    await expect(page).toHaveURL(/\/agenda$/)
    await expect(page.getByText('Carregando agendamentos…')).toBeHidden()

    // Muda para amanhã (+1 dia) para garantir horário futuro válido
    const tomorrowAgendaPromise = page.waitForResponse(
      (res) => res.url().includes('/api/appointments') && res.request().method() === 'GET',
    )
    await page.locator('.agenda-date-arrow').nth(1).click()
    const tomorrowAgendaRes = await tomorrowAgendaPromise
    expect(tomorrowAgendaRes.status()).toBe(200)
    await expect(page.getByText('Carregando agendamentos…')).toBeHidden()

    const tomorrowBR = (await page.locator('.agenda-date-picker > span').nth(1).innerText()).trim()
    const [dd, mm, yyyy] = tomorrowBR.split('/')
    const tomorrowIso = `${yyyy}-${mm}-${dd}`
    expect(tomorrowIso).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    // Abre modal + Agendar
    await page.locator('.btn-agendar-header').click()
    const modal = page.locator('.schedule-modal-content')
    await expect(modal).toBeVisible()

    const tutorGroup = modal.locator('.form-group', {
      has: modal.locator('.form-label', { hasText: 'Tutor' }),
    })
    const patientGroup = modal.locator('.form-group', {
      has: modal.locator('.form-label', { hasText: 'Paciente' }),
    })
    const startGroup = modal.locator('.form-group', {
      has: modal.locator('.form-label', { hasText: 'Início' }),
    })
    const endGroup = modal.locator('.form-group', {
      has: modal.locator('.form-label', { hasText: 'Fim' }),
    })
    const categoryGroup = modal.locator('.form-group', {
      has: modal.locator('.form-label', { hasText: 'Tipo de atendimento' }),
    })

    // Aguarda carga da lista de tutores e seleciona o primeiro tutor que possua paciente
    await expect(tutorGroup.locator('.custom-select-button')).not.toContainText('Carregando')
    await tutorGroup.locator('.custom-select-button').click()
    const tutorCount = await tutorGroup.locator('.dropdown-overlay .dropdown-item').count()
    expect(tutorCount, 'Clínica Canary precisa de pelo menos 1 tutor cadastrado para o Smoke 03').toBeGreaterThan(0)

    let selectedPatient = false
    const maxTutorChecks = Math.min(tutorCount, 5)
    for (let idx = 0; idx < maxTutorChecks; idx += 1) {
      if (idx > 0) {
        await tutorGroup.locator('.custom-select-button').click()
      }

      const patientsByTutorPromise = page.waitForResponse(
        (res) => res.url().includes('/api/patients') && res.request().method() === 'GET',
      )
      await tutorGroup.locator('.dropdown-overlay .dropdown-item').nth(idx).click()
      await patientsByTutorPromise
      await expect(patientGroup.locator('.custom-select-button')).not.toContainText('Carregando')

      await patientGroup.locator('.custom-select-button').click()
      const patientItems = patientGroup.locator('.dropdown-overlay .dropdown-item')
      if ((await patientItems.count()) > 0) {
        await patientItems.first().click()
        selectedPatient = true
        break
      }
      // Fecha dropdown vazio antes de tentar o próximo tutor
      await patientGroup.locator('.custom-select-button').click()
    }

    expect(
      selectedPatient,
      'Clínica Canary precisa de pelo menos 1 tutor com paciente vinculado para o Smoke 03',
    ).toBe(true)

    // Seleciona primeiro horário de início livre
    await startGroup.locator('.custom-select-button').click()
    const firstStartItem = startGroup.locator('.dropdown-overlay .dropdown-item').first()
    await expect(firstStartItem).toBeVisible()
    const startSlot = (await firstStartItem.innerText()).trim()
    await firstStartItem.click()

    // Seleciona horário de fim imediatamente subsequente
    await endGroup.locator('.custom-select-button').click()
    const firstEndItem = endGroup.locator('.dropdown-overlay .dropdown-item').first()
    await expect(firstEndItem).toBeVisible()
    await firstEndItem.click()

    // Seleciona tipo Consulta
    await categoryGroup.locator('.custom-select-button').click()
    await categoryGroup
      .locator('.dropdown-overlay .dropdown-item', { hasText: 'Consulta' })
      .click()

    await modal.locator('textarea.modal-form-input').fill(`SMOKE-WEB-05 ${Date.now()}`)

    let createdAppointmentId = ''
    let cleanedUp = false

    try {
      const createPromise = page.waitForResponse(
        (res) => res.url().includes('/api/appointments') && res.request().method() === 'POST',
      )
      await modal.locator('.modal-footer .btn-submit').click()

      const createRes = await createPromise
      expect(createRes.status(), 'POST /api/appointments deve retornar 201').toBe(201)
      const createBody = (await createRes.json()) as { appointment?: { id?: string } }
      createdAppointmentId = createBody.appointment?.id ?? ''
      expect(createdAppointmentId).toBeTruthy()

      await expect(modal).toBeHidden()

      // Recarrega a página para provar persistência real no PostgreSQL
      await page.reload({ waitUntil: 'domcontentloaded' })
      await expect(page.getByText('Carregando agendamentos…')).toBeHidden()

      const reloadTomorrowPromise = page.waitForResponse(
        (res) =>
          res.url().includes('/api/appointments') &&
          res.url().includes(`date=${tomorrowIso}`) &&
          res.request().method() === 'GET',
      )
      await page.locator('.agenda-date-arrow').nth(1).click()
      const reloadTomorrowRes = await reloadTomorrowPromise
      expect(reloadTomorrowRes.status()).toBe(200)
      await expect(page.getByText('Carregando agendamentos…')).toBeHidden()

      const reloadTomorrowBody = (await reloadTomorrowRes.json()) as {
        appointments?: Array<{ id: string }>
      }
      expect(
        reloadTomorrowBody.appointments?.some((item) => item.id === createdAppointmentId),
        'Agendamento criado no Smoke 03 não foi retornado pelo PostgreSQL após reload',
      ).toBe(true)

      // Localiza card pelo horário único do slot criado e cancela pela UI
      const createdCard = page
        .locator('.agenda-card', {
          has: page.locator('.agenda-card-time', { hasText: startSlot }),
        })
        .first()
      await expect(createdCard).toBeVisible()
      await createdCard.click()

      const detailModal = page.locator('.agenda-detail-modal')
      await expect(detailModal).toBeVisible()
      await detailModal.locator('.agenda-action-cancelar').click()

      await detailModal
        .locator('textarea.agenda-form-textarea')
        .fill('Cancelamento automático Smoke Test WEB-05')

      const deletePromise = page.waitForResponse(
        (res) =>
          res.url().includes(`/api/appointments/${createdAppointmentId}`) &&
          res.request().method() === 'DELETE',
      )
      await detailModal.getByRole('button', { name: 'Confirmar Cancelamento' }).click()
      const deleteRes = await deletePromise
      expect(deleteRes.status()).toBe(200)

      cleanedUp = true
      await expect(detailModal).toBeHidden()
      await expect(createdCard).toBeHidden()
    } finally {
      if (createdAppointmentId && !cleanedUp) {
        const token = await page.evaluate(() => {
          try {
            const raw = window.localStorage.getItem('iougurt-auth')
            if (!raw) return ''
            const parsed = JSON.parse(raw) as { state?: { accessToken?: string } }
            return parsed.state?.accessToken ?? ''
          } catch {
            return ''
          }
        })

        if (token) {
          await page.request.delete(`/api/appointments/${createdAppointmentId}`, {
            headers: { Authorization: `Bearer ${token}` },
            data: { reason: 'Limpeza fallback Smoke Test WEB-05' },
          })
        }
      }
    }

    await page.locator('button.sidebar-logout').click()
    await expect(page).toHaveURL(/\/login$/)

    monitor.assertClean()
  })

  test('Smoke 04: RBAC VET Canary — Ausência do Dashboard na sidebar e bloqueio em /dashboard', async ({
    page,
    baseURL,
  }) => {
    test.skip(
      !VET_EMAIL || !VET_PASSWORD,
      'Credenciais Canary de VET não configuradas (PROD_SMOKE_VET_*).',
    )

    const baseOrigin = new URL(baseURL ?? 'http://127.0.0.1:8080').origin
    const monitor = attachProdMonitor(page, baseOrigin)

    await loginAsStaff(page, VET_EMAIL, VET_PASSWORD)

    await expect(page.locator('a[href="/dashboard"]')).toHaveCount(0)

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/home$/)

    await page.locator('button.sidebar-logout').click()
    await expect(page).toHaveURL(/\/login$/)

    monitor.assertClean()
  })

  test('Smoke 05: Jornada Portal do Tutor Canary — Login, Meu Pet, Histórico e Logout', async ({
    page,
    baseURL,
  }) => {
    test.skip(
      !TUTOR_EMAIL || !TUTOR_PASSWORD,
      'Credenciais Canary de TUTOR não configuradas (PROD_SMOKE_TUTOR_*).',
    )

    const baseOrigin = new URL(baseURL ?? 'http://127.0.0.1:8080').origin
    const monitor = attachProdMonitor(page, baseOrigin)

    await page.goto('/portal/login')
    await expect(page.locator('#tutor-login-email')).toBeVisible()
    await page.locator('#tutor-login-email').fill(TUTOR_EMAIL)
    await page.locator('#tutor-login-password').fill(TUTOR_PASSWORD)

    const loginPromise = page.waitForResponse(
      (res) => res.url().includes('/api/auth/login') && res.request().method() === 'POST',
    )
    await page.locator('button.auth-submit').click()
    const loginRes = await loginPromise
    expect(loginRes.status()).toBe(200)

    await expect(page).toHaveURL(/\/portal$/)
    await expect(page.locator('.tutor-pet-card')).toBeVisible()
    await expect(page.locator('.tutor-care-card')).toBeVisible()

    await page.locator('a[href="/portal/historico"]').click()
    await expect(page).toHaveURL(/\/portal\/historico$/)
    await expect(page.locator('table.history-table')).toBeVisible()

    await page.locator('button.tutor-sidebar-logout').click()
    await expect(page).toHaveURL(/\/portal\/login$/)

    monitor.assertClean()
  })
})
