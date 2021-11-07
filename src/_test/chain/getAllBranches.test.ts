import { Link, getAllBranches } from '/chain'
import { buildChain, getPayloads, XAction } from '/test/chain/utils'

describe('chains', () => {
  describe('getBranches', () => {
    test('one link', () => {
      const chain = buildChain('a')
      const branches = getAllBranches(chain)
      expect(branches).toEqual([])
    })

    test('no branches', () => {
      const chain = buildChain(`a ─ b ─ c`)
      const branches = getAllBranches(chain)

      expect(branches).toEqual([])
    })

    test('simple open chain', () => {
      const chain = buildChain(` 
          ┌─ b
       a ─┤
          └─ c
      `)

      const branches = getAllBranches(chain).map(set => set.map(getPayloads))
      expect(branches).toEqual([['b', 'c']])
    })

    test('simple closed chain', () => {
      const chain = buildChain(`
            ┌─ b ─ c ─┐
         a ─┤         ├─ e   
            └─── d ───┘
      `)

      const branches = getAllBranches(chain).map(set => set.map(getPayloads))
      expect(branches).toEqual([['bc', 'd']])
    })

    test('double closed chain', () => {
      const chain = buildChain(`
            ┌─ b ─ c ─┐     ┌─ f ─ g ─┐
         a ─┤         ├─ e ─┤         ├─ i    
            └─── d ───┘     └─── h ───┘
      `)

      const branches = getAllBranches(chain).map(set => set.map(getPayloads))
      expect(branches).toEqual([
        ['bc', 'd'],
        ['fg', 'h'],
      ])
    })

    test.skip('complex chain', () => {
      const chain = buildChain(`
                          ┌─ e ─ g ─┐
                ┌─ c ─ d ─┤         ├─ o ─┐
         a ─ b ─┤         └─── f ───┤     ├─ n
                ├──── h ──── i ─────┘     │
                └───── j ─── k ── l ──────┘
      `)
      const branches = getAllBranches(chain).map(set => set.map(getPayloads))
      expect(branches).toEqual([['cdego', 'cdfo', 'hi']])
    })

    test('tricky chain', () => {
      const chain = buildChain(`
                        ┌─── h ────┐
              ┌─ c ─ e ─┤          ├─ k
       a ─ b ─┤         └── i ─ j ─┘
              └── d ────────┘
    `)

      const branches = getAllBranches(chain).map(set => set.map(getPayloads))
      expect(branches).toEqual([
        ['h', 'ij'],
        ['ceh', 'ceij', 'dj'],
      ])
    })
  })

  // describe('multiple heads', () => {
  //   const chain = buildChain(`
  //                       ┌─ e ─ g ─┐
  //             ┌─ c ─ d ─┤         ├─ o
  //      a ─ b ─┤         └─── f ───┘
  //             ├─ h ─ i
  //             └─ j
  //   `)
  //   test('sorted by payload', () => {
  //     const branches = getBranches(chain).map(getPayloads)
  //     expect(branches).toEqual('abcdegfohij')
  //   })
  // })
})
