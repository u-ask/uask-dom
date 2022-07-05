import test from "tape";
import { ActivationRule } from "./activationrule.js";
import { ComputedRule } from "./computedrule.js";
import { DynamicRule } from "./dynamicrule.js";
import { Rules } from "./rules.js";
import { InRangeRule, limits } from "./unitrule.js";

test("Dynamic unit rule construction", t => {
  const dynamic = new DynamicRule(
    Rules.inRange,
    new ComputedRule("[$1, $1+2]", 1),
    limits.includeBoth
  );
  const result = dynamic.execute({ value: 1 }, { value: 4 });
  const expected = new InRangeRule(1, 3, limits.includeBoth);
  t.equal(dynamic.underlyingRule, expected.name);
  t.equal(dynamic.precedence, expected.precedence);
  t.deepEqual(dynamic.formula, ["[$1, $1+2]", 1]);
  t.deepEqual(
    result[result.length - 1],
    expected.execute({
      value: 4,
    })
  );
  t.end();
});

test("Dynamic cross rule construction", t => {
  const dynamic = new DynamicRule(
    Rules.activation,
    new ComputedRule("[[$1, $1+2]]"),
    "enable"
  );
  const result = dynamic.execute({ value: 1 }, { value: 4 }, { value: 1 });
  const expected = new ActivationRule([1, 3], "enable");
  t.equal(dynamic.underlyingRule, expected.name);
  t.equal(dynamic.precedence, expected.precedence);
  t.deepEqual(result.slice(-2), expected.execute({ value: 4 }, { value: 1 }));
  t.end();
});

test("Dynamic rule is a unit rule", t => {
  const dynamic = new DynamicRule(
    Rules.critical,
    new ComputedRule("['C', 'CC', $1 > 3]")
  );
  t.equal(dynamic.execute({ value: 4 }).messages?.critical, "C");
  t.equal(dynamic.execute({ value: 3 }).messages?.critical, undefined);
  t.end();
});
