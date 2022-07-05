import test from "tape";
import { InterviewItem } from "../interviewitem.js";
import { ItemTypes } from "../itemtypes.js";
import { PageItem } from "../pageitem.js";
import { HasValue, setMessageIf, update } from "./rule.js";

test("Merge valid with existing message", t => {
  const message = "value is required";
  const messages = { required: message };
  const result = setMessageIf(false)(messages, "required", message);
  t.deepEqual(result, {});
  t.end();
});

test("Merge valid with non existing message", t => {
  const message = "value is required";
  const messages = {};
  const result = setMessageIf(false)(messages, "required", message);
  t.equal(result, messages);
  t.end();
});

test("Merge valid with undefined messages", t => {
  const message = "value is required";
  const messages = undefined;
  const result = setMessageIf(false)(messages, "required", message);
  t.equal(result, messages);
  t.end();
});

test("Merge invalid with existing message", t => {
  const message = "value is required";
  const messages = { required: message };
  const result = setMessageIf(true)(messages, "required", message);
  t.equal(result, messages);
  t.end();
});

test("Merge invalid with non existing message", t => {
  const message = "value is required";
  const messages = {};
  const result = setMessageIf(true)(messages, "required", message);
  t.deepEqual(result, { required: message });
  t.end();
});

test("Merge invalid with undefined messages", t => {
  const message = "value is required";
  const messages = undefined;
  const result = setMessageIf(true)(messages, "required", message);
  t.deepLooseEqual(result, { required: message });
  t.end();
});

test("Update value item with message array", t => {
  const item = update(
    { value: undefined },
    { messages: { required: "value is required" } }
  );
  t.deepEqual(item.messages, { required: "value is required" });
  t.end();
});

test("Update interview item with message", t => {
  const pageItem = new PageItem("Item", "ITEM", ItemTypes.info);
  const item = update(
    new InterviewItem(pageItem, undefined, { specialValue: "notApplicable" }),
    { messages: { required: "value is required" } }
  );
  t.deepEqual(item.messages, { required: "value is required" });
  t.end();
});

test("Update with status", t => {
  const pageItem = new PageItem("Item", "ITEM", ItemTypes.info);
  const interviewItem = new InterviewItem(pageItem, undefined, {
    specialValue: "notApplicable",
  });
  const result = update(interviewItem, {
    status: "fullfilled",
  } as HasValue);
  t.equal(result, interviewItem);
  t.end();
});
