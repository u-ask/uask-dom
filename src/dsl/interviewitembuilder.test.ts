import test from "tape";
import * as state from "./state.test.js";
import { InterviewBuilder } from "./interviewbuilder.js";
import { InterviewItemBuilder, undefinedTag } from "./interviewitembuilder.js";
import {
  getItem,
  InterviewItem,
  ItemTypes,
  PageItem,
} from "../domain/index.js";

test("Build item", t => {
  const interviewItemBuilder = new InterviewItemBuilder(
    state.currentSurvey,
    getItem(state.currentPageSet.pages[0].items[0])
  ).value(true);
  const item = interviewItemBuilder.build();
  const pageItem = new PageItem(
    " -> Is the participant exposed to gases, fumes, vapors, dust ?",
    "EXP",
    ItemTypes.yesno
  );
  t.equal(item.pageItem.wording, pageItem.wording);
  t.equal(item.pageItem.variableName, pageItem.variableName);
  t.equal(item.type, pageItem.type);
  t.equal(item.value, 1);
  t.end();
});

test("Interview item builder fluent", t => {
  const interviewItemBuilder = new InterviewItemBuilder(
    state.currentSurvey,
    getItem(state.currentPageSet.pages[0].items[0]),
    new InterviewBuilder(state.currentSurvey, state.currentPageSet)
  )
    .item(state.currentPageSet.pages[0].items[0])
    .value(true);

  const item = interviewItemBuilder.build();

  t.deepEqual(item.pageItem, state.currentPageSet.pages[0].items[0]);
  t.equal(item.value, 1);
  t.end();
});

test("Interview item builder not fluent", t => {
  const interviewItemBuilder = new InterviewItemBuilder(
    state.currentSurvey,
    getItem(state.currentPageSet.pages[0].items[0])
  );
  t.throws(() => interviewItemBuilder.item(""));
  t.end();
});

test("Interview item builder with fluent api", t => {
  const itemBuilder = new InterviewItemBuilder(
    state.currentSurvey,
    getItem(state.currentPageSet.pages[1].items[0])
  )
    .value(1.3)
    .unit("mg");
  const item = itemBuilder.build();
  t.equal(item.pageItem, getItem(state.currentPageSet.pages[1].items[0]));
  t.equal(item.value, 1.3);
  t.equal(item.unit, "mg");
  t.end();
});

test("Interview item builder with special value", t => {
  const itemBuilder = new InterviewItemBuilder(
    state.currentSurvey,
    getItem(state.currentPageSet.pages[0].items[0])
  )
    .specialValue("notApplicable")
    .messages({ required: "value is required", inRange: "out of range" })
    .context(1);
  const item = itemBuilder.build();
  t.equal(item.specialValue, "notApplicable");
  t.deepEqual(item.messages, {
    required: "value is required",
    inRange: "out of range",
  });
  t.end();
});

test("Interview item update no change", t => {
  const interviewItem = new InterviewItem(
    getItem(state.currentPageSet.pages[0].items[0]),
    1,
    {
      messages: {
        required: "value is required",
        inRange: "out of range",
      },
    }
  );
  const itemBuilder = new InterviewItemBuilder(
    state.currentSurvey,
    interviewItem
  ).messages({ required: "value is required", inRange: "out of range" });
  const item = itemBuilder.build();
  t.equal(item, interviewItem);
  t.end();
});

test("Interview item update messages change", t => {
  const interviewItem = new InterviewItem(
    getItem(state.currentPageSet.pages[0].items[0]),
    1,
    {
      messages: {
        required: "value is required",
        inRange: "out of range",
      },
    }
  );
  const itemBuilder = new InterviewItemBuilder(
    state.currentSurvey,
    interviewItem
  ).messages({ inRange: "out of range" });
  const item = itemBuilder.build();
  t.notEqual(item, interviewItem);
  t.deepEqual(item.messages, { inRange: "out of range" });
  t.end();
});

test("Interview item date type as number", t => {
  const pageItem = new PageItem("A date", "D", ItemTypes.date());
  const date = new Date();
  const itemBuilder = new InterviewItemBuilder(
    state.currentSurvey,
    pageItem
  ).value(date.getTime());
  const item = itemBuilder.build();
  t.deepEqual(item.value, date);
  t.end();
});

test("Interview item date type as string", t => {
  const pageItem = new PageItem("A date", "D", ItemTypes.date());
  const itemBuilder = new InterviewItemBuilder(
    state.currentSurvey,
    pageItem
  ).value("2021-02-04");
  const item = itemBuilder.build();
  t.deepEqual(item.value, new Date("2021-02-04"));
  t.end();
});

test("Interview item undefined update", t => {
  const pageItem = new PageItem(
    "If other, which localization",
    "LEGLOCOTHER",
    ItemTypes.text
  );
  const interviewItemBuilder = new InterviewItemBuilder(
    state.currentSurvey,
    pageItem
  ).value("test");
  t.equal(interviewItemBuilder.build().value, "test");
  const emptyInterviewItemBuilder = interviewItemBuilder.value(undefined);
  t.equal(emptyInterviewItemBuilder.build().value, undefined);
  t.end();
});

test("Interview item undefined unit update", t => {
  const pageItem = new PageItem("How much ?", "H", ItemTypes.real, {
    units: ["€", "$"],
  });
  const interviewItemBuilder = new InterviewItemBuilder(
    state.currentSurvey,
    pageItem
  )
    .value(1)
    .unit("€");
  t.equal(interviewItemBuilder.build().unit, "€");
  const emptyInterviewItemBuilder = interviewItemBuilder.unit(undefined);
  t.equal(emptyInterviewItemBuilder.build().unit, undefined);
  t.end();
});

test("Interview item undefined create", t => {
  const pageItem = new PageItem(
    "If other, which localization",
    "LEGLOCOTHER",
    ItemTypes.text
  );
  const interviewItemBuilder = new InterviewItemBuilder(
    state.currentSurvey,
    pageItem
  ).value(undefined);
  t.true(typeof interviewItemBuilder.build().value == "undefined");
  t.end();
});

test("Interview item date undefined create", t => {
  const pageItem = new PageItem("P1", "P1", ItemTypes.date(false));
  const interviewItemBuilder = new InterviewItemBuilder(
    state.currentSurvey,
    pageItem
  ).value(undefined);
  const item = interviewItemBuilder.build();
  t.equal(item.value, undefined);
  t.end();
});

test("Build items with undefined tag #335", t => {
  const pageItem = new PageItem("P1", "P1", ItemTypes.date(false));
  const interviewItemBuilder = new InterviewItemBuilder(
    state.currentSurvey,
    new InterviewItem(pageItem, new Date())
  );
  interviewItemBuilder.value(undefinedTag);
  const item = interviewItemBuilder.build();
  t.equal(item.value, undefined);
  t.end();
});
