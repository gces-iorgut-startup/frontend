import { api } from './api'
import type {
  Budget,
  BudgetStatus,
  CreateBudgetPayload,
  ListBudgetsParams,
  PaginatedBudgetsResponse,
} from '../types'

export const BudgetsService = {
  async createBudget(clinicId: string, payload: CreateBudgetPayload): Promise<Budget> {
    const response = await api.post<{ budget: Budget }>(`/clinics/${clinicId}/budgets`, payload)
    return response.data.budget
  },

  async listBudgets(clinicId: string, params: ListBudgetsParams = {}): Promise<PaginatedBudgetsResponse> {
    const response = await api.get<PaginatedBudgetsResponse>(`/clinics/${clinicId}/budgets`, { params })
    return response.data
  },

  async getBudgetDetails(clinicId: string, budgetId: string): Promise<Budget> {
    const response = await api.get<{ budget: Budget }>(`/clinics/${clinicId}/budgets/${budgetId}`)
    return response.data.budget
  },

  async updateBudgetStatus(clinicId: string, budgetId: string, status: BudgetStatus): Promise<Budget> {
    const response = await api.patch<{ budget: Budget }>(
      `/clinics/${clinicId}/budgets/${budgetId}/status`,
      { status },
    )
    return response.data.budget
  },
}
