import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { BudgetsService } from '../../services/budgets.service'
import { PatientsService } from '../../services/patients.service'
import { getErrorMessage } from '../../lib/errorMessage'
import { formatCurrency } from '../../lib/currency'
import {
  discountAmount,
  itemsSubtotal,
  lineSubtotal,
  parseDecimal,
  totalAmount,
  validateDiscount,
  validateItems,
  type DiscountType,
  type DraftBudgetItem,
} from '../../lib/budgetCalc'
import { useAuthStore } from '../../stores/authStore'
import { useToast } from '../common/useToast'
import { Toast } from '../common/Toast'
import { civilDateToIso } from '../chronicConditionDates'
import { PatientAutocomplete } from './PatientAutocomplete'
import type { Budget, Patient } from '../../types'
import '../../styles/budgets.css'

const EMPTY_ITEM: DraftBudgetItem = { description: '', quantity: '1', unitPrice: '' }

interface NewBudgetModalProps {
  defaultPatientId?: string
  onClose: () => void
  onSaved: (budget: Budget) => void
}

export function NewBudgetModal({ defaultPatientId, onClose, onSaved }: NewBudgetModalProps) {
  const clinicId = useAuthStore((s) => s.user?.clinicId)
  const { toast, showToast } = useToast()
  const submitLock = useRef(false)

  const [patient, setPatient] = useState<Patient | null>(null)
  const [items, setItems] = useState<DraftBudgetItem[]>([{ ...EMPTY_ITEM }])
  const [discountType, setDiscountType] = useState<DiscountType>('FIXED')
  const [discountValue, setDiscountValue] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)
  const discardDescId = useId()

  const isDirty =
    (defaultPatientId ? patient !== null && patient.id !== defaultPatientId : patient !== null) ||
    items.length > 1 ||
    items[0].description !== '' ||
    items[0].quantity !== '1' ||
    items[0].unitPrice !== '' ||
    discountValue !== '' ||
    validUntil !== '' ||
    notes !== ''

  const requestClose = useCallback(() => {
    if (saving) return
    if (isDirty) {
      setConfirmingDiscard(true)
      return
    }
    onClose()
  }, [isDirty, onClose, saving])

  useEffect(() => {
    if (!defaultPatientId) return undefined
    let active = true
    PatientsService.getById(defaultPatientId)
      .then((loaded) => {
        if (active) setPatient(loaded)
      })
      .catch((err: unknown) => {
        if (active) showToast(getErrorMessage(err, 'Não foi possível carregar o paciente.'), 'error')
      })
    return () => {
      active = false
    }
  }, [defaultPatientId, showToast])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || saving) return
      if (confirmingDiscard) {
        setConfirmingDiscard(false)
        return
      }
      requestClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [confirmingDiscard, requestClose, saving])

  const subtotal = itemsSubtotal(items)
  const discount = discountAmount(subtotal, discountType, discountValue)
  const total = totalAmount(subtotal, discount)
  const discountError = validateDiscount(subtotal, discountType, discountValue)

  const updateItem = (index: number, field: keyof DraftBudgetItem, value: string) => {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const addItem = () => setItems((current) => [...current, { ...EMPTY_ITEM }])

  const removeItem = (index: number) => {
    setItems((current) => (current.length > 1 ? current.filter((_, i) => i !== index) : current))
  }

  const submit = async (status: 'DRAFT' | 'PENDING') => {
    if (submitLock.current) return

    if (!clinicId) {
      setFormError('Clínica não identificada.')
      return
    }
    if (!patient) {
      setFormError('Selecione um paciente.')
      return
    }
    const itemsProblem = validateItems(items)
    if (itemsProblem) {
      setFormError(itemsProblem)
      return
    }
    // Erro de desconto já aparece no próprio campo; não repetir no rodapé.
    if (discountError) return

    submitLock.current = true
    setSaving(true)
    setFormError(null)
    try {
      const budget = await BudgetsService.createBudget(clinicId, {
        patientId: patient.id,
        tutorId: patient.tutorId,
        items: items.map((item) => ({
          description: item.description.trim(),
          quantity: parseDecimal(item.quantity),
          unitPrice: parseDecimal(item.unitPrice),
        })),
        discount,
        notes: notes.trim() || undefined,
        validUntil: validUntil ? civilDateToIso(validUntil) : undefined,
        status,
      })
      onSaved(budget)
    } catch (err) {
      showToast(getErrorMessage(err, 'Não foi possível salvar o orçamento.'), 'error')
    } finally {
      submitLock.current = false
      setSaving(false)
    }
  }

  return (
    <div className="budget-modal-overlay" role="presentation">
      <div className="budget-modal" role="dialog" aria-modal="true" aria-labelledby="new-budget-title">
        <header className="budget-modal-header">
          <h2 id="new-budget-title">Novo Orçamento</h2>
          <button type="button" className="budget-icon-button" aria-label="Fechar" onClick={requestClose} disabled={saving}>
            <X size={18} />
          </button>
        </header>

        <div className="budget-modal-body">
          <PatientAutocomplete
            selected={patient}
            onSelect={setPatient}
            onClear={() => setPatient(null)}
            disabled={saving}
          />

          <div className="budget-field">
            <span className="budget-field-label">Tutor</span>
            <p data-testid="budget-tutor">
              {patient ? (patient.tutor?.fullName ?? 'Tutor não informado') : 'Selecione um paciente'}
            </p>
          </div>

          <section className="budget-section" aria-label="Itens do orçamento">
            <h3>Itens</h3>
            {items.map((item, index) => {
              const n = index + 1
              return (
                <div className="budget-item-row" key={index}>
                  <label className="budget-field">
                    <span className="budget-field-label">Descrição {n}</span>
                    <input
                      aria-label={`Descrição do item ${n}`}
                      className="budget-input"
                      value={item.description}
                      onChange={(event) => updateItem(index, 'description', event.target.value)}
                      disabled={saving}
                    />
                  </label>
                  <label className="budget-field budget-field-small">
                    <span className="budget-field-label">Quantidade {n}</span>
                    <input
                      aria-label={`Quantidade do item ${n}`}
                      className="budget-input"
                      inputMode="decimal"
                      value={item.quantity}
                      onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                      disabled={saving}
                    />
                  </label>
                  <label className="budget-field budget-field-small">
                    <span className="budget-field-label">Valor unitário (R$) {n}</span>
                    <input
                      aria-label={`Valor unitário do item ${n}`}
                      className="budget-input"
                      inputMode="decimal"
                      value={item.unitPrice}
                      onChange={(event) => updateItem(index, 'unitPrice', event.target.value)}
                      disabled={saving}
                    />
                  </label>
                  <span className="budget-item-subtotal" data-testid={`item-subtotal-${n}`}>
                    {formatCurrency(lineSubtotal(item))}
                  </span>
                  <button
                    type="button"
                    className="budget-icon-button"
                    aria-label={`Remover item ${n}`}
                    onClick={() => removeItem(index)}
                    disabled={saving || items.length === 1}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            })}
            <button type="button" className="budget-link-button" onClick={addItem} disabled={saving}>
              <Plus size={14} /> Adicionar item / procedimento
            </button>
          </section>

          <section className="budget-section" aria-label="Desconto e validade">
            <div className="budget-grid">
              <label className="budget-field">
                <span className="budget-field-label">Tipo de desconto</span>
                <select
                  aria-label="Tipo de desconto"
                  className="budget-input"
                  value={discountType}
                  onChange={(event) => setDiscountType(event.target.value as DiscountType)}
                  disabled={saving}
                >
                  <option value="FIXED">Valor fixo (R$)</option>
                  <option value="PERCENT">Percentual (%)</option>
                </select>
              </label>
              <label className="budget-field">
                <span className="budget-field-label">Desconto</span>
                <input
                  aria-label="Desconto"
                  className="budget-input"
                  inputMode="decimal"
                  value={discountValue}
                  onChange={(event) => setDiscountValue(event.target.value)}
                  disabled={saving}
                />
              </label>
              <label className="budget-field">
                <span className="budget-field-label">Validade</span>
                <input
                  type="date"
                  aria-label="Validade"
                  className="budget-input"
                  value={validUntil}
                  onChange={(event) => setValidUntil(event.target.value)}
                  disabled={saving}
                />
              </label>
            </div>
            {discountError && <p className="budget-error" role="alert">{discountError}</p>}
          </section>

          <label className="budget-field">
            <span className="budget-field-label">Observações</span>
            <textarea
              aria-label="Observações"
              className="budget-input"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={saving}
            />
          </label>

          <dl className="budget-totals">
            <div>
              <dt>Subtotal dos itens</dt>
              <dd data-testid="budget-subtotal">{formatCurrency(subtotal)}</dd>
            </div>
            <div>
              <dt>Desconto (R$)</dt>
              <dd data-testid="budget-discount">{formatCurrency(discount)}</dd>
            </div>
            <div className="budget-totals-final">
              <dt>Total final</dt>
              <dd data-testid="budget-total">{formatCurrency(total)}</dd>
            </div>
          </dl>

          {formError && <p className="budget-error" role="alert">{formError}</p>}
        </div>

        {confirmingDiscard && (
          <div className="budget-discard-bar" role="region" aria-label="Confirmar descarte">
            <p id={discardDescId}>Descartar as alterações não salvas deste orçamento?</p>
            <button
              type="button"
              className="budget-button ghost"
              onClick={() => setConfirmingDiscard(false)}
              autoFocus
            >
              Continuar editando
            </button>
            <button
              type="button"
              className="budget-button danger"
              aria-describedby={discardDescId}
              onClick={onClose}
            >
              Descartar alterações
            </button>
          </div>
        )}

        <footer className="budget-modal-footer">
          <button type="button" className="budget-button ghost" onClick={requestClose} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className="budget-button" onClick={() => void submit('DRAFT')} disabled={saving}>
            Salvar rascunho
          </button>
          <button type="button" className="budget-button primary" onClick={() => void submit('PENDING')} disabled={saving}>
            Salvar e enviar (Pendente)
          </button>
        </footer>

        <Toast toast={toast} />
      </div>
    </div>
  )
}
