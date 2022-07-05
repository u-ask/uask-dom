import test from "tape";
import { PageSet } from "./pageSet.js";
import { Interview } from "./interview.js";
import { Participant } from "./participant.js";
import { Sample } from "./sample.js";
import { PageItem } from "./pageitem.js";
import { InterviewItem } from "./interviewitem.js";
import { ItemTypes } from "./itemtypes.js";
import { DomainCollection } from "./domaincollection.js";
import { Page } from "./page.js";
import { RequiredRule } from "./rule/unitrule.js";
import { Workflow } from "./workflow.js";
import { SurveyOptions } from "./survey.js";

test("Participant construction", t => {
  const sample = new Sample("032");
  const participant = new Participant("0001", sample);
  t.equal(participant.participantCode, "0001");
  t.equal(participant.sample, sample);
  t.end();
});

test("Participant has interviews", t => {
  const { participant, interview } = buildParticipant();
  t.equal(participant.interviews[0], interview);
  t.end();
});

test("Participant update", t => {
  const { participant, interview } = buildParticipant();
  const copy = participant.update({});
  t.equal(copy, participant);
  const newSample = new Sample("033");
  const updated = participant.update({ sample: newSample });
  t.equal(updated.sample, newSample);
  t.equal(updated.interviews[0], interview);
  t.end();
});

test("Participant fully update", t => {
  const { participant } = buildParticipant();
  const updated0 = participant.update({ sample: new Sample("033") });
  const updated1 = participant.update(updated0);
  t.equal(updated1, updated0);
  t.end();
});

test("Participant add interview", t => {
  const { participant } = buildParticipant();
  const interview = new Interview(new PageSet("Follow up"), {});
  const updated = participant.update({
    interviews: participant.interviews.append(interview),
  });
  t.equal(updated.interviews.length, 2);
  t.equal(updated.interviews[1], interview);
  t.end();
});

test("Participant update interview", t => {
  const { participant } = buildParticipant();
  const updated = participant.update({
    interviews: participant.interviews.update(i =>
      i.update({
        items: i.items.append(
          new InterviewItem(new PageItem("?", "", ItemTypes.text), undefined)
        ),
      })
    ),
  });
  t.equal(updated.interviews.length, 1);
  t.equal(updated.interviews[0].items.length, 1);
  t.end();
});

test("Participant delete interview", t => {
  const { participant } = buildParticipant();
  const updated = participant.update({
    interviews: participant.interviews.delete(() => true),
  });
  t.equal(updated.interviews.length, 0);
  t.end();
});

test("Participant current interview", t => {
  const { participant0 } = buildAdvancedParticipant();
  const interview2 = new Interview(new PageSet("Follow up 1"), {});
  const updated1 = participant0.update({
    interviews: participant0.interviews.append(interview2),
  });
  const workflow = new Workflow({
    many: updated1.interviews.map(i => i.pageSet),
  });
  t.equal(updated1.currentInterview(workflow), updated1.interviews[0]);
  t.end();
});

test("Participant current interview gives priority in 'insufficient' interview", t => {
  const { participant } = buildWorkflowAndParticipant();
  const interviewsStatus = participant.interviews.map(i => i.status);
  const workflow = new Workflow({
    single: participant.interviews.map(i => i.pageSet),
  });
  t.deepLooseEqual(interviewsStatus, [
    "fulfilled",
    "insufficient",
    "incomplete",
  ]);
  t.equal(participant.currentInterview(workflow).status, "insufficient");
  t.end();
});

test("Participant current interview when all fulfilled", t => {
  const { participant0 } = buildAdvancedParticipant(true);
  const interview2 = new Interview(new PageSet("Follow up 1"), {});
  const updated1 = participant0.update({
    interviews: participant0.interviews.append(interview2),
  });
  const workflow = new Workflow({
    many: updated1.interviews.map(i => i.pageSet),
  });
  t.equal(updated1.currentInterview(workflow), updated1.interviews[1]);
  t.end();
});

test("Participant pin values", t => {
  const { participant, interview } = buildParticipant();
  const item1 = new PageItem(
    "Was the participant included?",
    "ISPATV1",
    ItemTypes.yesno,
    { pin: "included" }
  );
  const item2 = new PageItem("When ?", "WHENV1", ItemTypes.date(false));
  const answer1 = new InterviewItem(item1, true);
  const answer2 = new InterviewItem(item2, new Date());
  const page = new Page("General", {
    includes: DomainCollection(item1, item2),
  });
  const pageSet0 = interview.pageSet.update({
    pages: interview.pageSet.pages.append(page),
  });
  const participant0 = participant.update({
    interviews: participant.interviews.update(i =>
      i.update({
        pageSet: pageSet0,
        items: i.items.append(answer1, answer2),
      })
    ),
  });
  t.deepLooseEqual(participant0.currentItems(DomainCollection(item1)), [
    answer1,
  ]);
  t.end();
});

test("Test participant with email and phone number", t => {
  const participant = new Participant("0001", new Sample("A"));
  const options = new SurveyOptions();
  const phone = new PageItem("phone", options.phoneVar ?? "", ItemTypes.text);
  const email = new PageItem("email", options.emailVar ?? "", ItemTypes.text);
  t.deepLooseEqual(participant.getValues(phone, email), [undefined, undefined]);
  const interview = new Interview(new PageSet("Inclusion"), options, {
    items: DomainCollection(
      new InterviewItem(phone, "01"),
      new InterviewItem(email, "hello@world.com")
    ),
  });
  const updated = participant.update({
    interviews: DomainCollection(interview),
  });
  t.deepLooseEqual(updated.getValues(phone, email), ["01", "hello@world.com"]);
  t.end();
});

test("Participant lastInput", async t => {
  const { participant } = buildParticipant();
  await new Promise<void>(r =>
    setTimeout(() => {
      const interviewBis = new Interview(new PageSet("Follow up"), {});
      const updatedParticipant = participant.update({
        interviews: participant.interviews.append(interviewBis),
      });
      t.equal(updatedParticipant.lastInput, interviewBis.lastInput);
      r();
    }, 10)
  );
  t.end();
});

test("Participant has alerts", t => {
  const pageItem1 = new PageItem("V1", "V1", ItemTypes.text);
  const pageItem2 = new PageItem("V2", "V2", ItemTypes.text);
  const page = new Page("", {
    includes: DomainCollection(pageItem1, pageItem2),
  });
  const pageSet = new PageSet("", {
    pages: DomainCollection(page),
  });
  const { interview: interview1, itemWithMessage: item1 } =
    makeInterviewWithAlerts(pageItem2, pageItem1, pageSet);
  const { interview: interview2, itemWithMessage: item2 } =
    makeInterviewWithAlerts(pageItem2, pageItem1, pageSet);
  const participant = new Participant("0001", new Sample("A"), {
    interviews: DomainCollection(interview1, interview2),
  });
  const alerts = participant.alerts;
  t.deepLooseEqual(alerts, [
    {
      message: Object.values(item1.messages)[0],
      item: item1,
      interview: interview1,
      tags: undefined,
    },
    {
      message: Object.values(item2.messages)[0],
      item: item2,
      interview: interview2,
      tags: undefined,
    },
  ]);
  t.end();
});

test("Participant with workflow available depends on mandatory pages (case not filled)", t => {
  const { workflow, participant } = buildWorkflowAndParticipant();
  const availablePageSets = participant.availablePageSets(workflow);
  t.deepEqual(availablePageSets, DomainCollection());
  t.end();
});

test("Participant with workflow available depends on mandatory pages (case filled)", t => {
  const { workflow, ps2, participant } = buildWorkflowAndParticipant(true);
  const availablePageSets = participant.availablePageSets(workflow);
  t.deepEqual(availablePageSets, DomainCollection(ps2));
  t.end();
});

test("Participant available interviews", t => {
  const { workflow, participant } = buildWorkflowAndParticipant(true);
  t.deepEqual(
    participant.availableInterviews(workflow),
    participant.interviews
  );
  t.end();
});

test("Participant first page set", t => {
  const { workflow, participant } = buildWorkflowAndParticipant(true);
  t.deepEqual(participant.first(workflow), workflow.info);
  t.end();
});

test("Participant next interview", t => {
  const { workflow, participant, ps2 } = buildWorkflowAndParticipant(true);
  t.deepEqual(
    participant.next(workflow, participant.interviews[0]),
    participant.interviews[1]
  );
  t.deepEqual(
    participant.next(workflow, participant.interviews[1]),
    participant.interviews[2]
  );
  t.deepEqual(participant.next(workflow, participant.interviews[2]), undefined);
  const participant0 = participant.update({
    interviews: participant.interviews.slice(0, 2),
  });
  t.deepEqual(participant0.next(workflow, participant0.interviews[1]), ps2);
  t.end();
});

test("Participant is included", t => {
  const { participant0: participant } = buildAdvancedParticipant(true);
  t.true(participant.included);
  t.end();
});

test("Participant has workflow", t => {
  const { participant0: participant } = buildAdvancedParticipant(true);
  t.true(participant.workflow);
  t.end();
});

test("Participant is not included", t => {
  const { participant0: participant } = buildAdvancedParticipant(false);
  t.false(participant.included);
  t.end();
});

test("Participant is not included when inclusionVar item is not present", t => {
  const { participant } = buildParticipant();
  t.false(participant.included);
  t.end();
});

test("Participant last known values", t => {
  const { participant, pageItem2 } = buildWorkflowAndParticipant(false);
  const item = participant.currentItems(DomainCollection(pageItem2));
  t.equal(item[0]?.value, 1.2);
  t.end();
});

test("Participant last known values before given interview", t => {
  const { participant, pageItem2 } = buildWorkflowAndParticipant(false);
  const item = participant.currentItems(
    DomainCollection(pageItem2),
    participant.interviews[2]
  );
  t.equal(item[0]?.value, 1.1);
  t.end();
});

function makeInterviewWithAlerts(
  pageItem2: PageItem,
  pageItem1: PageItem,
  pageSet: PageSet
) {
  const itemWithMessage = new InterviewItem(pageItem2, undefined, {
    messages: { required: "value is required" },
  });
  const interviewItems = DomainCollection(
    new InterviewItem(pageItem1, new Date()),
    itemWithMessage
  );
  const interview = new Interview(pageSet, {}, { items: interviewItems });
  return { interview, itemWithMessage };
}

function buildParticipant() {
  const sample = new Sample("032");
  const visit = new PageSet("Inclusion");
  const interview = new Interview(visit, {
    workflowVar: "__WORKFLOW",
    inclusionVar: { name: "__INCLUDED", hidden: false },
  });
  const participant = new Participant("0001", sample, {
    interviews: DomainCollection(interview),
  });
  return { participant, interview };
}

function buildAdvancedParticipant(fulfill = false) {
  const { participant, interview } = buildParticipant();
  const workflowItem = new PageItem(
    "workflow ?",
    "__WORKFLOW",
    ItemTypes.acknowledge
  );
  const includedItem = new PageItem(
    "included ?",
    "__INCLUDED",
    ItemTypes.acknowledge
  );
  const item = new PageItem(
    "Was the participant included?",
    "ISPATV1",
    ItemTypes.yesno
  );
  const workflow = new InterviewItem(
    workflowItem,
    fulfill ? "over 50" : undefined
  );
  const included = new InterviewItem(includedItem, fulfill ? true : undefined);
  const answer = new InterviewItem(item, fulfill ? true : undefined);
  const page = new Page("General", {
    includes: DomainCollection(item, includedItem),
  });
  const pageSet0 = interview.pageSet.update({
    pages: interview.pageSet.pages.append(page),
  });
  const participant0 = participant.update({
    interviews: participant.interviews.update(i =>
      i.update({
        pageSet: pageSet0,
        items: i.items.append(workflow, included, answer),
      })
    ),
  });
  return { participant0, pageSet0 };
}

function buildWorkflowAndParticipant(fulfill = false) {
  const pageItem1 = new PageItem("Q1...", "Q1", ItemTypes.text, {
    rules: DomainCollection(new RequiredRule()),
  });
  const pageItem2 = new PageItem("Q2...", "Q2", ItemTypes.real);
  const pageItem3 = new PageItem("Q3...", "Q3", ItemTypes.yesno);
  const page1 = new Page("SAE", {
    includes: DomainCollection(pageItem1, pageItem2, pageItem3),
  });
  const page2 = new Page("Fertility", {
    includes: DomainCollection(pageItem2, pageItem3),
  });
  const ps0 = new PageSet("Information");
  const ps1 = new PageSet("Inclusion", {
    pages: DomainCollection(page1),
    mandatoryPages: DomainCollection(page1),
  });
  const ps2 = new PageSet("Follow up", {
    pages: DomainCollection(page2),
  });
  const workflow = new Workflow({
    info: ps0,
    single: DomainCollection(ps0, ps1),
    sequence: DomainCollection(ps1, ps2),
    many: DomainCollection(ps2),
  });
  const answer = new InterviewItem(pageItem1, fulfill ? true : undefined);
  const answer1 = new InterviewItem(pageItem2, 1.1);
  const answer2 = new InterviewItem(pageItem2, 1.2);
  const interv0 = new Interview(ps0, {});
  const interv1 = new Interview(
    ps1,
    {},
    { items: DomainCollection(answer, answer1) }
  );
  const interv2 = new Interview(ps2, {}, { items: DomainCollection(answer2) });
  const participant = new Participant("0001", new Sample("032"), {
    interviews: DomainCollection(interv0, interv1, interv2),
  });
  return {
    workflow,
    pageItem1,
    pageItem2,
    pageItem3,
    ps0,
    ps1,
    ps2,
    participant,
  };
}
