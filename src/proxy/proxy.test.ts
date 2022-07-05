import test from "tape";
import {
  DomainProxy,
  IDomainProxy,
  isDomainProxy,
  isProxyEqual,
} from "./proxy.js";

class Domain {
  a = 1;

  constructor() {
    Object.freeze(this);
  }

  get b() {
    return 2;
  }

  c() {
    return 3;
  }
}

interface SimpleAdapter extends Domain, IDomainProxy<Domain> {}
class SimpleAdapter {
  constructor(public value: Domain) {
    return DomainProxy(this, value);
  }
}

interface ExtendedAdapter extends Domain, IDomainProxy<Domain> {}
class ExtendedAdapter {
  constructor(public value: Domain) {
    return DomainProxy(this, value);
  }

  x = 4;

  get y() {
    return 5;
  }

  z() {
    return 6;
  }
}

interface OverridenAdapter extends Domain, IDomainProxy<Domain> {}
class OverridenAdapter {
  constructor(public value: Domain) {
    return DomainProxy(this, value);
  }

  get a() {
    return 4;
  }

  get b() {
    return 5;
  }

  c() {
    return 6;
  }
}

test("Proxy has target type", t => {
  const adapter = new SimpleAdapter(new Domain());
  t.true(adapter instanceof Domain);
  t.end();
});

test("Proxy type assertion", t => {
  const adapter = new SimpleAdapter(new Domain());
  t.true(isDomainProxy(adapter));
  t.false(isDomainProxy(new Domain()));
  t.end();
});

test("Proxy has domain value", t => {
  const domain = new Domain();
  const adapter = new SimpleAdapter(domain);
  t.equal(adapter.value, domain);
  t.end();
});

test("Proxy has target members", t => {
  const adapter = new SimpleAdapter(new Domain());
  t.equal(adapter.a, 1);
  t.equal(adapter.b, 2);
  t.equal(adapter.c(), 3);
  t.end();
});

test("Proxy members are getters", t => {
  const adapter = new SimpleAdapter(new Domain());
  const d = Object.getOwnPropertyDescriptor(adapter, "a");
  t.true(d?.get);
  t.end();
});

test("Proxy target members are not writeable", t => {
  const adapter = new SimpleAdapter(new Domain());
  t.throws(() => {
    adapter.a = 11;
  }, TypeError);
  t.equal(adapter.a, 1);
  t.end();
});

test("Proxy spread is deeply equal to domain spread", t => {
  const domain = new Domain();
  const adapter = new SimpleAdapter(domain);
  t.deepEqual({ ...adapter }, { ...domain });
  t.end();
});

test("Proxy with new members", t => {
  const adapter = new ExtendedAdapter(new Domain());
  t.equal(adapter.x, 4);
  t.equal(adapter.y, 5);
  t.equal(adapter.z(), 6);
  t.end();
});

test("Proxy new members are writeable", t => {
  const adapter = new ExtendedAdapter(new Domain());
  adapter.x = 14;
  t.equal(adapter.x, 14);
  t.end();
});

test("Proxy with overriden members", t => {
  const domain = new Domain();
  const adapter = new OverridenAdapter(domain);
  t.equal(adapter.a, 4);
  t.equal(adapter.b, 5);
  t.equal(adapter.c(), 6);
  t.end();
});

test("Proxy are equal", t => {
  const domain = new Domain();
  const adapter0 = new OverridenAdapter(domain);
  const adapter1 = new OverridenAdapter(domain);
  t.true(isProxyEqual(domain, domain));
  t.true(isProxyEqual(domain, adapter0));
  t.true(isProxyEqual(adapter1, adapter0));
  t.end();
});

test("Proxy are not equal", t => {
  const domain0 = new Domain();
  const domain1 = new Domain();
  const adapter0 = new OverridenAdapter(domain0);
  const adapter1 = new OverridenAdapter(domain1);
  t.false(isProxyEqual(domain0, domain1));
  t.false(isProxyEqual(domain1, adapter0));
  t.false(isProxyEqual(adapter1, adapter0));
  t.end();
});
