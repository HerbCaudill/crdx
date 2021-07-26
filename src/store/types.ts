import { Action, NonMergeLink } from '/chain'

export type Reducer<S, A extends Action, C = {}> = (state: S, link: NonMergeLink<A, C>) => S
