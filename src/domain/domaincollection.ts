import { IDomainCollection, InnerType } from "./domaincollectiondef.js";

export class DomainCollectionImpl<T>
  extends Array<T>
  implements IDomainCollection<T>
{
  get last(): T | undefined {
    return this.length > 0 ? this[this.length - 1] : undefined;
  }

  private constr(items: T[]): this {
    const constr = Object.getPrototypeOf(this).constructor;
    return construct(constr, items) as unknown as this;
  }

  update(mapper: (i: T) => T): this {
    return this.m(
      i => mapper(i),
      c => this.constr(c),
      undefined
    ) as this;
  }

  append(...args: T[]): this {
    return this.concat(args);
  }

  takeWhile(predicate: (i: T) => boolean): this {
    const ix = super.findIndex(i => !predicate(i));
    const end = ix == -1 ? this.length : ix;
    return this.slice(0, end);
  }

  delete(predicate: (i: T) => boolean): this {
    return this.filter(i => !predicate(i));
  }

  partition(predicate: (i: T) => boolean): [this, this] {
    const p1: T[] = [];
    const p2: T[] = [];
    for (const i of this) {
      (predicate(i) ? p1 : p2).push(i);
    }
    return [this.constr(p1), this.constr(p2)];
  }

  private isFlat<U extends InnerType<T>>(): this is IDomainCollection<U> & U[] {
    return this.length == 0 || !Array.isArray(this[0]);
  }

  flat<U = InnerType<T>>(): IDomainCollection<U> & U[] {
    if (this.isFlat()) return this as IDomainCollection<U> & U[];
    const nonFlat = this as unknown as IDomainCollection<
      IDomainCollection<U> | ReadonlyArray<U>
    >;
    return construct(DomainCollectionImpl, [] as U[]).concat(...nonFlat);
  }

  flatMap<U>(
    mapper: (
      value: T,
      index: number,
      array: T[]
    ) => U | IDomainCollection<U> | ReadonlyArray<U>,
    thisArg?: unknown
  ): IDomainCollection<U> & U[] {
    const mapped = this.map(mapper, thisArg);
    return mapped.flat() as IDomainCollection<U> & U[];
  }

  inverseImages<U extends Partial<T>>(
    others: IDomainCollection<U>,
    application: (i1: T, i2: U) => boolean
  ): [IDomainCollection<U>, IDomainCollection<U>] {
    const [image] = this.partition(c =>
      this.intersectImage(others, application, c)
    );
    return others.partition(a => this.complementImage(image, application, a));
  }

  private intersectImage<U, V>(
    others: IDomainCollection<V>,
    application: (i1: U, i2: V) => boolean,
    c: U
  ): boolean {
    return others.findIndex(a => application(c, a)) > -1;
  }

  private complementImage<U, V>(
    coll: IDomainCollection<U>,
    application: (i1: U, i2: V) => boolean,
    a: V
  ): boolean {
    return this.intersectImage(coll, (i1, i2) => application(i2, i1), a);
  }

  map(
    mapper: (value: T, index: number, array: T[]) => T,
    thisArg?: unknown
  ): this;
  map<U>(
    mapper: (value: T, index: number, array: T[]) => U,
    thisArg?: unknown
  ): IDomainCollection<U>;
  map<U>(
    mapper: (value: T, index: number, array: T[]) => T | U,
    thisArg?: unknown
  ): IDomainCollection<T | U> | this {
    return this.m(mapper, e => DomainCollection(...e), thisArg);
  }

  private m<U, V extends IDomainCollection<T | U>>(
    mapper: (value: T, index: number, array: T[]) => T | U,
    constr: (e: (T | U)[]) => V | this,
    thisArg: unknown
  ): V | this {
    const changer = withChangeDetection(mapper);
    const result = super.map((i, x, a) => changer(i, x, a), thisArg);
    return changer.changed ? constr(result) : this;
  }

  filter<S extends T>(
    predicate: (value: T, index: number, array: readonly T[]) => value is S,
    thisArg?: unknown
  ): IDomainCollection<S> & S[];
  filter(
    predicate: (value: T, index: number, array: readonly T[]) => unknown,
    thisArg?: unknown
  ): this;
  filter(
    predicate: (value: T, index: number, array: readonly T[]) => boolean,
    thisArg?: unknown
  ): (IDomainCollection<T> & T[]) | this {
    const changer = withChangeDetection(predicate, true);
    const result = super.filter((i, x, a) => changer(i, x, a), thisArg);
    return changer.changed ? this.constr(result as T[]) : this;
  }

  concat(...items: (T | ConcatArray<T> | IDomainCollection<T>)[]): this {
    if (items.length == 0) return this;
    const concatened = super.concat(...(items as (T | ConcatArray<T>)[]));
    return concatened.length == this.length ? this : this.constr(concatened);
  }

  slice(start = 0, end: number = this.length): this {
    if (start == 0 && end >= this.length) return this;
    return this.constr(super.slice(start, end));
  }

  sort(): this;
  sort(comparer: (i: T, j: T) => number): this;
  sort(comparer?: (i: T, j: T) => number): this {
    const result = [...this];
    result.sort(comparer);
    return this.constr(result);
  }
}

type Mapper<T, U> = (value: T, index: number, array: T[]) => T | U;

type changeDetection<T, U> = {
  changed: boolean;
} & Mapper<T, U>;

function withChangeDetection<T, U>(mapper: Mapper<T, U>): changeDetection<T, U>;
function withChangeDetection<T>(
  predicate: Mapper<T, boolean>,
  useResult: true
): changeDetection<T, boolean>;

function withChangeDetection<T, U>(
  mapper: Mapper<T, U>,
  useResult?: true
): changeDetection<T, U> {
  const changer = function (i: T, x: number, a: T[]): T | U {
    const u = mapper(i, x, a);
    changer.changed = changer.changed || u != (useResult ?? i);
    return u;
  };
  changer.changed = false;
  return changer;
}

const emptyCollection = new DomainCollectionImpl<unknown>();
Object.freeze(emptyCollection);

export function DomainCollection<T>(...items: T[]): IDomainCollection<T> {
  if (items.length == 0) return emptyCollection as IDomainCollection<T>;
  return construct(DomainCollectionImpl, items);
}

function construct<T, U extends IDomainCollection<T> & Array<T>>(
  constr: { new (l: number): U },
  items: T[]
): U {
  const a = new constr(items.length);
  Object.assign(a, { length: 0 });
  a.push(...items);
  Object.freeze(a);
  return a;
}
