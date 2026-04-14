import { describe, expect, it } from 'vitest'
import { normalizeRoomState } from './roomParsers'
import type { RoomState } from '../../types/room'

describe('normalizeRoomState', () => {
  it('rellena chatLog y roomVersion si faltan', () => {
    const partial = {
      roomId: 'x',
      initiative: { visible: false, order: [], currentIndex: null, modifiers: {} },
      settings: {
        playersCanPing: true,
        showTokenNames: true,
        hideNpcNamesFromPlayers: false,
      },
      scenes: [
        {
          id: 'scn-1',
          name: 'Escena 1',
          settings: {
            backgroundUrl: '',
            backgroundType: 'image' as const,
            mapAudioEnabled: false,
            mapVolume: 70,
            gridSize: 50,
            snapToGrid: true,
          },
          tokens: [],
        },
      ],
      activeSceneId: 'scn-1',
      activityLog: [],
      diceLog: [],
      tokens: [],
    } as unknown as RoomState
    const n = normalizeRoomState(partial)
    expect(n.chatLog).toEqual([])
    expect(n.roomVersion).toBe(0)
    expect(n.scenes.length).toBe(1)
    expect(n.activeSceneId).toBe('scn-1')
  })
})
