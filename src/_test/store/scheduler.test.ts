import { base58, hash } from '@herbcaudill/crypto'
import { Action, baseResolver, createChain, Resolver, Sequence } from '/chain'
import { createStore } from '/store'
import { Reducer } from '/store/types'
import { createUser } from '/user'
import { UnixTimestamp } from '/util'

/*

This example simulates a meeting room scheduler and demonstrates a custom resolver implementing
domain-specific conflict-resolution rules. 

If two people concurrently schedule a room for overlapping times, it's considered a conflict and is
resolved by giving the room to the person with the most seniority. 

*/

const alice = createUser('alice')
const bob = createUser('bob')
const charlie = createUser('charlie')

// the person with the longest tenure wins in the case of conflicts
const tenureLookup: Record<string, number> = {
  alice: 10,
  bob: 3,
  charlie: 7,
}

const setupScheduler = () => {
  const chain = createChain<SchedulerAction, SchedulerState>({ user: alice, name: 'scheduler' })
  const resolver = schedulerResolver
  const reducer = schedulerReducer

  // everyone starts out with the same store
  const aliceStore = createStore({ user: alice, chain, reducer, resolver })
  const bobStore = createStore({ user: bob, chain, reducer, resolver })
  const charlieStore = createStore({ user: charlie, chain, reducer, resolver })

  const sync = () => {
    // UGLY HACK for 3-way sync
    // alice collects any new info from the other two
    aliceStore.merge(bobStore.getChain())
    aliceStore.merge(charlieStore.getChain())
    // the other two get any new info from her
    bobStore.merge(aliceStore.getChain())
    charlieStore.merge(aliceStore.getChain())
    // now everyone is up to date
  }

  return { aliceStore, bobStore, charlieStore, sync }
}

describe('scheduler', () => {
  it('new store', () => {
    const { aliceStore } = setupScheduler()
    const { reservations } = aliceStore.getState()
    expect(reservations).toEqual({})
  })

  it('one reservation', () => {
    const { aliceStore } = setupScheduler()

    const reservation = {
      reservedBy: 'alice',
      room: '101',
      start: new Date('2021-09-12T15:00Z').getTime(),
      end: new Date('2021-09-12T17:00Z').getTime(),
    }
    aliceStore.dispatch({
      type: 'MAKE_RESERVATION',
      payload: reservation,
    })

    const { reservations } = aliceStore.getState()

    // there is one reservation
    expect(Object.keys(reservations)).toHaveLength(1)

    // it is the one we just made
    const id = getId(reservation)
    expect(reservations[id]).toEqual({
      reservedBy: 'alice',
      room: '101',
      start: 1631458800000,
      end: 1631466000000,
    })
  })

  it('two reservations (no conflicts))', () => {
    const { aliceStore, bobStore, sync } = setupScheduler()

    aliceStore.dispatch({
      type: 'MAKE_RESERVATION',
      payload: {
        reservedBy: 'alice',
        room: '101',
        start: new Date('2021-09-12T15:00Z').getTime(),
        end: new Date('2021-09-12T17:00Z').getTime(),
      },
    })

    // bob reserves the same room for the following day
    bobStore.dispatch({
      type: 'MAKE_RESERVATION',
      payload: {
        reservedBy: 'bob',
        room: '101',
        start: new Date('2021-09-13T15:00Z').getTime(), // 🡐 not 09-12
        end: new Date('2021-09-13T17:00Z').getTime(),
      },
    })

    sync()

    // everyone has two reservations
    expect(Object.keys(aliceStore.getState().reservations)).toHaveLength(2)
    expect(Object.keys(bobStore.getState().reservations)).toHaveLength(2)

    // no conflicts are logged
    expect(Object.keys(aliceStore.getState().conflicts)).toHaveLength(0)
    expect(Object.keys(bobStore.getState().conflicts)).toHaveLength(0)
  })

  it('three reservations (no conflicts)', () => {
    const { aliceStore, bobStore, charlieStore, sync } = setupScheduler()

    aliceStore.dispatch({
      type: 'MAKE_RESERVATION',
      payload: {
        reservedBy: 'alice',
        room: '101',
        start: new Date('2021-09-12T15:00Z').getTime(),
        end: new Date('2021-09-12T17:00Z').getTime(),
      },
    })

    // bob reserves the same room for the following day
    bobStore.dispatch({
      type: 'MAKE_RESERVATION',
      payload: {
        reservedBy: 'bob',
        room: '101',
        start: new Date('2021-09-13T15:00Z').getTime(), // 🡐 not 09-12
        end: new Date('2021-09-13T17:00Z').getTime(),
      },
    })

    // charlie reserves a different room at the same time
    charlieStore.dispatch({
      type: 'MAKE_RESERVATION',
      payload: {
        reservedBy: 'charlie',
        room: '102', // 🡐 not 101
        start: new Date('2021-09-12T15:00Z').getTime(),
        end: new Date('2021-09-12T17:00Z').getTime(),
      },
    })

    sync()

    // everyone has three reservations
    expect(Object.keys(aliceStore.getState().reservations)).toHaveLength(3)
    expect(Object.keys(bobStore.getState().reservations)).toHaveLength(3)
    expect(Object.keys(charlieStore.getState().reservations)).toHaveLength(3)

    // no conflicts are logged
    expect(Object.keys(aliceStore.getState().conflicts)).toHaveLength(0)
    expect(Object.keys(bobStore.getState().conflicts)).toHaveLength(0)
    expect(Object.keys(charlieStore.getState().conflicts)).toHaveLength(0)
  })

  // don't have custom resolver yet
  it('two conflicting reservations', () => {
    // repeat test to make random success less likely
    for (let i = 0; i < 25; i++) {
      const { aliceStore, bobStore, sync } = setupScheduler()

      aliceStore.dispatch({
        type: 'MAKE_RESERVATION',
        payload: {
          reservedBy: 'alice',
          room: '101',
          start: new Date('2021-09-12T15:00Z').getTime(),
          end: new Date('2021-09-12T17:00Z').getTime(),
        },
      })

      bobStore.dispatch({
        type: 'MAKE_RESERVATION',
        payload: {
          reservedBy: 'bob',
          room: '101',
          start: new Date('2021-09-12T15:00Z').getTime(),
          end: new Date('2021-09-12T17:00Z').getTime(),
        },
      })

      sync()

      // only one reservation is accepted
      expect(Object.keys(aliceStore.getState().reservations)).toHaveLength(1)
      expect(Object.keys(bobStore.getState().reservations)).toHaveLength(1)

      // the conflict is logged
      expect(Object.keys(aliceStore.getState().conflicts)).toHaveLength(1)
      expect(Object.keys(bobStore.getState().conflicts)).toHaveLength(1)

      // alice wins because she has seniority
      const conflict = aliceStore.getState().conflicts[0]
      expect(conflict.winner.reservedBy).toBe('alice')
    }
  })
})

// resolver

const sum = (arr: number[]) => arr.reduce((total, n) => total + n, 0)
const average = (arr: number[]) => sum(arr) / arr.length
const averageSeniority = (branch: Branch) => average(branch.map(link => tenureLookup[link.signed.userName]))
const bySeniority = (a: Branch, b: Branch) => averageSeniority(b) - averageSeniority(a)

const schedulerResolver: Resolver<SchedulerAction, SchedulerState> = branches =>
  branches
    // choose one of the two branches to go first
    .sort(bySeniority)
    // join the two sequences into a single one
    .flat()

// reducer

const schedulerReducer: Reducer<SchedulerState, SchedulerAction> = (state, link) => {
  const action = link.body
  const { reservations, conflicts } = state
  switch (action.type) {
    case 'ROOT': {
      return { reservations: {}, conflicts: [] }
    }

    case 'MAKE_RESERVATION': {
      const newReservation = action.payload

      // look for any conflicting reservations
      const conflictingReservation = Object.values(reservations).find(r => overlaps(r, newReservation))
      if (conflictingReservation) {
        // the existing reservation stays; the new one is not added; & we log the conflict
        return {
          ...state,
          conflicts: conflicts.concat({
            winner: conflictingReservation,
            loser: newReservation,
          }),
        }
      }

      // no conflicts, so we add the new reservation
      const newId = getId(newReservation)
      return {
        ...state,
        reservations: {
          ...reservations,
          [newId]: newReservation,
        },
      }
    }
  }
}

// utilities

const getId = (reservation: Reservation): string => {
  return base58.encode(hash('RESERVATION_ID', reservation))
}

// quick test to make sure the `overlaps` function works
describe('overlaps', () => {
  it.each`
    aStart | aEnd   | bStart | bEnd   | expected
    ${100} | ${200} | ${100} | ${200} | ${true}
    ${100} | ${300} | ${200} | ${400} | ${true}
    ${200} | ${400} | ${100} | ${300} | ${true}
    ${100} | ${400} | ${100} | ${300} | ${true}
    ${100} | ${300} | ${100} | ${400} | ${true}
    ${100} | ${200} | ${300} | ${400} | ${false}
    ${300} | ${400} | ${100} | ${200} | ${false}
    ${100} | ${200} | ${200} | ${300} | ${false}
  `(`$aStart-$aEnd, $bStart-$bEnd: $expected`, ({ aStart, aEnd, bStart, bEnd, expected }) =>
    expect(
      overlaps(
        { reservedBy: 'alice', room: '101', start: aStart, end: aEnd },
        { reservedBy: 'bob', room: '101', start: bStart, end: bEnd }
      )
    ).toBe(expected)
  )
})

const overlaps = (a: Reservation, b: Reservation) => {
  if (a.room === b.room) {
    if (a.start <= b.start && a.end > b.start) return true
    if (b.start <= a.start && b.end > a.start) return true
  }
  return false
}

// action types

interface MakeReservation extends Action {
  type: 'MAKE_RESERVATION'
  payload: Reservation
}

type SchedulerAction = MakeReservation

// state

interface SchedulerState {
  reservations: Record<string, Reservation>
  conflicts: Conflict[]
}

interface Reservation {
  reservedBy: string // user name
  room: string
  start: UnixTimestamp
  end: UnixTimestamp
}

interface Conflict {
  loser: Reservation
  winner: Reservation
}

type Branch = Sequence<SchedulerAction, SchedulerState>
