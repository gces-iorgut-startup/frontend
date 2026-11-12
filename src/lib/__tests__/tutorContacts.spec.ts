import { describe, expect, it } from 'vitest'
import {
  hasTutorContactErrors,
  normalizeTutorContacts,
  toTutorContactsPayload,
  validateTutorContacts,
} from '../tutorContacts'

describe('tutorContacts', () => {
  it('normaliza somente os dois primeiros contatos recebidos', () => {
    expect(normalizeTutorContacts([
      { name: 'João', phone: '61999991111', relationship: 'Pai', hasWhatsApp: true },
      { name: 'Ana', phone: '61988882222', relationship: 'Irmã', hasWhatsApp: false },
      { name: 'Carlos', phone: '61977773333', relationship: 'Amigo', hasWhatsApp: true },
    ])).toHaveLength(2)
  })

  it('valida os campos de cada contato adicionado', () => {
    const errors = validateTutorContacts([
      { name: '', phone: '123', relationship: '', hasWhatsApp: false },
    ])

    expect(hasTutorContactErrors(errors)).toBe(true)
    expect(errors[0]).toEqual({
      name: 'Informe o nome do contato',
      phone: 'Informe um telefone válido',
      relationship: 'Informe o vínculo com o tutor',
    })
  })

  it('remove máscara do telefone e espaços antes de enviar', () => {
    expect(toTutorContactsPayload([
      {
        name: '  João Silva  ',
        phone: '(61) 99999-1111',
        relationship: '  Cônjuge ',
        hasWhatsApp: true,
      },
    ])).toEqual([
      {
        name: 'João Silva',
        phone: '61999991111',
        relationship: 'Cônjuge',
        hasWhatsApp: true,
      },
    ])
  })
})
