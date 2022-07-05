export type InnerType<T> = T extends IDomainCollection<infer U>
  ? U
  : T extends (infer U)[]
  ? U
  : T;

/* eslint-disable prettier/prettier */
export interface IDomainCollection<T> {
  indexOf(element: T): number;
  update(mapper: (i: T) => T): this;
  append(...args: T[]): this;
  takeWhile(predicate: (i: T) => boolean): this;
  delete(filter: (i: T) => boolean): this;
  sort(): this;
  sort(comparer: (i: T, j: T) => number): this;
  partition(predicate: (i: T) => boolean): [this, this];

  flat(): IDomainCollection<InnerType<T>>;
  flatMap<U>(
    mapper: (value: T, index: number, array: T[]) => IDomainCollection<U> | ReadonlyArray<U>,
    thisArg?: unknown
  ): IDomainCollection<U>;

  readonly [key: number]: T;
  readonly length: number;
  readonly last?: T;

  [Symbol.iterator](): IterableIterator<T>;
  entries(): IterableIterator<[number, T]>;

  every(
    predicate: (value: T, index: number, array: readonly T[]) => unknown,
    thisArg?: unknown
  ): boolean;

  some(
    predicate: (value: T, index: number, array: readonly T[]) => unknown,
    thisArg?: unknown
  ): boolean;

  includes(searchElement: T, fromIndex?: number): boolean;

  forEach(
    callbackfn: (value: T, index: number, array: readonly T[]) => void,
    thisArg?: unknown
  ): void;

  find<S extends T>(
    predicate: (
      this: void,
      value: T,
      index: number,
      obj: readonly T[]
    ) => value is S,
    thisArg?: unknown
  ): S | undefined;
  find(
    predicate: (value: T, index: number, obj: readonly T[]) => unknown,
    thisArg?: unknown
  ): T | undefined;

  findIndex(
    predicate: (value: T, index: number, obj: T[]) => unknown,
    thisArg?: unknown
  ): number;

  inverseImages<U extends Partial<T>>(
    others: IDomainCollection<U>,
    application: (i1: T, i2: U) => boolean
  ): [IDomainCollection<U>, IDomainCollection<U>];

  map<U>(
    mapper: (value: T, index: number, array: T[]) => U,
    thisArg?: unknown
  ): IDomainCollection<U>;

  reduce<U>(
    callbackfn: (
      previousValue: U,
      currentValue: T,
      currentIndex: number,
      array: readonly T[]
    ) => U,
    initialValue?: U
  ): U;

  filter<S extends T>(
    predicate: (value: T, index: number, array: readonly T[]) => value is S,
    thisArg?: unknown
  ): IDomainCollection<S>;
  filter(
    predicate: (value: T, index: number, array: readonly T[]) => unknown,
    thisArg?: unknown
  ): this;

  concat(
    ...items: (T | ConcatArray<T> | IDomainCollection<T>)[]
  ): this;

  slice(start?: number, end?: number): this;
}
