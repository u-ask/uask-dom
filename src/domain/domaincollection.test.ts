import test from "tape";
import { DomainCollection } from "./domaincollection.js";
import "../test-extension.js";

test("Domain collection construction", t => {
  const coll = DomainCollection<number>(1, 2, 3);
  t.equal(coll.length, 3);
  t.equal(coll[0], 1);
  t.arrayContains(coll, [2, 3]);
  t.end();
});

test("Domain collection update", t => {
  const coll = DomainCollection<number>(1, 2, 3);
  const updated = coll.update(i => i + 1);
  t.equal(updated.length, 3);
  t.equal(updated[0], 2);
  t.arrayContains(updated, [3, 4]);
  t.end();
});

test("Domain collection append", t => {
  const coll = DomainCollection<number>(1, 2, 3);
  const appended = coll.append(4, 5);
  t.equal(appended.length, 5);
  t.equal(appended[3], 4);
  t.equal(appended[4], 5);
  t.end();
});

test("Domain collection delete", t => {
  const coll = DomainCollection<number>(1, 2, 3);
  const deleted = coll.delete(i => i == 2);
  t.equal(deleted.length, 2);
  t.arrayContains(deleted, [1, 3]);
  t.end();
});

test("Domain collection partition", t => {
  const coll = DomainCollection<number>(1, 2, 3, 4);
  const [even, odd] = coll.partition(i => i % 2 == 0);
  t.arrayContains(even, [2, 4]);
  t.arrayContains(odd, [1, 3]);
  t.end();
});

test("Domain collection for of loops", t => {
  const n: number[] = [];
  const coll = DomainCollection(1, 3, 5, 7);
  for (const i of coll) {
    n.push(i);
  }
  t.deepEqual(n, [1, 3, 5, 7]);
  t.deepLooseEqual(n, coll);
  t.end();
});

test("Domain collection for in loops", t => {
  const n: number[] = [];
  const coll = DomainCollection(1, 3, 5, 7);
  for (const i in coll) {
    n.push(coll[i]);
  }
  t.deepEqual(n, [1, 3, 5, 7]);
  t.deepLooseEqual(n, coll);
  t.end();
});

test("Domain collection map no change", t => {
  const coll = DomainCollection(1, 3, 5, 7);
  const updated = coll.map(i => i);
  t.equal(updated, coll);
  t.end();
});

test("Domain collection no update", t => {
  const coll = DomainCollection(1, 3, 5, 7);
  const updated = coll.update(i => i);
  t.equal(updated, coll);
  t.end();
});

test("Domain collection no append", t => {
  const coll = DomainCollection(1, 3, 5, 7);
  const appended = coll.append();
  t.equal(appended, coll);
  t.end();
});

test("Domain collection no delete", t => {
  const coll = DomainCollection(1, 3, 5, 7);
  const deleted = coll.delete(i => i == 2);
  t.equal(deleted, coll);
  t.end();
});

test("Domain collection split existing items", t => {
  const coll = DomainCollection(1, 3, 5, 7);
  const [exist, notExist] = coll.inverseImages(
    DomainCollection(5, 7, 9, 11),
    (i1, i2) => i1 == i2
  );
  t.deepLooseEqual(exist, [5, 7]);
  t.deepLooseEqual(notExist, [9, 11]);
  t.end();
});

test("Domain collection map", t => {
  const coll = DomainCollection(1, 3, 5, 7);
  const colls = coll.map(i => `${String(i)}.`);
  t.deepLooseEqual(colls, ["1.", "3.", "5.", "7."]);
  t.true("update" in colls);
  t.end();
});

test("Domain collection filter", t => {
  const coll = DomainCollection(1, 3, 5, 7);
  const collf = coll.filter(i => i != 3);
  t.deepLooseEqual(collf, [1, 5, 7]);
  t.true("update" in collf);
  t.end();
});

test("Domain collection concat", t => {
  const coll = DomainCollection(1, 3);
  const collc = coll.concat(5, [7, 9]);
  t.deepLooseEqual(collc, [1, 3, 5, 7, 9]);
  t.true("update" in collc);
  t.end();
});

test("Domain collection slice", t => {
  const coll = DomainCollection(1, 3, 5, 7, 9);
  const colls = coll.slice(1, 4);
  t.deepLooseEqual(colls, [3, 5, 7]);
  t.true("update" in colls);
  t.end();
});

test("Domain collection slice from end", t => {
  const coll = DomainCollection(1, 3, 5, 7, 9);
  const colls = coll.slice(1, -1);
  t.deepLooseEqual(colls, [3, 5, 7]);
  t.true("update" in colls);
  t.end();
});

test("Domain collection sort", t => {
  const coll = DomainCollection(1, 3, 5, 7, 9);
  const colls = coll.sort((i, j) => j - i);
  t.deepLooseEqual(colls, [9, 7, 5, 3, 1]);
  t.true("update" in colls);
  t.end();
});

test("Domain collection last", t => {
  const coll = DomainCollection(1, 3, 5, 7);
  t.equal(coll.last, 7);
  t.end();
});

test("Domain collection indexOf", t => {
  const coll = DomainCollection(1, 3, 5, 7);
  t.equal(coll.indexOf(5), 2);
  t.end();
});

test("Domain collection flatten", t => {
  const coll = DomainCollection([1, 3], [5, 7]);
  t.deepLooseEqual(coll.flat(), [1, 3, 5, 7]);
  t.end();
});

test("Domain collection flat map", t => {
  const coll = DomainCollection({ a: [1, 3] }, { a: [5, 7] });
  t.deepLooseEqual(
    coll.flatMap(i => i.a),
    [1, 3, 5, 7]
  );
  t.end();
});

test("Domain collection flatten no change", t => {
  const coll = DomainCollection(1, 3, 5, 7);
  t.equal(coll.flat(), coll);
  t.end();
});

test("Domain collection findIndex", t => {
  const coll = DomainCollection(1, 3, 5, 7);
  t.deepLooseEqual(
    coll.findIndex(i => i == 3),
    1
  );
  t.end();
});

test("Domain collection take while", t => {
  const coll = DomainCollection(1, 3, 5, 7);
  t.deepLooseEqual(
    coll.takeWhile(i => i != 5),
    [1, 3]
  );
  t.end();
});

test("Domain collection that contains a single number", t => {
  t.deepLooseEqual(DomainCollection(4), [4]);
  t.end();
});

test("Empty domain collection", t => {
  t.deepLooseEqual(
    DomainCollection(1).filter(() => false),
    []
  );
  t.end();
});
