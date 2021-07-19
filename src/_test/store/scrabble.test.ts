import { Action, createChain } from '@/chain'
import { createStore, Store } from '@/store'
import { Reducer } from '@/store/types'
import { createUser } from '@/user'
import { arrayToMap } from '@/util'
import { makeRandom } from '@herbcaudill/random'

const alice = createUser('alice')
const bob = createUser('bob')

const setupScrabbleAttacks = () => {
  const chain = createChain<ScrabbleAttacksAction>({ name: 'scrabble' }, alice)

  const aliceStore = createStore({
    user: alice,
    chain,
    reducer: scrabbleAttacksReducer,
  })
  aliceStore.dispatch({ type: 'ADD_PLAYER', payload: { userName: 'bob' } })

  const bobStore = createStore({
    user: bob,
    chain: aliceStore.getChain(),
    reducer: scrabbleAttacksReducer,
  })

  return {
    store: aliceStore,
    aliceStore,
    bobStore,
  }
}

describe('scrabble attacks', () => {
  describe('createStore', () => {
    test('initial state', () => {
      const { store } = setupScrabbleAttacks()
      const { players, tiles } = store.getState()
      expect(players).toEqual([
        { userName: 'alice', words: [] },
        { userName: 'bob', words: [] },
      ])
      expect(Object.keys(tiles)).toHaveLength(100)
    })

    test('flip a tile', () => {
      const { store } = setupScrabbleAttacks()

      const availableTiles = () => Object.values(store.getState().tiles).filter(isAvailable)

      // no tiles are face up
      expect(availableTiles()).toHaveLength(0)

      // we flip one tile
      store.dispatch({ type: 'FLIP_TILE', payload: { id: 1 } })

      // now one tile is face up
      expect(availableTiles()).toHaveLength(1)
    })

    test('claim a word (all tiles are available)', () => {
      const { aliceStore } = setupScrabbleAttacks()
      const availableTiles = () => Object.values(aliceStore.getState().tiles).filter(isAvailable)
      const flip = omniscientlyFlipTileByLetter(aliceStore)

      // flip three tiles
      flip('C')
      flip('A')
      flip('T')
      expect(availableTiles()).toHaveLength(3)

      // claim the word 'CAT'
      aliceStore.dispatch({ type: 'CLAIM_WORD', payload: { word: 'CAT' } })
      const { players, messages } = aliceStore.getState()
      const [alice] = players

      // there are no error messages
      expect(messages).toHaveLength(0)

      // alice has the word
      expect(alice.words[0]).toEqual('CAT')

      // no tiles are available
      expect(availableTiles()).toHaveLength(0)
    })

    test('claim a word (not all tiles are available)', () => {
      const { aliceStore } = setupScrabbleAttacks()
      const flip = omniscientlyFlipTileByLetter(aliceStore)

      // flip three tiles
      flip('D')
      flip('O')
      flip('G')

      // try to claim the word 'DOLL'
      aliceStore.dispatch({ type: 'CLAIM_WORD', payload: { word: 'DOLL' } })
      const { players, messages } = aliceStore.getState()
      const [alice] = players

      // there's an error message
      expect(messages).toHaveLength(1)

      // alice doesn't have the word
      expect(alice.words).toHaveLength(0)
    })

    test('claim a word (only one instance of repeated letter available)', () => {
      const { aliceStore } = setupScrabbleAttacks()
      const flip = omniscientlyFlipTileByLetter(aliceStore)

      // flip three tiles
      flip('D')
      flip('O')
      flip('L')

      // try to claim the word 'DOLL'
      aliceStore.dispatch({ type: 'CLAIM_WORD', payload: { word: 'DOLL' } })
      const { players, messages } = aliceStore.getState()
      const [alice] = players

      // there's an error message
      expect(messages).toHaveLength(1)

      // alice doesn't have the word
      expect(alice.words).toHaveLength(0)
    })

    test('claim a word (all repeated letters available)', () => {
      const { aliceStore } = setupScrabbleAttacks()
      const flip = omniscientlyFlipTileByLetter(aliceStore)

      // flip four tiles
      flip('D')
      flip('O')
      flip('L')
      flip('L')

      // try to claim the word 'DOLL'
      aliceStore.dispatch({ type: 'CLAIM_WORD', payload: { word: 'DOLL' } })
      const { players, messages } = aliceStore.getState()
      const [alice] = players

      // there are no error messages
      expect(messages).toHaveLength(0)

      // alice has the word
      expect(alice.words[0]).toEqual('DOLL')
    })
  })

  // describe('merge', () => {
  //   test('concurrent changes are merged', () => {
  //     const { aliceStore, bobStore } = setupScrabble()

  //     // Bob and Alice make concurrent increments
  //     aliceStore.dispatch({ type: 'INCREMENT' })
  //     bobStore.dispatch({ type: 'INCREMENT' })

  //     // They each only have their own increments
  //     expect(aliceStore.getState().value).toEqual(1)
  //     expect(bobStore.getState().value).toEqual(1)

  //     // They sync up
  //     aliceStore.merge(bobStore.getChain())
  //     bobStore.merge(aliceStore.getChain())

  //     // They each have both increments
  //     expect(aliceStore.getState().value).toEqual(2)
  //     expect(bobStore.getState().value).toEqual(2)
  //   })
  // })
})

// Scrabble

// action types

interface AddPlayer extends Action {
  type: 'ADD_PLAYER'
  payload: { userName: string }
}

interface FlipTileAction extends Action {
  type: 'FLIP_TILE'
  payload: { id: number }
}

interface ClaimWordAction extends Action {
  type: 'CLAIM_WORD'
  payload: { word: string }
}

type ScrabbleAttacksAction = AddPlayer | FlipTileAction | ClaimWordAction

// state

interface ScrabbleAttacksState {
  players: Player[]
  tiles: TileSet
  messages: Message[]
}

interface Message {
  userName: string
  message: string
}

interface Player {
  userName: string
  words: string[]
}

type Letter = keyof typeof letterMap

interface Tile {
  letter: Letter
  id: number
  isFaceUp: boolean
  isTaken: boolean
}

type TileSet = Record<number, Tile>

// utilities

const isAvailable = (tile: Tile) => !tile.isTaken && tile.isFaceUp

const notUndefined = <T>(x: T): T => x

const findByLetterIn = (tiles: Tile[] | TileSet) => {
  const tileArray = Array.isArray(tiles) ? tiles : Object.values(tiles)
  return (letter: Letter) => tileArray.find(tile => tile.letter === letter)
}

const omniscientlyFlipTileByLetter = (store: Store<ScrabbleAttacksState, ScrabbleAttacksAction>) => {
  return (letter: Letter) => {
    const tiles = Object.values(store.getState().tiles)
    const tileToFlip = findByLetterIn(tiles.filter(tile => !tile.isFaceUp))(letter)!
    store.dispatch({ type: 'FLIP_TILE', payload: { id: tileToFlip.id } })
  }
}

// reducer

const scrabbleAttacksReducer: Reducer<ScrabbleAttacksState, ScrabbleAttacksAction> = (state, link) => {
  const action = link.body
  const { players, tiles, messages } = state
  switch (action.type) {
    case 'ROOT': {
      const rootPlayer: Player = { userName: link.signed.userName, words: [] }
      const seed = 'test seed 12345'
      return {
        players: [rootPlayer],
        tiles: initialTiles(seed),
        messages: [],
      }
    }

    case 'ADD_PLAYER': {
      const { userName } = action.payload
      const newPlayer: Player = {
        userName,
        words: [],
      }
      return {
        ...state,
        players: players.concat(newPlayer),
      }
    }

    case 'FLIP_TILE': {
      const { id } = action.payload
      const tileToFlip = tiles[id]
      const flippedTile: Tile = {
        ...tileToFlip,
        isFaceUp: true,
      }
      return {
        ...state,
        tiles: {
          ...tiles,
          [id]: flippedTile,
        },
      }
    }

    case 'CLAIM_WORD': {
      const userName = link.signed.userName
      const { word } = action.payload

      let availableTiles = Object.values(tiles).filter(isAvailable)

      const wordLetters = word.split('') as Letter[]

      // see if there's a tile to match each letter in this word
      let matchingTiles = []
      for (const letter of wordLetters) {
        const find = findByLetterIn(availableTiles)
        const matchingTile = find(letter)
        if (matchingTile !== undefined) {
          matchingTiles.push(matchingTile)
          // remove this tile from available set
          availableTiles = availableTiles.filter(tile => tile.id !== matchingTile.id)
        }
      }

      if (wordLetters.length > matchingTiles.length) {
        const newMessage = { userName, message: 'letter not available' }
        return {
          ...state,
          messages: messages.concat(newMessage),
        }
      } else {
        const takenTiles = matchingTiles //
          .map(tile => ({ ...tile, isTaken: true }))
          .reduce(arrayToMap('id'), {})

        return {
          ...state,
          // add this word to the player's words
          players: players.map(player => {
            const words = player.userName === userName ? player.words.concat(word) : player.words
            return {
              ...player,
              words,
            }
          }),
          // mark these tiles as taken
          tiles: {
            ...tiles,
            ...takenTiles,
          },
        }
      }
    }
  }
}

export const WILD = '*'
export const letterMap = {
  A: { points: 1, count: 9 },
  B: { points: 3, count: 2 },
  C: { points: 3, count: 2 },
  D: { points: 2, count: 4 },
  E: { points: 1, count: 12 },
  F: { points: 4, count: 2 },
  G: { points: 2, count: 3 },
  H: { points: 4, count: 2 },
  I: { points: 1, count: 9 },
  J: { points: 8, count: 1 },
  K: { points: 5, count: 1 },
  L: { points: 1, count: 4 },
  M: { points: 3, count: 2 },
  N: { points: 1, count: 6 },
  O: { points: 1, count: 8 },
  P: { points: 3, count: 2 },
  Q: { points: 10, count: 1 },
  R: { points: 1, count: 6 },
  S: { points: 1, count: 4 },
  T: { points: 1, count: 6 },
  U: { points: 1, count: 4 },
  V: { points: 4, count: 2 },
  W: { points: 4, count: 2 },
  X: { points: 8, count: 1 },
  Y: { points: 4, count: 2 },
  Z: { points: 10, count: 1 },
  [WILD]: { points: 0, count: 2 },
}

export const alphabet = Object.keys(letterMap) as Letter[]

export const initialTiles = (seed: string = new Date().toISOString()) => {
  const r = makeRandom(seed)
  const randomSort = () => r.plusOrMinus()

  const nOfEach = (letter: Letter, i: number): Letter[] => {
    const N = letterMap[letter].count
    return new Array(N).fill(letter)
  }

  const makeTile = (letter: Letter, i: number): Tile => {
    return {
      letter,
      id: i,
      isFaceUp: false,
      isTaken: false,
    }
  }

  const tileSet = alphabet
    // return N of each letter
    .flatMap(nOfEach)
    // scramble order
    .sort(randomSort)
    // build tiles in initial state
    .map(makeTile)

  // turn into map for easy lookup
  return tileSet.reduce(arrayToMap('id'), {})
}
