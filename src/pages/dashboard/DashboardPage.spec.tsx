import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardService } from '../../services/dashboard.service'
import { DashboardPage } from './DashboardPage'

vi.mock('../../services/dashboard.service', () => ({
  DashboardService: {
    getAdminMetrics: vi.fn(),
    getAdminAppointmentsTrend: vi.fn(),
    getRecentActivities: vi.fn(),
  },
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(DashboardService.getAdminMetrics).mockResolvedValue({
      totalPatients: 2,
      appointmentsThisWeek: 1,
      appointmentsThisMonth: 1,
      timeline: { past: 1, future: 0 },
      week: { total: 1, scheduled: 0, inProgress: 0, completed: 1, cancelled: 0 },
      month: { total: 1, scheduled: 0, inProgress: 0, completed: 1, cancelled: 0 },
      categories: {
        week: { observation: 1, vaccination: 0, exam: 0, surgical: 0 },
        month: { observation: 1, vaccination: 0, exam: 0, surgical: 0 },
      },
    })
    vi.mocked(DashboardService.getAdminAppointmentsTrend).mockResolvedValue({ days: 30, trend: [] })
    vi.mocked(DashboardService.getRecentActivities).mockResolvedValue({
      recentAppointments: [{
        id: 'appointment-1',
        patientId: 'patient-1',
        patientName: 'Rex',
        activityType: 'APPOINTMENT_UPDATED',
        updatedAt: '2026-11-11T15:00:00.000Z',
      }],
      recentPatients: [{
        id: 'patient-2',
        name: 'Luna',
        tutorName: 'Maria Silva',
        activityType: 'PATIENT_CREATED',
        createdAt: '2026-11-11T14:00:00.000Z',
      }],
    })
  })

  it('exibe atividades recentes e navega para o registro selecionado', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pacientes/:id" element={<div>Detalhes do paciente</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Atendimento de Rex alterado')).toBeInTheDocument()
    expect(screen.getByText('Luna cadastrado')).toBeInTheDocument()
    expect(DashboardService.getRecentActivities).toHaveBeenCalledWith(5)

    await user.click(screen.getByText('Luna cadastrado'))

    await waitFor(() => {
      expect(screen.getByText('Detalhes do paciente')).toBeInTheDocument()
    })
  })
})
