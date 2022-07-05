export type IDomainProxy<T> = T & {
  value: T;
};

export function isDomainProxy<T>(adapter: T): adapter is IDomainProxy<T> {
  const adaptee = (adapter as IDomainProxy<T>).value;
  return (
    typeof adaptee != "undefined" &&
    Object.getPrototypeOf(adapter) == Object.getPrototypeOf(adaptee)
  );
}

export function DomainProxy<T, U extends IDomainProxy<T>>(
  adapter: U,
  adaptee: T
): U {
  const { proto, descrs } = getPrototype(adapter, adaptee);
  const target = Object.create(proto, descrs);
  const handlers = gtHandlers<T, U>(adapter);
  return new Proxy(target, handlers);
}

function getPrototype<T, U extends IDomainProxy<T>>(adapter: U, adaptee: T) {
  const proto = Object.getPrototypeOf(adaptee);
  const descrs = getDesriptors(adapter, adaptee);
  return { proto, descrs };
}

function getDesriptors<T, U extends IDomainProxy<T>>(adapter: U, adaptee: T) {
  const descrs = Object.getOwnPropertyDescriptors(adaptee);
  const target: PropertyDescriptorMap = {
    value: {
      configurable: true,
      enumerable: false,
      get: function () {
        return adapter.value;
      },
      set: function (value) {
        adapter.value = value;
      },
    },
  };
  for (const [prop, descr] of Object.entries(descrs)) {
    const d = {} as PropertyDescriptor;
    d.enumerable = descr.enumerable;
    d.get = function () {
      return this.value[prop];
    };
    target[prop] = d;
  }
  return target;
}

function gtHandlers<T, U extends IDomainProxy<T>>(adapter: U): ProxyHandler<U> {
  return {
    get: (t, p, r) => proxyGet(adapter, t, p, r),
    set: (t, p, v) => proxySet(adapter, p, v),
  };
}

function proxyGet<T>(
  adapter: IDomainProxy<T>,
  target: IDomainProxy<T>,
  p: string | symbol | number,
  receiver: unknown
) {
  return p in adapter
    ? Reflect.get(adapter, p, receiver)
    : Reflect.get(target, p, receiver); // eslint-disable-line @typescript-eslint/ban-types
}

function proxySet<T>(
  adapter: IDomainProxy<T>,
  p: string | symbol | number,
  value: unknown
) {
  if (p in adapter.value) {
    return false;
  }
  Reflect.set(adapter, p, value);
  return true;
}

export function isProxyEqual<T>(
  a: T | IDomainProxy<T>,
  b: T | IDomainProxy<T>
): boolean {
  return (
    a == b ||
    (isDomainProxy(a) && a.value == b) ||
    (isDomainProxy(b) && a == b.value) ||
    (isDomainProxy(a) && isDomainProxy(b) && a.value == b.value)
  );
}
