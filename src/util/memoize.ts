﻿import _memoize from 'fast-memoize'
import { MemoizeFunc } from 'fast-memoize/typings/fast-memoize'

// ignore file coverage

const BYPASS = false

const passthrough = <T>(f: T) => f as T

export const memoize = (BYPASS ? passthrough : _memoize) as MemoizeFunc
