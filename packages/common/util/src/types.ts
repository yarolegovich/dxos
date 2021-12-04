//
// Copyright 2020 DXOS.org
//

export type MaybePromise<T> = T | Promise<T>

/**
 * All types that evaluate to false when cast to a boolean.
 */
export type Falsy = false | 0 | '' | null | undefined

/**
 * A function returning a value or a value itself.
 */
export type MaybeFunction<T> = T | (() => T)

/**
 * Get value from a provider.
 */
export const getAsyncValue = async <T extends any>(value: MaybeFunction<MaybePromise<T>>) => {
  if (typeof value === 'function') {
    return (value as Function)();
  } else {
    return value;
  }
};
