import test from "tape";
import { SpecialValue } from "../interviewitem.js";
import { ActivationRule } from "./activationrule.js";

test("Activation rule behavior", t => {
  const enable = ActivationRule.enable("Other");
  t.equal(enable.behavior, "enable");
  const show = ActivationRule.show("Other");
  t.equal(show.behavior, "show");
  t.end();
});

test("Activation rule with active value switch special value to NA", t => {
  const rule = ActivationRule.enable("Other");
  const answer0 = { value: "Comment", specialValue: undefined };
  const result0 = rule.execute({ value: "Specified" }, answer0);
  t.notEqual(result0[1], answer0);
  t.equal(result0[1].specialValue, "notApplicable");
  t.false(result0[1].value);
  t.end();
});

test("Activation rule with one of the multiple active values switch special value to NA", t => {
  const rule = ActivationRule.enable("Other", "Another");
  const answer0 = { value: "Comment", specialValue: undefined };
  const result0 = rule.execute({ value: "Specified" }, answer0);
  t.notEqual(result0[1], answer0);
  t.equal(result0[1].specialValue, "notApplicable");
  t.false(result0[1].value);
  t.end();
});

test("Activation rule with active value remove special value", t => {
  const rule = ActivationRule.enable("Other");
  const answer = {
    value: "Comment",
    specialValue: "notApplicable" as SpecialValue,
  };
  const result = rule.execute({ value: "Other" }, answer);
  t.notEqual(result[1], answer);
  t.false(result[1].specialValue);
  t.false(result[1].messages);
  t.end();
});

test("Activation rule with active value discard special value", t => {
  const rule = ActivationRule.enable("Other");
  const answer1 = {
    value: undefined,
    specialValue: "notApplicable" as SpecialValue,
  };
  const result1 = rule.execute({ value: "Other" }, answer1);
  t.notEqual(result1[1], answer1);
  t.false(result1[1].specialValue);
  t.false(result1[1].messages);
  t.end();
});

test("Activation rule with unactive value discard message", t => {
  const rule = ActivationRule.enable("Other");
  const answer3 = {
    value: undefined,
    specialValue: undefined,
    messages: { required: "value is required" },
  };
  const result3 = rule.execute({ value: "Specified" }, answer3);
  t.deepLooseEqual(result3[1].messages, {});
  t.end();
});

test("Ativation rule without active value change nothing", t => {
  const rule = ActivationRule.enable("Other");
  const answer2 = {
    value: undefined,
    specialValue: "notApplicable" as SpecialValue,
  };
  const result2 = rule.execute({ value: "Specified" }, answer2);
  t.equal(result2[1], answer2);
  t.end();
});

test("Activation rule with active value change nothing", t => {
  const rule = ActivationRule.enable("Other");
  const answer3 = { value: "Comment", specialValue: undefined };
  const result3 = rule.execute({ value: "Other" }, answer3);
  t.equal(result3[1], answer3);
  t.end();
});

test("Activation rule with active value and messages change nothing", t => {
  const rule = ActivationRule.enable("Other");
  const answer3 = {
    value: undefined,
    specialValue: undefined,
    messages: { required: "value is required" },
  };
  const result3 = rule.execute({ value: "Other" }, answer3);
  t.equal(result3[1], answer3);
  t.end();
});

test("Activation rule with one of the multiple active values change nothing", t => {
  const rule = ActivationRule.enable("Other", "Another");
  const answer3 = {
    value: undefined,
    specialValue: undefined,
    messages: { required: "value is required" },
  };
  const result3 = rule.execute({ value: "Other" }, answer3);
  t.equal(result3[1], answer3);
  const answer4 = {
    value: undefined,
    specialValue: undefined,
    messages: { required: "value is required" },
  };
  const result4 = rule.execute({ value: "Another" }, answer4);
  t.equal(result4[1], answer4);
  t.end();
});

test("Activation rule with special value", t => {
  const rule = ActivationRule.enable("Other");
  const answer1 = {
    value: undefined,
    specialValue: "notDone" as SpecialValue,
  };
  const result1 = rule.execute({ value: "Other" }, answer1);
  t.equal(result1[1], answer1);
  t.equal(result1[1].specialValue, "notDone");
  t.false(result1[1].messages);
  t.end();
});

test("Activation rule should empty units", t => {
  const rule = ActivationRule.enable("Units");
  const item = {
    value: 12,
    unit: "kg",
  };
  const result = rule.execute({ value: "Clear" }, item);
  t.false(result[1].unit);
  t.end();
});
