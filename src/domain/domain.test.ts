import test from "tape";
import "../test-extension.js";
import { Domain, merge } from "./domain.js";
import { DomainCollection } from "./domaincollection.js";

class Sample {
  constructor(readonly a = 1, readonly b = "A") {}
  update(kwargs: Partial<Sample>): Sample {
    if (!Domain.hasChanges(this, kwargs)) return this;
    return Object.assign(new Sample(this.a, this.b), kwargs);
  }
}

test("Object changes", t => {
  const sample = new Sample();
  t.true(Domain.hasChanges(sample, { a: 2 }));
  t.end();
});

test("Object does not change", t => {
  const sample = new Sample();
  t.false(Domain.hasChanges(sample, { a: 1 }));
  t.end();
});

test("Object does not change with equal dates", t => {
  const sample1 = { d: new Date(2000, 0, 1) };
  const sample2 = { d: new Date(2000, 0, 1) };
  t.false(Domain.hasChanges(sample1, sample2));
  t.end();
});

test("Merge update only", t => {
  const coll1 = DomainCollection(new Sample(1, "1"), new Sample(2, "1"));
  const coll2 = DomainCollection(new Sample(2, "2"), new Sample(3, "3"));
  const coll3 = merge(coll1, coll2)
    .on((s1, s2) => s1.a == s2.a)
    .updateOnly();
  t.deepLooseEqual(coll3, [
    { a: 1, b: "1" },
    { a: 2, b: "2" },
  ]);
  t.end();
});

test("Merge insert all", t => {
  const coll1 = DomainCollection(new Sample(1, "1"), new Sample(2, "1"));
  const coll2 = DomainCollection(new Sample(2, "2"), new Sample(3, "3"));
  const coll3 = merge(coll1, coll2)
    .on((s1, s2) => s1.a == s2.a)
    .insertAll();
  t.deepLooseEqual(coll3, [
    { a: 1, b: "1" },
    { a: 2, b: "2" },
    { a: 3, b: "3" },
  ]);
  t.end();
});

test("Merge insert partial", t => {
  const coll1 = DomainCollection(new Sample(1, "1"), new Sample(2, "1"));
  const coll2 = DomainCollection({ a: 2, b: "2" }, { a: 3, b: "3" });
  const coll3 = merge(coll1, coll2)
    .on((s1, s2) => s1.a == s2.a)
    .insert(m => m.map(s => new Sample(s.a, s.b)));
  t.deepLooseEqual(coll3, [
    { a: 1, b: "1" },
    { a: 2, b: "2" },
    { a: 3, b: "3" },
  ]);
  t.end();
});

test("Merge no change", t => {
  const common = new Sample(2, "1");
  const coll1 = DomainCollection(new Sample(1, "1"), common);
  const coll2 = DomainCollection(common, new Sample(3, "3"));
  const coll3 = merge(coll1, coll2)
    .on((s1, s2) => s1.a == s2.a)
    .insert(m => m.delete(s => s.a == 3));
  t.equal(coll3, coll1);
  t.end();
});
