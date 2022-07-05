import test from "tape";
import { ItemTypes } from "../itemtypes.js";
import {
  DecimalPrecisionRule,
  InRangeRule,
  limits,
  RequiredRule,
  MaxLengthRule,
  FixedLengthRule,
  LetterCaseRule,
  ConstantRule,
  CriticalRule,
} from "./unitrule.js";

test("Constant rule", t => {
  const rule = new ConstantRule(2);
  t.equal(rule.execute({ value: undefined }).value, 2);
  t.end();
});

test("Required rule", t => {
  const rule = new RequiredRule();
  t.deepLooseEqual(rule.execute({ value: undefined }).messages, {
    required: "value is required",
  });
  t.end();
});

test("Required rule that is not enforced", t => {
  const rule = new RequiredRule(false);
  const answer = { value: undefined };
  t.equal(rule.execute(answer), answer);
  t.end();
});

test("Required rule changes nothing", t => {
  const rule = new RequiredRule();
  const answer = { value: "ok" };
  const result = rule.execute(answer);
  t.equal(result, answer);
  t.false("messages" in result);
  t.end();
});

test("Required rule successes with existing message", t => {
  const rule = new RequiredRule();
  const answer = {
    value: 1,
    messages: { required: "value is required" },
  };
  const result = rule.execute(answer);
  t.notEqual(result, answer);
  t.deepEqual(result.messages, {});
  t.end();
});

test("Required rule fails with existing message", t => {
  const rule = new RequiredRule();
  const answer = {
    value: undefined,
    messages: { required: "value is required" },
  };
  const result = rule.execute(answer);
  t.equal(result, answer);
  t.deepEqual(result.messages, { required: "value is required" });
  t.end();
});

test("In range rule", t => {
  const rule = new InRangeRule(1, 4, limits.includeBoth);
  t.deepEqual(rule.execute({ value: 0 }).messages, {
    inRange: "value must be in range [1, 4]",
  });
  t.end();
});

test("In period rule", t => {
  const start = new Date(2020, 1, 1);
  const end = new Date(2020, 11, 31);
  const rule = new InRangeRule(start, end, limits.includeBoth);
  t.deepEqual(rule.execute({ value: new Date(2021, 1, 1) }).messages, {
    inRange: `value must be in range [${ItemTypes.date(false).label(
      start
    )}, ${ItemTypes.date(false).label(end)}]`,
  });
  t.end();
});

test("In period rule with incomplete date", t => {
  const start = new Date(2020, 1, 1);
  const end = new Date(2020, 11, 31);
  const rule = new InRangeRule(start, end, limits.includeBoth);
  t.deepEqual(rule.execute({ value: "2021-01" }).messages, {
    inRange: `value must be in range [${ItemTypes.date(false).label(
      start
    )}, ${ItemTypes.date(false).label(end)}]`,
  });
  t.equal(rule.execute({ value: "2020-02" }).messages?.inRange, undefined);
  t.end();
});

test("In range rule changes nothing", t => {
  const rule = new InRangeRule(1, 4);
  const answer = { value: 3 };
  const result = rule.execute(answer);
  t.equal(result, answer);
  t.false("messages" in result);
  t.end();
});

test("In range rule successes with existing message", t => {
  const rule = new InRangeRule(1, 4, limits.includeBoth);
  const answer = {
    value: 3,
    messages: { inRange: "value must be in range [1, 4]" },
  };
  const result = rule.execute(answer);
  t.notEqual(result, answer);
  t.deepEqual(result.messages, {});
  t.end();
});

test("In range rule fails with existing message", t => {
  const rule = new InRangeRule(1, 4, limits.includeBoth);
  const answer = {
    value: 0,
    messages: { inRange: "value must be in range [1, 4]" },
  };
  const result = rule.execute(answer);
  t.equal(result, answer);
  t.deepEqual(result.messages, { inRange: "value must be in range [1, 4]" });
  t.end();
});

test("Excluded min with inrange rule", t => {
  const rule = new InRangeRule(1, 4, limits.includeUpper);
  const answer = { value: 1 };
  const result = rule.execute(answer);
  t.deepEqual(result.messages, { inRange: "value must be in range ]1, 4]" });
  t.end();
});

test("Excluded max with inrange rule", t => {
  const rule = new InRangeRule(1, 4, limits.includeLower);
  const answer = { value: 4 };
  const result = rule.execute(answer);
  t.deepEqual(result.messages, { inRange: "value must be in range [1, 4[" });
  t.end();
});

test("All limits excluded with inrange rule", t => {
  const rule = new InRangeRule(1, 4);
  const answer = { value: 4 };
  const result = rule.execute(answer);
  t.deepEqual(result.messages, { inRange: "value must be in range ]1, 4[" });
  t.end();
});

test("Text length rule", t => {
  const rule = new MaxLengthRule(10);
  t.deepEqual(rule.execute({ value: "Je suis un test trop long" }).messages, {
    maxLength: "Text must be less than 10 characters long",
  });
  t.end();
});

test("Text length on empty value", t => {
  const rule = new MaxLengthRule(10);
  t.false("messages" in rule.execute({ value: "" }));
  t.end();
});

test("Text length rule change nothing", t => {
  const rule = new MaxLengthRule(10);
  const answer = { value: "pain" };
  const result = rule.execute(answer);
  t.equal(result, answer);
  t.false("messages" in result);
  t.end();
});

test("Text length rule with existing message", t => {
  const rule = new MaxLengthRule(10);
  const answer = {
    value: "Je suis un text trop long",
    messages: { maxLength: "Text must be less than 10 characters long" },
  };
  const result = rule.execute(answer);
  t.equal(result, answer);
  t.deepEqual(result.messages, {
    maxLength: "Text must be less than 10 characters long",
  });
  t.end();
});

test("Text letter case rule", t => {
  const rule = new LetterCaseRule("upper");
  const answer = { value: "Je suis un text" };
  const result = rule.execute(answer);
  t.equal(result.value, "JE SUIS UN TEXT");
  t.end();
});

test("Decimal part length rule fails", t => {
  const rule = new DecimalPrecisionRule(3);
  const answer = {
    value: 3.2345,
  };
  const result = rule.execute(answer);
  t.notEqual(result, answer);
  t.false(result.messages);
  t.equal(result.value, 3.235);
  t.end();
});

test("Decimal part length rule succeed", t => {
  const rule = new DecimalPrecisionRule(3);
  const answer = {
    value: 3.234,
  };
  const result = rule.execute(answer);
  t.equal(result, answer);
  t.false("messages" in result);
  t.end();
});

test("Decimal part when undefined", t => {
  const rule = new DecimalPrecisionRule(3);
  const answer = {
    value: undefined,
  };
  const result = rule.execute(answer as unknown as { value: number });
  t.equal(result, answer);
  t.true(result.value == undefined);
  t.end();
});

test("Fixed length rule succeed", t => {
  const rule = new FixedLengthRule(2);
  const answer = {
    value: "AL",
  };
  const result = rule.execute(answer);
  t.equal(result, answer);
  t.false("messages" in result);
  t.end();
});

test("Fixed length rule fail with too long value", t => {
  const rule = new FixedLengthRule(2);
  const answer = {
    value: "ALEX",
  };
  const result = rule.execute(answer);
  t.notEqual(result, answer);
  t.deepEqual(result.messages, { fixedLength: "text length must be 2" });
  t.end();
});

test("Fixed length rule fail with too short value", t => {
  const rule = new FixedLengthRule(2);
  const answer = {
    value: "A",
  };
  const result = rule.execute(answer);
  t.notEqual(result, answer);
  t.deepEqual(result.messages, { fixedLength: "text length must be 2" });
  t.end();
});

test("Fixed length rule with undefined value", t => {
  const rule = new FixedLengthRule(2);
  const answer = {
    value: undefined,
  };
  const result = rule.execute(answer as unknown as { value: string });
  t.notEqual(result, answer);
  t.deepEqual(result.messages, { fixedLength: "text length must be 2" });
  t.end();
});

test("Changing range limits with constraint failure", t => {
  const rule = new InRangeRule(new Date("2021-02-03"), new Date("2021-02-13"));
  const answer = {
    value: new Date("2021-01-14"),
    messages: { inRange: "value must be in range [2021-02-03, 2021-02-10]" },
  };
  const result = rule.execute(answer);
  t.equal(
    result.messages?.inRange,
    "value must be in range ]2021-02-03, 2021-02-13["
  );
  t.end();
});

test("Changing range limits with constraint success", t => {
  const rule = new InRangeRule(new Date("2021-02-03"), new Date("2021-02-13"));
  const answer = {
    value: new Date("2021-02-11"),
    messages: { inRange: "value must be in range [2021-02-03, 2021-02-10]" },
  };
  const result = rule.execute(answer);
  t.deepEqual(result.messages, {});
  t.end();
});

test("A critical rule is raised when an item as a value #275", t => {
  const rule = new CriticalRule("ae");
  const result1 = rule.execute({ value: undefined });
  t.false(result1.messages?.critical);
  const result2 = rule.execute({ value: 1 });
  t.equal(result2.messages?.critical, "ae");
  t.end();
});

test("A critical rule is raised when an item as one of the given values #275", t => {
  const rule = new CriticalRule("ae", "ae", 2, 3);
  const result1 = rule.execute({ value: 1 });
  t.false(result1.messages?.critical);
  const result2 = rule.execute({ value: 2 });
  t.equal(result2.messages?.critical, "ae");
  const result3 = rule.execute({ value: 3 });
  t.equal(result3.messages?.critical, "ae");
  t.end();
});

test("A critical rule is unraised when an item value changes #275", t => {
  const rule = new CriticalRule("ae", "ae", 2, 3);
  const result1 = rule.execute({ value: 1, messages: { critical: "ae" } });
  t.false(result1.messages?.critical);
  t.end();
});

test("Add message with notification event", t => {
  const rule = new CriticalRule("ae", "événement indésirable");
  const result1 = rule.execute({ value: 1 });
  t.equal(result1.messages?.critical, "ae");
  t.equal(rule.message, "événement indésirable");
  t.end();
});
