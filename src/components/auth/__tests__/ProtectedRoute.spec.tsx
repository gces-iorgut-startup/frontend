import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../ProtectedRoute'
import { useAuthStore } from '../../../stores/authStore'
import type { Role, User } from '../../../types'

function makeUser(role: Role): User {
  return {
    id: `user-${role}`,
    name: `User ${role}`,
    email: `${role.toLowerCase()}@iougurt.com`,
    role,
    clinicId: 'clinic-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false })
  })

  it('deve redirecionar para /login quando o usuário não estiver autenticado', () => {
    render(
      <MemoryRouter initialEntries={['/restrito']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/restrito" element={<div>Área Restrita</div>} />
          </Route>
          <Route path="/login" element={<div>Página de Login</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Página de Login')).toBeInTheDocument()
    expect(screen.queryByText('Área Restrita')).not.toBeInTheDocument()
  })

  it('deve renderizar a rota filha quando autenticado e com role permitida', () => {
    useAuthStore.setState({ user: makeUser('VET'), isAuthenticated: true })

    render(
      <MemoryRouter initialEntries={['/restrito']}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={['VET', 'OWNER']} />}>
            <Route path="/restrito" element={<div>Área Restrita</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Área Restrita')).toBeInTheDocument()
  })

  it('deve redirecionar TUTOR, OWNER e VET para suas respectivas áreas base caso tentem acessar rota não permitida', () => {
    useAuthStore.setState({ user: makeUser('TUTOR'), isAuthenticated: true })

    const { unmount } = render(
      <MemoryRouter initialEntries={['/admin-only']}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={['OWNER']} />}>
            <Route path="/admin-only" element={<div>Admin</div>} />
          </Route>
          <Route path="/portal" element={<div>Portal do Tutor</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Portal do Tutor')).toBeInTheDocument()
    unmount()

    useAuthStore.setState({ user: makeUser('OWNER'), isAuthenticated: true })
    render(
      <MemoryRouter initialEntries={['/tutor-only']}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={['TUTOR']} />}>
            <Route path="/tutor-only" element={<div>Tutor Area</div>} />
          </Route>
          <Route path="/dashboard" element={<div>Dashboard Owner</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Dashboard Owner')).toBeInTheDocument()
  })
})

