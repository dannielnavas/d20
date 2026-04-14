import { describe, expect, it } from 'vitest'
import { MENTION_DM_ID, parseMentionsInText } from './chatMentions'

describe('parseMentionsInText', () => {
  const targets = [
    { id: MENTION_DM_ID, label: 'DM' },
    { id: 'sid-aaa', label: 'Marcus' },
    { id: 'sid-bbb', label: 'Lyra' },
  ]

  it('detecta @DM y jugadores', () => {
    expect(parseMentionsInText('Hola @DM necesito ayuda', targets)).toEqual([MENTION_DM_ID])
    expect(parseMentionsInText('@Marcus tira salvación', targets)).toEqual(['sid-aaa'])
  })

  it('no confunde prefijos más cortos con más largos', () => {
    const t = [
      { id: MENTION_DM_ID, label: 'DM' },
      { id: 'x', label: 'D' },
    ]
    expect(parseMentionsInText('@DM hola', t)).toEqual([MENTION_DM_ID])
  })

  it('requiere @ tras inicio o espacio', () => {
    expect(parseMentionsInText('foo@Marcus', targets)).toEqual([])
    expect(parseMentionsInText('foo @Marcus', targets)).toEqual(['sid-aaa'])
  })

  it('deduplica el mismo destinatario', () => {
    expect(parseMentionsInText('@DM y otra @DM', targets)).toEqual([MENTION_DM_ID])
  })
})
