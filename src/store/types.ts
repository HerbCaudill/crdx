import { Action, NonMergeLink } from '@/chain'

export type Reducer<S, A extends Action> = (state: S, link: NonMergeLink<A>) => S
