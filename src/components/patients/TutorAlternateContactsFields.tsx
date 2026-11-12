import { MessageCircle, Plus, Trash2 } from 'lucide-react'
import { maskPhone } from '../../lib/documents'
import { createEmptyTutorContact, type TutorAlternateContactErrors } from '../../lib/tutorContacts'
import type { TutorAlternateContact } from '../../types'

interface TutorAlternateContactsFieldsProps {
  contacts: TutorAlternateContact[]
  onChange: (contacts: TutorAlternateContact[]) => void
  errors?: TutorAlternateContactErrors[]
  disabled?: boolean
  idPrefix: string
}

export function TutorAlternateContactsFields({
  contacts,
  onChange,
  errors = [],
  disabled = false,
  idPrefix,
}: TutorAlternateContactsFieldsProps) {
  function updateContact(index: number, changes: Partial<TutorAlternateContact>) {
    onChange(contacts.map((contact, contactIndex) => (
      contactIndex === index ? { ...contact, ...changes } : contact
    )))
  }

  function removeContact(index: number) {
    onChange(contacts.filter((_, contactIndex) => contactIndex !== index))
  }

  return (
    <div className="tutor-alternate-contacts">
      <div className="tutor-alternate-contacts-heading">
        <div>
          <p className="section-subtitle">Contatos alternativos</p>
          <span>Opcional. Adicione até dois contatos para recados e emergências.</span>
        </div>

        {!disabled && contacts.length < 2 && (
          <button
            type="button"
            className="tutor-contact-add-btn"
            onClick={() => onChange([...contacts, createEmptyTutorContact()])}
          >
            <Plus size={16} />
            Adicionar contato
          </button>
        )}
      </div>

      {contacts.length === 0 ? (
        <div className="tutor-contact-empty">Nenhum contato alternativo informado.</div>
      ) : (
        <div className="tutor-contact-list">
          {contacts.map((contact, index) => {
            const contactNumber = index + 1
            const prefix = `${idPrefix}-${contactNumber}`
            const contactErrors = errors[index] ?? {}

            return (
              <fieldset className="tutor-contact-card" key={prefix}>
                <legend>Contato alternativo {contactNumber}</legend>

                {!disabled && (
                  <button
                    type="button"
                    className="tutor-contact-remove-btn"
                    aria-label={`Remover contato alternativo ${contactNumber}`}
                    onClick={() => removeContact(index)}
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                <div className="tutor-contact-fields">
                  <div className="form-group">
                    <label className="register-label" htmlFor={`${prefix}-name`}>
                      Nome:
                    </label>
                    <input
                      id={`${prefix}-name`}
                      className="register-input"
                      value={contact.name}
                      disabled={disabled}
                      onChange={(event) => updateContact(index, { name: event.target.value })}
                      placeholder="Nome do contato"
                    />
                    {contactErrors.name && <span className="field-error">{contactErrors.name}</span>}
                  </div>

                  <div className="form-group">
                    <label className="register-label" htmlFor={`${prefix}-phone`}>
                      Telefone:
                    </label>
                    <input
                      id={`${prefix}-phone`}
                      className="register-input"
                      value={maskPhone(contact.phone)}
                      disabled={disabled}
                      onChange={(event) => updateContact(index, { phone: maskPhone(event.target.value) })}
                      placeholder="(__) _____-____"
                      inputMode="tel"
                      maxLength={15}
                    />
                    {contactErrors.phone && <span className="field-error">{contactErrors.phone}</span>}
                  </div>

                  <div className="form-group">
                    <label className="register-label" htmlFor={`${prefix}-relationship`}>
                      Vínculo:
                    </label>
                    <input
                      id={`${prefix}-relationship`}
                      className="register-input"
                      value={contact.relationship}
                      disabled={disabled}
                      onChange={(event) => updateContact(index, { relationship: event.target.value })}
                      placeholder="Ex.: cônjuge, irmã, amigo"
                    />
                    {contactErrors.relationship && (
                      <span className="field-error">{contactErrors.relationship}</span>
                    )}
                  </div>

                  <label className="tutor-contact-whatsapp" htmlFor={`${prefix}-whatsapp`}>
                    <input
                      id={`${prefix}-whatsapp`}
                      type="checkbox"
                      checked={contact.hasWhatsApp}
                      disabled={disabled}
                      onChange={(event) => updateContact(index, { hasWhatsApp: event.target.checked })}
                    />
                    <MessageCircle size={17} />
                    Possui WhatsApp
                  </label>
                </div>
              </fieldset>
            )
          })}
        </div>
      )}
    </div>
  )
}
