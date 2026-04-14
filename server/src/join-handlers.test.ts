import { describe, expect, it } from 'vitest'
import { parseJoinPayload } from './join-handlers.js'

describe('parseJoinPayload', () => {
  it('extrae roomId y campos opcionales', () => {
    const p = parseJoinPayload({
      roomId: '  mesa-1 ',
      playerSessionId: 'abc12345',
      sessionPassword: 'secret',
    })
    expect(p).toEqual({
      roomId: 'mesa-1',
      playerSessionId: 'abc12345',
      dmKey: undefined,
      dmToken: undefined,
      sessionPassword: 'secret',
      spectator: false,
    })
  })

  it('rechaza payload inválido', () => {
    expect(parseJoinPayload(null)).toBeNull()
    expect(parseJoinPayload({})).toBeNull()
  })
})
