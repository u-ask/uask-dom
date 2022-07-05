import test from "tape";
import { ParticipantBuilder } from "./participantbuilder.js";
import * as state from "./state.test.js";
import {
  Interview,
  Participant,
  Page,
  Survey,
  PageSet,
  Sample,
  DomainCollection,
} from "../domain/index.js";
import { InterviewBuilder } from "./interviewbuilder.js";

test("Participant creation", t => {
  const participantBuilder = new ParticipantBuilder(
    state.currentSurvey,
    "0003",
    new Sample("AA")
  );
  participantBuilder.interview(state.currentPageSet);
  const participant = participantBuilder.build();
  t.equal(participant.participantCode, "0003");
  t.equal(participant.sample.sampleCode, "AA");
  t.end();
});

test("Build a participant with participantCode and sampleCode", t => {
  const participantBuilder = new ParticipantBuilder(
    state.currentSurvey,
    DomainCollection(new Sample("032"))
  );
  participantBuilder.init("0001", "032");
  const participant = participantBuilder.build();
  t.equal(participant.participantCode, "0001");
  t.equal(participant.sample.sampleCode, "032");
  t.end();
});

test("Update participant with new interview", t => {
  const state0 = changeState0();
  t.notEqual(state0.currentParticipant, state.currentParticipant);
  t.equal(state0.currentParticipant.interviews[0].items.length, 5);
  t.end();
});

test("Update participant with updated interview", t => {
  const state0 = changeState0();
  const state1 = changeState1(state0);
  t.equal(
    state1.currentParticipant.interviews.length,
    state0.currentParticipant.interviews.length
  );
  t.end();
});

test("Update participant with same pageSet 2", t => {
  const state0 = changeState0();
  const state1 = changeState1(state0);
  const state2 = changeState1(state1);
  t.equal(state2.currentInterview, state1.currentInterview);
  t.end();
});

test("Interview creation", t => {
  const state0 = changeState0();

  const interviewBuilder1 = new InterviewBuilder(
    state0.currentSurvey,
    state0.currentSurvey.pageSets[1]
  );
  interviewBuilder1
    .item(state0.currentPageSet.pages[0].items[0])
    .value(true)
    .item(state0.currentPageSet.pages[0].items[1])
    .value(false)
    .item(state0.currentPageSet.pages[0].items[2])
    .value(3)
    .item(state0.currentPageSet.pages[1].items[0])
    .value(4)
    .item(state0.currentPageSet.pages[1].items[1])
    .value(true);
  const interview1 = interviewBuilder1.build([]);

  const interviewBuilder2 = new InterviewBuilder(
    state0.currentSurvey,
    state0.currentSurvey.pageSets[1]
  );
  const interview2 = interviewBuilder2.build([]);

  const participant = new ParticipantBuilder(state0.currentSurvey, state0.currentParticipant)
    .interview(interview1)
    .interview(interview2)
    .build();

  t.equal(participant.interviews.length, 3);
  t.end();
});

test("Create interview with pageSet.type", t => {
  const builder = new ParticipantBuilder(state.currentSurvey, state.currentParticipant);
  const pageSet = state.currentPageSet;
  builder.interview(pageSet.type);
  const participant = builder.build();
  t.equal(participant.interviews[0].pageSet.type, pageSet.type);
  t.end();
});

test("Create interview with last input Date", t => {
  const builder = new ParticipantBuilder(state.currentSurvey, state.currentParticipant);
  const pageSet = state.currentPageSet;
  const date = new Date();
  builder.interview(pageSet.type, 1234, date);
  const participant = builder.build();
  t.equal(participant.interviews[0].nonce, 1234);
  t.equal(participant.interviews[0].lastInput, date);
  t.end();
});

function changeState1(state0: {
  currentParticipant: Participant;
  currentInterview: Interview;
  currentSurvey: Survey;
  currentPageSet: PageSet;
  currentPage: Page;
}) {
  const interviewBuilder = new InterviewBuilder(
    state0.currentSurvey,
    state0.currentInterview
  ).init(3351754685201, new Date());
  const interview1 = interviewBuilder.build([]);
  interviewBuilder.item(state0.currentPage.items[0]);
  const participantBuilder = new ParticipantBuilder(
    state0.currentSurvey,
    state0.currentParticipant
  );
  participantBuilder.interview(interview1);
  const participant1 = participantBuilder.build();
  return {
    ...state0,
    currentParticipant: participant1,
    currentInterview: participant1.interviews[0],
  };
}

function changeState0() {
  const participantBuilder = new ParticipantBuilder(
    state.currentSurvey,
    state.currentParticipant
  );
  participantBuilder.interview(state.currentPageSet);
  const participant = participantBuilder.build();
  return {
    ...state,
    currentParticipant: participant,
    currentInterview: participant.interviews[0],
  };
}
