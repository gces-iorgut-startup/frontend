import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TutorVaccineAlertBanner } from '../TutorVaccineAlertBanner'
import type { TutorAlert } from '../../../types'

describe('TutorVaccineAlertBanner — Alertas de Vacinação do Tutor (EVO-06)', () => {
  it('não deve renderizar nada se não houver alertas de vacina', () => {
    const alerts: TutorAlert[] = [
      {
        type: 'vet_recommendation',
        message: 'Manter hidratação',
        patientName: 'Pipoca',
      },
    ]

    const { container } = render(
      <TutorVaccineAlertBanner alerts={alerts} onRequestAppointment={vi.fn()} />
    )

    expect(container.firstChild).toBeNull()
  })

  it('deve renderizar banner de vacina atrasada com mensagem formatada e badge de alerta', () => {
    const alerts: TutorAlert[] = [
      {
        type: 'overdue_vaccine',
        message: 'Vacina V10 atrasada',
        patientName: 'Pipoca',
        patientId: 'pet-1',
        vaccineName: 'V10',
        doseNumber: 1,
        date: '2026-11-01T12:00:00.000Z',
        daysDifference: 11,
      },
    ]

    render(
      <TutorVaccineAlertBanner alerts={alerts} onRequestAppointment={vi.fn()} />
    )

    expect(screen.getByTestId('tutor-vaccine-alert-banner')).toBeInTheDocument()
    expect(screen.getByText('Vacina Atrasada')).toBeInTheDocument()
    expect(screen.getByText('Pipoca')).toBeInTheDocument()
    expect(screen.getByText('V10 (Dose 1)')).toBeInTheDocument()
    expect(screen.getByText('01/11/2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Solicitar Agendamento/i })).toBeInTheDocument()
  })

  it('deve renderizar banner de vacina a vencer com badge de próxima dose', () => {
    const alerts: TutorAlert[] = [
      {
        type: 'upcoming_vaccine',
        message: 'Vacina Antirrábica próxima',
        patientName: 'Thor',
        patientId: 'pet-2',
        vaccineName: 'Antirrábica',
        doseNumber: 2,
        date: '2026-11-20T12:00:00.000Z',
        daysDifference: 8,
      },
    ]

    render(
      <TutorVaccineAlertBanner alerts={alerts} onRequestAppointment={vi.fn()} />
    )

    expect(screen.getByText('Próxima Dose')).toBeInTheDocument()
    expect(screen.getByText('Thor')).toBeInTheDocument()
    expect(screen.getByText('Antirrábica (Dose 2)')).toBeInTheDocument()
    expect(screen.getByText('20/11/2026')).toBeInTheDocument()
  })

  it('deve acionar o callback onRequestAppointment ao clicar no botão "Solicitar Agendamento"', async () => {
    const handleRequest = vi.fn()
    const user = userEvent.setup()

    const overdueAlert: TutorAlert = {
      type: 'overdue_vaccine',
      message: 'Vacina atrasada',
      patientName: 'Pipoca',
      patientId: 'pet-1',
      vaccineName: 'Giárdia',
      doseNumber: 1,
      date: '2026-11-05T12:00:00.000Z',
    }

    render(
      <TutorVaccineAlertBanner
        alerts={[overdueAlert]}
        onRequestAppointment={handleRequest}
      />
    )

    const button = screen.getByRole('button', { name: /Solicitar Agendamento/i })
    await user.click(button)

    expect(handleRequest).toHaveBeenCalledWith(overdueAlert)
  })
})
