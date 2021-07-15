import { Reducer } from './types'

export const compose = <S>(reducers: Reducer<S>[]): Reducer<S> => state =>
  reducers.reduce((state, reducer) => reducer(state), state)
