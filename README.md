<img src='https://raw.githubusercontent.com/HerbCaudill/crdx/master/img/crdx-logo.png' width='150' />

What do you get when you cross [CRDTs](https://crdt.tech/) with [Redux](https://redux.js.org/)? You
get conflict-free, replicated, principled state management.

This library helps you create your own CRDT, with semantics and conflict-resolution rules that are
appropriate to your domain. It's exposed to your application as a Redux-compatible store — but one
that can automatically sync with peers, with no need for a server.

## Why

A CRDT (conflict-free replicated datatype) is ... TODO

For many peer-to-peer applications, a generic JSON-based CRDT like
[Automerge](https://github.com/automerge/automerge) or [Yjs](https://github.com/yjs/yjs) is a good
solution for creating data structures that can reliably stay in sync.

These CRDTs define a **conflict** as two peers assigning different values to the same **property**
in a JSON object. When that happens, one of the two values "wins", in an **arbitrary but predictable**
way. (See the [Automerge docs](https://github.com/automerge/automerge#conflicting-changes) for more
on how that works.)

<img src='https://raw.githubusercontent.com/HerbCaudill/crdx/master/img/crdx-illustration-01.png' width='500' />

But what if your definition of a **conflict** is more subtle than just competing values for a single
property? And what if you have your own rules for **conflict resolution**?

For example:

| Use case                                         | Conflict                                                                | Resolution                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Decentralized group membership**               | Alice removes Bob from a group, while Bob removes Alice                 | To be safe, both Alice and Bob are removed                                  |
| **Scheduling meeting rooms**                     | Alice books a room from 2:00 to 4:00 and Bob books it from 3:00 to 5:00 | Alice gets the room because she is senior to Bob                            |
| **[Spit](https://cardgames.io/spit/) card game** | Alice and Bob try to play on top of the same card                       | To keep the game balanced, Bob wins the play because he has more cards left |

## What

Just like with Redux, any changes to state are expressed as **named actions**. You initialize a
store with an **initial state** and a **reducer function** to calculate your state from any sequence
of actions.

There's a twist, though: We need to support peer-to-peer replication and deal with concurrency, so
an append-only list of actions won't do. Instead, we have a directed acyclic graph (DAG) of actions,
each hash-linked to its predecessor, and cryptographically signed. You provide a **resolver function**
that defines how any two concurrent sequences will be merged, allowing us to flatten our DAG into a
single sequence that we can then run through the reducer. In the resolver, you can pick from is
where you can define any domain-specific logic you need to detect and resolve conflicts consistently.

Suppose you have the following graph. Actions **c** and **d** are made concurrently. Your resolver will
decide what to do with these concurrent actions: It might

- take **c** before **d**
- take **d** before **c**
- take **d** and discard **c** altogether
- etc.

![sigchain.3](https://raw.githubusercontent.com/HerbCaudill/pics/master/sigchain.3.png)

## How

TODO

```

```
