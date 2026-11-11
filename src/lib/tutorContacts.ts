import { onlyDigits } from './documents'
import type { TutorAlternateContact } from '../types'

export interface TutorAlternateContactErrors {
  name?: string
  phone?: string
  relationship?: string
}

export function createEmptyTutorContact(): TutorAlternateContact {
  return {
    name: '',
    phone: '',
    relationship: '',
    hasWhatsApp: false,
  }
}

export function normalizeTutorContacts(value: unknown): TutorAlternateContact[] {
  if (!Array.isArray(value)) return []

  return value.slice(0, 2).map((contact) => {
    const item = contact && typeof contact === 'object'
      ? contact as Partial<TutorAlternateContact>
      : {}

    return {
      name: typeof item.name === 'string' ? item.name : '',
      phone: typeof item.phone === 'string' ? item.phone : '',
      relationship: typeof item.relationship === 'string' ? item.relationship : '',
      hasWhatsApp: item.hasWhatsApp === true,
    }
  })
}

export function validateTutorContacts(
  contacts: TutorAlternateContact[],
): TutorAlternateContactErrors[] {
  return contacts.map((contact) => {
    const errors: TutorAlternateContactErrors = {}
    const phone = onlyDigits(contact.phone)

    if (contact.name.trim().length < 2) {
      errors.name = 'Informe o nome do contato'
    }
    if (phone.length < 10 || phone.length > 11) {
      errors.phone = 'Informe um telefone válido'
    }
    if (contact.relationship.trim().length < 2) {
      errors.relationship = 'Informe o vínculo com o tutor'
    }

    return errors
  })
}

export function hasTutorContactErrors(errors: TutorAlternateContactErrors[]): boolean {
  return errors.some((contactErrors) => Object.keys(contactErrors).length > 0)
}

export function toTutorContactsPayload(
  contacts: TutorAlternateContact[],
): TutorAlternateContact[] {
  return contacts.map((contact) => ({
    name: contact.name.trim(),
    phone: onlyDigits(contact.phone),
    relationship: contact.relationship.trim(),
    hasWhatsApp: contact.hasWhatsApp,
  }))
}
