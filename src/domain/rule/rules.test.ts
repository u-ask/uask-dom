import test from "tape";
import { CrossRule } from "./crossrule.js";
import { Rules } from "./rules.js";
import { limits, UnitRule } from "./unitrule.js";

test("Factory create required rule", t => {
  const expected = Rules.required();
  const rule = Rules.create("required");
  t.deepEqual(rule, expected);
  t.deepEqual(cloneRule(expected), expected);
  t.end();
});

test("Factory create required rule that is not enforced", t => {
  const expected = Rules.required(false);
  const rule = Rules.create("required", false);
  t.deepEqual(rule, expected);
  t.deepEqual(cloneRule(expected), expected);
  t.end();
});

test("Factory create constant rule", t => {
  const expected = Rules.constant(2);
  const rule = Rules.create("constant", 2);
  t.deepEqual(rule, expected);
  t.deepEqual(cloneRule(expected), expected);
  t.end();
});

test("Factory create copy rule", t => {
  const expected = Rules.copy();
  const rule = Rules.create("copy");
  t.deepEqual(rule, expected);
  t.deepEqual(cloneRule(expected), expected);
  t.end();
});

test("Factory create in range rule", t => {
  const expected = Rules.inRange(1, 6, limits.includeBoth);
  const rule = Rules.create("inRange", 1, 6, limits.includeBoth);
  t.deepEqual(rule, expected);
  t.deepEqual(cloneRule(expected), expected);
  t.end();
});

test("Factory create max length rule", t => {
  const expected = Rules.maxLength(6);
  const rule = Rules.create("maxLength", 6);
  t.deepEqual(rule, expected);
  t.deepEqual(cloneRule(expected), expected);
  t.end();
});

test("Factory create decimal precision rule", t => {
  const expected = Rules.decimalPrecision(3);
  const rule = Rules.create("decimalPrecision", 3);
  t.deepEqual(rule, expected);
  t.deepEqual(cloneRule(expected), expected);
  t.end();
});

test("Factory create fixed length rule", t => {
  const expected = Rules.fixedLength(10);
  const rule = Rules.create("fixedLength", 10);
  t.deepEqual(rule, expected);
  t.deepEqual(cloneRule(expected), expected);
  t.end();
});

test("Factory create letter case rule", t => {
  const expected = Rules.letterCase("upper");
  const rule = Rules.create("letterCase", "upper");
  t.deepEqual(rule, expected);
  t.deepEqual(cloneRule(expected), expected);
  t.end();
});

test("Factory create activation rule", t => {
  const expected = Rules.activation([0, 1], "enable");
  const rule = Rules.create("activation", [0, 1], "enable");
  t.deepEqual(rule, expected);
  t.deepEqual(cloneRule(expected), expected);
  t.end();
});

test("Factory create visible rule", t => {
  const expected = Rules.activation([0, 1], "show");
  const rule = Rules.create("activation", [0, 1], "show");
  t.deepEqual(rule, expected);
  t.deepEqual(cloneRule(expected), expected);
  t.end();
});

test("Factory create computed rule", t => {
  const expected = Rules.computed("$1 + $2", 2);
  const rule = Rules.create("computed", "$1 + $2", 2);
  t.equal(JSON.stringify(rule), JSON.stringify(expected));
  t.equal(JSON.stringify(cloneRule(expected)), JSON.stringify(expected));
  t.end();
});

test("Factory create dynamic rule", t => {
  const expected = Rules.dynamic(
    Rules.inRange,
    ["[$1, $2]"],
    limits.includeBoth
  );
  const rule = Rules.create(
    "dynamic",
    "inRange",
    ["[$1, $2]"],
    limits.includeBoth
  );
  t.equal(JSON.stringify(rule), JSON.stringify(expected));
  t.equal(JSON.stringify(cloneRule(expected)), JSON.stringify(expected));
  t.end();
});

function cloneRule(expected: UnitRule | CrossRule) {
  return Rules.create(JSON.parse(JSON.stringify(expected)));
}

test("Factory create critical rule with given values #275", t => {
  const rule = Rules.create({
    name: "critical",
    event: "ae",
    message: "ae",
    values: [2, 3],
  });
  const expected = Rules.critical("ae", "ae", 2, 3);
  t.deepEqual(rule, expected);
  t.end();
});
