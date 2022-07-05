import test from "tape";
import { Sample } from "./sample.js";

test("Sample construction", t => {
  const sample = new Sample("032");
  t.equal(sample.sampleCode, "032");
  t.end();
});

test("Sample update", t => {
  const sample = new Sample("032");
  const copy = sample.update({});
  t.equal(copy, sample);
  const updated = sample.update({ sampleCode: "033" });
  t.equal(updated.sampleCode, "033");
  t.end();
});

test("Sample fully update", t => {
  const sample = new Sample("032");
  const updated0 = sample.update({ sampleCode: "033" });
  const updated1 = sample.update(updated0);
  t.equal(updated1, updated0);
  t.end();
});

test("Sample with kwargs", t => {
  const sample = new Sample("034", {
    name: "NewSample",
    address: "18 rue du test, 45670 Testville",
  });
  t.equal(sample.name, "NewSample");
  t.equal(sample.address, "18 rue du test, 45670 Testville");
  const update0 = sample.update({ name: "UpdatedName" });
  t.equal(update0.name, "UpdatedName");
  t.end();
});

test("Sample can be frozen #301", t => {
  const sample = new Sample("AA");
  t.false(sample.frozen);
  const frozen = sample.freeze();
  t.true(frozen.frozen);
  t.end();
});
