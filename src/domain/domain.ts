import { IDomainCollection } from "./domaincollectiondef.js";

export type mlstring = string | Readonly<Record<string, string>>;

export function isMLstring(o: unknown): o is mlstring {
  return (
    typeof o == "string" ||
    (typeof o == "object" &&
      o != null &&
      Object.values(o).every(v => typeof v == "string"))
  );
}

export function isML(o: mlstring): o is Record<string, string> {
  return typeof o == "object" && !Array.isArray(o);
}

export function getTranslation(
  label: mlstring | undefined,
  lang?: string,
  fallbackLang?: string
): string | undefined {
  if (typeof label == "undefined" || typeof label == "string") return label;
  if (typeof label == "number") return String(label);
  return (
    label[lang ?? "en"] ??
    label[fallbackLang ?? "en"] ??
    Object.values(label)[0]
  );
}

export function setTranslation(
  defaultLang?: string
): (
  label: mlstring | undefined,
  lang: string,
  translation: string
) => mlstring {
  return (label, lang, translation) =>
    typeof label == "object"
      ? { ...label, [lang]: translation }
      : {
          [defaultLang ?? "en"]: label ?? "",
          [lang]: translation,
        };
}

export const Domain = {
  extend<T>(obj: T): void {
    if (!("__keys__" in obj)) Object.assign(obj, { __keys__: {} });
    if (!("__changes__" in obj)) Object.assign(obj, { __changes__: {} });
    Object.freeze(obj);
  },

  update<T, S extends unknown[]>(
    obj: T,
    kwargs: Partial<T>,
    clazz: [{ new (...args: [...S, Partial<T>]): T }, ...S]
  ): T {
    if (!Domain.hasChanges(obj, kwargs)) return obj;
    const [constr, ...args] = clazz;
    if (kwargs instanceof constr) return kwargs;
    return new constr(...args, {
      ...obj,
      ...kwargs,
      __changes__: {
        ...(obj as T & { __changes__: Record<string, unknown> }).__changes__,
      },
    }) as unknown as T;
  },

  hasChanges<T>(obj: T, kwargs: Partial<T>): boolean {
    let key: keyof typeof kwargs;
    for (key in kwargs) {
      const objVal = obj[key];
      const kwargVal = kwargs[key] as typeof objVal;
      switch (key) {
        case "__keys__":
        case "__changes__":
          if (Domain.hasChanges(objVal, kwargVal)) return true;
          break;
        default:
          if (objVal instanceof Date || kwargVal instanceof Date) {
            const objDate = new Date(objVal as unknown as string | Date);
            const kwargDate = new Date(kwargVal as unknown as string | Date);
            if (objDate.getTime() != kwargDate.getTime()) return true;
          } else if (notSame(kwargs[key], obj[key])) return true;
      }
    }
    return false;
  },
};

type Updatable<T> = { update(kwargs: Partial<T>): T };

type Predicate<T, U extends Partial<T>> = (o1: T, o2: U) => boolean;

interface IMergeJoined<T, U extends Partial<T>> {
  insert(
    apply: (m: IDomainCollection<U>) => IDomainCollection<T>
  ): IDomainCollection<T>;
  updateOnly(): IDomainCollection<T>;
}

interface IMergeFullJoined<T> extends IMergeJoined<T, T> {
  insertAll(): IDomainCollection<T>;
}

interface IMerge<T, U extends Partial<T>> {
  on(predicate: Predicate<T, U>): IMergeJoined<T, U>;
}

interface IMergeFull<T> {
  on(predicate: Predicate<T, T>): IMergeFullJoined<T>;
}

function notSame(o1: unknown, o2: unknown) {
  return (
    (Array.isArray(o1) && !Array.isArray(o2)) ||
    (!Array.isArray(o1) && Array.isArray(o2)) ||
    o1 != o2
  );
}

export function merge<T extends Updatable<T>>(
  current: IDomainCollection<T>,
  values: IDomainCollection<T>
): IMergeFull<T>;
export function merge<T extends Updatable<T>, U extends Partial<T>>(
  current: IDomainCollection<T>,
  values: IDomainCollection<U>
): IMerge<T, U>;
export function merge<T extends Updatable<T>, U extends Partial<T>>(
  current: IDomainCollection<T>,
  values: IDomainCollection<U>
): IMerge<T, U> {
  return {
    on(predicate: Predicate<T, U>) {
      return mergeJoin(current, values, predicate);
    },
  };
}

function mergeJoin<T extends Updatable<T>, U extends Partial<T>>(
  current: IDomainCollection<T>,
  values: IDomainCollection<U>,
  predicate: Predicate<T, U>
) {
  const [exist, notExist] = current.inverseImages(values, predicate);
  const updated = mergeUpdate(current, exist, predicate);
  return {
    insert(apply: (m: IDomainCollection<U>) => IDomainCollection<T>) {
      return updated.append(...(apply(notExist) as IDomainCollection<T>));
    },
    insertAll() {
      return updated.append(...(notExist as unknown as IDomainCollection<T>));
    },
    updateOnly() {
      return updated;
    },
  };
}

function mergeUpdate<T extends Updatable<T>, U extends Partial<T>>(
  current: IDomainCollection<T>,
  values: IDomainCollection<U>,
  predicate: Predicate<T, U>
): IDomainCollection<T> {
  if (values.length == 0) return current;
  return current.update(a => mergeItem(a, values, predicate));
}

function mergeItem<T extends Updatable<T>, U extends Partial<T>>(
  item: T,
  values: IDomainCollection<U>,
  predicate: Predicate<T, U>
) {
  const p = values.find(c => predicate(item, c));
  return p ? item.update(p) : item;
}
