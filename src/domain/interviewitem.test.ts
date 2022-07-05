import test from "tape";
import { InterviewItem } from "./interviewitem.js";
import { PageItem } from "./pageitem.js";
import { ItemTypes } from "./itemtypes.js";
import { DomainCollection } from "./domaincollection.js";
import { InRangeRule, limits, RequiredRule, UnitRule } from "./rule/unitrule.js";
import { execute, unitToCrossRules } from "./rule/crossrule.js";
import { Scope } from "./scope.js";
import { getTranslation } from "./domain.js";

test("Interview item construction", t => {
  const item = new PageItem(
    "Was the participant included?",
    "ISPATV1",
    ItemTypes.yesno
  );
  const answer = new InterviewItem(item, true);
  t.equal(answer.pageItem, item);
  t.equal(answer.context, 0);
  t.end();
});

test("Interview item with context construction", t => {
  const pageItem = new PageItem(
    "Was the participant included?",
    "ISPATV1",
    ItemTypes.yesno
  );
  const answer = new InterviewItem({ pageItem, context: 1 }, true);
  t.equal(answer.pageItem, pageItem);
  t.equal(answer.context, 1);
  t.end();
});

test("Interview item has messages", t => {
  const item = new PageItem(
    "Was the participant included?",
    "ISPATV1",
    ItemTypes.yesno
  );
  const answer = new InterviewItem(item, true, {
    messages: { required: "error" },
  });
  t.equal(answer.messages.required, "error");
  t.end();
});

test("Interview item status should be fulfilled", t => {
  const pageItem2 = new PageItem("Q?", "Q", ItemTypes.integer);
  const answer1 = new InterviewItem(pageItem2, 1);
  t.equal(answer1.status, "fulfilled");
  const answer2 = new InterviewItem(pageItem2, [1, 2, 3]);
  t.equal(answer2.status, "fulfilled");
  t.end();
});

test("Interview item status should be fulfilled when false", t => {
  const pageItem1 = new PageItem("Q?", "Q", ItemTypes.yesno);
  const answer1 = new InterviewItem(pageItem1, false);
  t.equal(answer1.status, "fulfilled");
  t.end();
});

test("Interview item status should be missing", t => {
  const pageItem1 = new PageItem("Q?", "Q", ItemTypes.choice("many", "A", "B"));
  const answer1 = new InterviewItem(pageItem1, undefined);
  t.equal(answer1.status, "missing");
  const answer2 = new InterviewItem(pageItem1, "");
  t.equal(answer2.status, "missing");
  const answer3 = new InterviewItem(pageItem1, []);
  t.equal(answer3.status, "missing");
  t.end();
});

test("Interview item may have different types", t => {
  const boolPageItem = new PageItem(
    "Was the participant included?",
    "ISPATV1",
    ItemTypes.yesno
  );
  const boolAnswer = new InterviewItem(boolPageItem, true);
  t.equal(boolAnswer.value, 1);
  const datePageItem = new PageItem(
    "When the participant included?",
    "WHPATV1",
    ItemTypes.date(false)
  );
  const dateAnswer = new InterviewItem(datePageItem, new Date());
  t.true(typeof dateAnswer.value, "Date");
  t.end();
});

test("Interview item with unit", t => {
  const item = new PageItem("DLCO", "DLCO", ItemTypes.real, {
    units: { values: ["ml", "mmHg", "mn"], isExtendable: false },
  });
  const answer1 = new InterviewItem(item, 6, {
    unit: "ml",
  });
  t.equal(answer1.unit, "ml");
  t.equal(answer1.status, "fulfilled");
  const answer2 = new InterviewItem(item, 6);
  t.equal(answer2.status, "missing");
  t.end();
});

test("Interview item with special value", t => {
  const item = new PageItem(
    "Clarify why the event is unexpected ?",
    "CLARIFY",
    ItemTypes.text
  );
  const answer = new InterviewItem(item, undefined, {
    specialValue: "unknown",
  });
  t.equal(answer.specialValue, "unknown");
  t.equal(answer.status, "fulfilled");
  t.end();
});

test("Interview item update", t => {
  const item = new PageItem(
    "Was the participant included?",
    "ISPATV1",
    ItemTypes.yesno
  );
  const answer = new InterviewItem(item, true);
  const copy = answer.update({});
  t.equal(copy, answer);
  const updated = answer.update({ value: false });
  t.notEqual(updated.value, answer.value);
  t.end();
});

test("Interview item with validation", t => {
  const item = new PageItem("Question range", "QRANGE", ItemTypes.integer, {
    rules: DomainCollection<UnitRule>(
      new RequiredRule(),
      new InRangeRule(1, 4, limits.includeBoth)
    ),
  });
  const answer1 = new InterviewItem(item, undefined);
  const crossRules = unitToCrossRules(item);
  const global = Scope.create([]);
  t.deepEqual(execute(crossRules, global.with([answer1])).items[0].messages, {
    required: "value is required",
  });
  const answer2 = new InterviewItem(item, 0);
  t.deepEqual(execute(crossRules, global.with([answer2])).items[0].messages, {
    inRange: "value must be in range [1, 4]",
  });
  const answer3 = new InterviewItem(item, 3);
  t.deepEqual(
    execute(crossRules, global.with([answer3])).items[0].messages,
    {}
  );
  t.end();
});

test("Interview item fully updated", t => {
  const pageItem = new PageItem(
    "Was the participant included?",
    "ISPATV1",
    ItemTypes.yesno
  );
  const answer0 = new InterviewItem(pageItem, true);
  const answer1 = { pageItem, value: true };
  const answer2 = new InterviewItem(pageItem, false);
  t.equal(answer0.update(answer1), answer0);
  t.equal(answer0.update(answer2), answer2);
  t.end();
});

test("Information does not have a status", t => {
  const pageItem = new PageItem("Info", "INFO", ItemTypes.info);
  const item = new InterviewItem(pageItem, undefined);
  t.equal(item.status, "info");
  t.end();
});

test("Choice label", t => {
  const pageItem = new PageItem(
    "Color",
    "COL",
    ItemTypes.choice("one", "R", "G", "B")
      .lang("en")
      .wording("red", "green", "blue")
      .translate("fr", "rouge", "vert", "bleu")
  );
  const item = new InterviewItem(pageItem, "R");
  t.equal(item.label("en"), "red");
  t.equal(item.label("fr"), "rouge");
  t.end();
});

test("Context label", t => {
  const pageItem = new PageItem(
    "Color",
    "COL",
    ItemTypes.context([
      ItemTypes.yesno,
      ItemTypes.choice("one", "R", "G", "B")
        .lang("en")
        .wording("red", "green", "blue")
        .translate("fr", "rouge", "vert", "bleu"),
    ])
  );
  const item1 = new InterviewItem(pageItem, 1);
  t.equal(item1.label("en"), "Yes");
  t.equal(item1.label("fr"), "Oui");
  const item2 = new InterviewItem(pageItem, "R", { context: 1 });
  t.equal(item2.label("en"), "red");
  t.equal(item2.label("fr"), "rouge");
  t.end();
});

test("Interview item with contextual wording", t => {
  const pageItem = new PageItem(["W1", "W2"], "V", ItemTypes.yesno);
  const interviewitem = new InterviewItem(pageItem, "A");
  t.equal(interviewitem.wording, "W1");
  t.equal(interviewitem.update({ context: 1 }).wording, "W2");
  t.end();
});

test("Interview item update with same messages content", t => {
  const pageItem = new PageItem("Q?", "Q", ItemTypes.yesno);
  const interviewItem = new InterviewItem(pageItem, undefined, {
    messages: { required: "value is required" },
  });
  const updated0 = interviewItem.update({
    messages: { required: "value is required" },
  });
  t.equal(updated0, interviewItem);
  const updated1 = interviewItem.update({
    value: true,
    messages: { required: "value is required" },
  });
  t.notEqual(updated1, interviewItem);
  t.equal(updated1.messages, interviewItem.messages);
  t.end();
});

test("Interview item update with same acknowloedged messages", t => {
  const pageItem = new PageItem("Q?", "Q", ItemTypes.yesno);
  const interviewItem = new InterviewItem(pageItem, undefined, {
    messages: { required: "value is required", __acknowledged: ["required"] },
  });
  const updated0 = interviewItem.update({
    messages: { required: "value is required", __acknowledged: ["required"] },
  });
  t.equal(updated0, interviewItem);
  t.end();
});

test("Interview item with alert", t => {
  const pageItem = new PageItem("Q?", "Q", ItemTypes.yesno);
  const interviewItem0 = new InterviewItem(pageItem, undefined, {
    messages: { required: "value is required", inRange: "out of range" },
  });
  t.deepEqual(interviewItem0.alerts, ["value is required", "out of range"]);
  t.deepEqual(interviewItem0.acknowledgements, []);
  const interviewItem1 = interviewItem0.acknowledge("required", "inRange");
  t.deepEqual(interviewItem1.alerts, []);
  t.deepEqual(interviewItem1.acknowledgements, [
    "value is required",
    "out of range",
  ]);
  const interviewItem2 = interviewItem1.reiterate("inRange");
  t.deepEqual(interviewItem2.alerts, ["out of range"]);
  t.deepEqual(interviewItem2.acknowledgements, ["value is required"]);
  const interviewItem3 = interviewItem2.reiterate("required");
  t.deepEqual(interviewItem3.alerts, ["value is required", "out of range"]);
  t.deepEqual(interviewItem3.acknowledgements, []);
  t.end();
});

test("Interview item label cases #121#127", t => {
  const pageItem = new PageItem("Q", "V", ItemTypes.integer);
  t.equal(new InterviewItem(pageItem, undefined).label(), undefined);
  t.equal(
    new InterviewItem(pageItem, undefined, {
      specialValue: "notApplicable",
    }).label(),
    "notApplicable"
  );
  t.equal(new InterviewItem(pageItem, 1).label(), "1");
  t.equal(new InterviewItem(pageItem, 1, { unit: "cm" }).label(), "1 cm");
  t.end();
});

test("Difference after item creation #121", t => {
  const pageItem = new PageItem("Q", "V", ItemTypes.text);
  const interviewItem = new InterviewItem(pageItem, "A");
  const record = interviewItem.diff(undefined);
  t.equal(record.operation, undefined);
  t.end();
});

test("Difference after acknowledgement #132", t => {
  const pageItem = new PageItem("Q", "V", ItemTypes.text);
  const interviewItem = new InterviewItem(pageItem, "A", {
    messages: { required: "value is required" },
  });
  const acknowleged = interviewItem.acknowledge("required");
  const record = acknowleged.diff(interviewItem);
  t.equal(getTranslation(record.operation), "acknowledge (value is required)");
  t.end();
});

test("Difference after reiteration #132", t => {
  const pageItem = new PageItem("Q", "V", ItemTypes.text);
  const interviewItem = new InterviewItem(pageItem, "A", {
    messages: { required: "value is required", __acknowledged: ["required"] },
  });
  const acknowleged = interviewItem.reiterate("required");
  const record = acknowleged.diff(interviewItem);
  t.equal(getTranslation(record.operation), "reiterate (value is required)");
  t.end();
});

test("Interview item label for multiple choices #283", t => {
  const choices = ItemTypes.choice("many", "1", "2", "3").wording(
    "A",
    "B",
    "C"
  );
  const pageItem = new PageItem("", "", choices);
  const interviewItem = new InterviewItem(pageItem, ["3", "2"]);
  t.equal(interviewItem.label(), "C, B");
  t.end();
});

test("Update with an equivalent value does not change domain", t => {
  const interviewItem = new InterviewItem(
    new PageItem("", "", ItemTypes.yesno),
    true
  );
  t.equal(interviewItem.value, 1);
  const updated = interviewItem.update({ value: true });
  t.equal(updated, interviewItem);
  t.end();
});

test("Interview item with event #275", t => {
  const interviewItem = new InterviewItem(
    new PageItem("", "", ItemTypes.acknowledge),
    1
  );
  t.false(interviewItem.event);
  const raised = interviewItem.update({ messages: { critical: "ae" } });
  t.deepEqual(raised.event, { event: "ae", acknowledged: false });
  const acknowleged = raised.acknowledgeEvent();
  t.deepEqual(acknowleged.event, { event: "ae", acknowledged: true });
  t.end();
});
