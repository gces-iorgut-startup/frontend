import type { Patient, Tutor } from './index'

export type BudgetStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'

export interface BudgetItem {
  id?: string
  budgetId?: string
  description: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface Budget {
  id: string
  clinicId: string
  patientId: string
  tutorId: string
  status: BudgetStatus
  discount: number
  totalAmount: number
  notes?: string | null
  validUntil?: string | null
  createdAt: string
  updatedAt: string
  items: BudgetItem[]
  patient?: Pick<Patient, 'id' | 'name' | 'species' | 'breed'>
  tutor?: Pick<Tutor, 'id' | 'fullName' | 'phone' | 'email' | 'cpf'>
}

export interface CreateBudgetItemPayload {
  description: string
  quantity: number
  unitPrice: number
}

// `discount` é o valor monetário em R$ (o percentual é convertido antes do envio).
export interface CreateBudgetPayload {
  patientId: string
  tutorId: string
  items: CreateBudgetItemPayload[]
  discount?: number
  notes?: string
  validUntil?: string
  status?: 'DRAFT' | 'PENDING'
}

export interface ListBudgetsParams {
  page?: number
  limit?: number
  status?: BudgetStatus
  search?: string
  patientId?: string
  from?: string
  to?: string
}

export interface PaginatedBudgetsResponse {
  budgets: Budget[]
  total: number
}
