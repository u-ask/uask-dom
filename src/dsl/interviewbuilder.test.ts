import test from "tape";
import { InterviewBuilder } from "./interviewbuilder.js";
import * as state from "./state.test.js";
import {
  Interview,
  Survey,
  PageSet,
  Page,
  Participant,
  getItem,
  RuleMessages,
} from "../domain/index.js";

test("Create non existing interview", t => {
  const { currentInterview } = changeState0();
  t.notEqual(currentInterview, state.currentInterview);
  t.true(currentInterview.items[0].value);
  t.deepEqual(currentInterview.items[2].value, new Date(2010, 7));
  t.end();
});

test("Create interview with known nonce and last input", t => {
  const nonce = Math.random();
  const lastInput = new Date();
  const currentInterview = new InterviewBuilder(
    state.currentSurvey,
    state.currentPageSet
  )
    .init(nonce, lastInput)
    .build([]);
  t.equal(currentInterview.nonce, nonce);
  t.equal(currentInterview.lastInput, lastInput);
  t.end();
});

test("Update existing interview", t => {
  const state0 = changeState0();
  const state1 = changeState1(state0);
  t.notEqual(state1.currentInterview, state0.currentInterview);
  t.false(state1.currentInterview.items[0].value);
  t.deepEqual(state1.currentInterview.items[2].value, new Date(2010, 7));
  t.end();
});

test("Update but no change", t => {
  const state0 = changeState0();
  const interviewBuilder = new InterviewBuilder(
    state0.currentSurvey,
    state0.currentInterview
  );
  const data = getAnswers(state0);
  const interview = interviewBuilder.items([...data]).build([]);
  t.equal(interview, state0.currentInterview);
  t.end();
});

test("Update existing interview with answer with specialValue", t => {
  const builder = new InterviewBuilder(
    state.currentSurvey,
    state.currentPageSet
  );
  builder.item({
    pageItem: state.currentPageSet.pages[0].items[0],
    specialValue: "notDone",
  });
  const interview = builder.build([]);
  t.deepEqual(interview.items[0].value, undefined);
  t.deepEqual(interview.items[0].specialValue, "notDone");
  t.end();
});

test("Create item with variableName", t => {
  const builder = new InterviewBuilder(
    state.currentSurvey,
    state.currentPageSet
  );
  const item = getItem(state.currentPageSet.pages[0].items[0]);
  builder.item(item.variableName).value(false);
  const interview = builder.build([]);
  t.equal(interview.items[0].value, 0);
  t.end();
});

test("Create interview date no change", t => {
  const builder = new InterviewBuilder(
    state.currentSurvey,
    state.currentPageSet
  );
  const date = new Date();
  builder.init(123, date);
  builder.build([]);
  const item = getItem(state.currentPageSet.pages[0].items[0]);
  builder.item(item).specialValue("notApplicable");
  const updated = builder.build([]);
  t.equal(updated.lastInput, date);
  t.end();
});

test("Initialize new interview", t => {
  const state0 = changeState0();
  const state1 = changeState1(state0);
  const interview2 = new InterviewBuilder(
    state1.currentSurvey,
    state1.currentSurvey.pageSets[1]
  ).build([state1.currentInterview]);
  const dysp = interview2.items[0];
  t.equal(dysp.value, 2);
  t.end();
});

test("Interview last input date updated", async t => {
  const state0 = changeState0();
  await new Promise(r => setTimeout(r, 100));
  const state1 = changeState1(state0);
  t.ok(state1.currentInterview.lastInput > state0.currentInterview.lastInput);
});

test("Multiple instance items build #168", t => {
  const builder = new InterviewBuilder(
    state.currentSurvey,
    state.currentPageSet
  );
  const item = getItem(state.currentPageSet.pages[0].items[0]);
  builder.item(item.variableName).value(false);
  builder.item(item.variableName, 2).value(true);
  const interview = builder.build([]);
  const items = interview.items.filter(
    i => i.pageItem.variableName == item.variableName
  );
  t.equal(items[0].value, 0);
  t.equal(items[1].value, 1);
  t.equal(interview.nextInstance(items[0]), items[1]);
  t.equal(items[0].pageItem.nextInstance(), items[1].pageItem);
  t.end();
});

function changeState0() {
  const data = getAnswers(state);
  data[0].value = true;
  data[1].value = true;
  data[2].value = new Date(2010, 7);
  const interviewBuilder = new InterviewBuilder(
    state.currentSurvey,
    state.currentPageSet
  );
  interviewBuilder.items([...data]);
  const interview = interviewBuilder.build([]);
  return { ...state, currentInterview: interview };
}

function changeState1(state0: {
  currentInterview: Interview;
  currentSurvey: Survey;
  currentPageSet: PageSet;
  currentPage: Page;
  currentParticipant: Participant;
}) {
  const data = getAnswers(state0);
  data[0].value = false;
  data[3].value = 2;
  const interviewBuilder = new InterviewBuilder(
    state0.currentSurvey,
    state0.currentInterview
  );
  interviewBuilder.items([...data]);
  const updated = interviewBuilder.build([]);
  return { ...state0, currentInterview: updated };
}

function getAnswers(state: {
  currentInterview: Interview;
  currentPageSet: PageSet;
}) {
  return state.currentPageSet.items.map(q => {
    const a = state.currentInterview?.items.find(a => a.pageItem == q);
    return {
      variableName: getItem(q).variableName,
      value: a?.value,
      unit: a?.unit,
      specialValue: a?.specialValue,
      context: 0,
      messages: {} as RuleMessages,
    };
  });
}
