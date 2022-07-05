import test from "tape";
import "../test-extension.js";
import { Interview } from "./interview.js";
import { InterviewItem } from "./interviewitem.js";
import { PageSet } from "./pageSet.js";
import { PageItem } from "./pageitem.js";
import { ItemTypes } from "./itemtypes.js";
import { DomainCollection } from "./domaincollection.js";
import { Library, Page } from "./page.js";
import { SurveyOptions } from "./survey.js";
import { ItemWithContext } from "./pageitem.js";
import { RequiredRule } from "./rule/unitrule.js";
import { acknowledge } from "./rule/messages.js";
import { Workflow } from "./workflow.js";

test("Interview construction", t => {
  const pageSet = new PageSet("Follow Up");
  const interview = new Interview(pageSet, {});
  t.equal(interview.pageSet, pageSet);
  t.end();
});

test("Interview has answers", t => {
  const { interview, answer1: answer } = buildInterview();
  t.arrayContains(interview.items, [answer]);
  t.end();
});

test("Interview item for variable", t => {
  const { interview, answer1: answer } = buildInterview();
  const actual1 = interview.getItemForVariable(answer.pageItem.variableName);
  t.equal(actual1, answer);
  const actual2 = interview.getItemForVariable(answer.pageItem);
  t.equal(actual2, answer);
  t.end();
});

test("Interview status for page", t => {
  const { interview: interview0 } = buildInterview();
  const status0 = interview0.getStatusForPage(interview0.pageSet.pages[0]);
  t.equal(status0, "incomplete");
  const interview1 = complete0(interview0);
  const status1 = interview1.getStatusForPage(interview0.pageSet.pages[0]);
  t.equal(status1, "fulfilled");
  t.end();
});

test("Interview status for page is insufficient", t => {
  const { interviewFUP2: interview } = buildInterviewWithMandatoryPage();
  const statusPage1 = interview.getStatusForPage(interview.pageSet.pages[0]);
  const statusPage3 = interview.getStatusForPage(interview.pageSet.pages[2]);
  t.equal(statusPage1, "insufficient");
  t.equal(statusPage3, "fulfilled");
  t.end();
});

test("Interview answsers for page", t => {
  const { interview: interview0 } = buildInterview();
  const page0 = interview0.pageSet.pages[0];
  const interview1 = complete0(interview0);
  const answers = interview1.getItemsForPage(page0);
  t.equal(answers.length, 2);
  t.equal(answers[0].pageItem, page0.items[0]);
  t.end();
});

test("Interview answsers for page with context", t => {
  const { interview: interview0 } = buildInterview();
  const page2 = interview0.pageSet.pages[2];
  const answers = interview0.getItemsForPage(page2);
  t.equal(answers.length, 1);
  t.equal(answers[0].pageItem, (page2.items[0] as ItemWithContext).pageItem);
  t.end();
});

test("Interview status for page", t => {
  const { interview: interview0 } = buildInterview();
  const status2 = interview0.getStatusForPage(interview0.pageSet.pages[2]);
  t.equal(status2, "fulfilled");
  t.end();
});

test("Interview status", t => {
  const { interview } = buildInterview();
  const status = interview.status;
  t.equal(status, "incomplete");
  t.end();
});

test("Interview status is insufficient", t => {
  const { interviewFUP2: interview } = buildInterviewWithMandatoryPage();
  const status = interview.status;
  t.equal(status, "insufficient");
  t.end();
});

test("Interview page status is empty", t => {
  const pageItem1 = new PageItem("Q1", "Q1", ItemTypes.text);
  const pageItem2 = new PageItem("Q2", "Q2", ItemTypes.text);
  const page = new Page("P", {
    includes: DomainCollection(pageItem1, pageItem2),
  });
  const pageSet = new PageSet("PS", { pages: DomainCollection(page) });
  const item1 = new InterviewItem(pageItem1, undefined);
  const item2 = new InterviewItem(pageItem2, undefined, {
    specialValue: "notApplicable",
  });
  const interview = new Interview(
    pageSet,
    {},
    { items: DomainCollection(item1, item2) }
  );
  t.equal(interview.getStatusForPage(page), "empty");
  t.end();
});

test("Interview page status is empty when item missing", t => {
  const pageItem1 = new PageItem("Q1", "Q1", ItemTypes.text);
  const pageItem2 = new PageItem("Q2", "Q2", ItemTypes.text);
  const page = new Page("P", {
    includes: DomainCollection(pageItem1, pageItem2),
  });
  const pageSet = new PageSet("PS", { pages: DomainCollection(page) });
  const item2 = new InterviewItem(pageItem2, undefined, {
    specialValue: "notApplicable",
  });
  const interview = new Interview(
    pageSet,
    {},
    { items: DomainCollection(item2) }
  );
  t.equal(interview.getStatusForPage(page), "empty");
  t.end();
});

test("Interview page status is fulfilled with special values only", t => {
  const pageItem1 = new PageItem("Q1", "Q1", ItemTypes.text);
  const pageItem2 = new PageItem("Q2", "Q2", ItemTypes.text);
  const page = new Page("P", {
    includes: DomainCollection(pageItem1, pageItem2),
  });
  const pageSet = new PageSet("PS", { pages: DomainCollection(page) });
  const item1 = new InterviewItem(pageItem1, undefined, {
    specialValue: "notApplicable",
  });
  const item2 = new InterviewItem(pageItem2, undefined, {
    specialValue: "notApplicable",
  });
  const interview = new Interview(
    pageSet,
    {},
    { items: DomainCollection(item1, item2) }
  );
  t.equal(interview.getStatusForPage(page), "fulfilled");
  t.end();
});

test("Interview page status when multiple instances not all fulfilled #234", t => {
  const pageItem = new PageItem("Q1", "Q1", ItemTypes.text, { array: true });
  const page = new Page("P", {
    includes: DomainCollection(pageItem),
  });
  const pageSet = new PageSet("PS", { pages: DomainCollection(page) });
  const fulfilled = new InterviewItem(pageItem, "ok");
  const missing = new InterviewItem(pageItem.nextInstance(), undefined);
  const interview = new Interview(
    pageSet,
    {},
    { items: DomainCollection(fulfilled, missing) }
  );
  t.equal(interview.getStatusForPage(page), "incomplete");
  t.end();
});

test("Interview update", t => {
  const { interview, answer1: answer } = buildInterview();
  const copy = interview.update({});
  t.equal(copy, interview);
  const newPageSet = new PageSet("Follow Up");
  const updated = interview.update({ pageSet: newPageSet });
  t.equal(updated.pageSet, newPageSet);
  t.arrayContains(updated.items, [answer]);
  t.end();
});

test("Interview fully updated", t => {
  const { interview } = buildInterview();
  const updated0 = interview.update({ pageSet: new PageSet("Follow Up") });
  const updated1 = interview.update(updated0);
  t.equal(updated1, updated0);
  t.end();
});

test("Interview date", t => {
  const { pageItem1, pageItem2, pageSet1 } = buildPageSet();
  const pageSetDate = new Date();
  const answer = new InterviewItem(pageItem1, pageSetDate);
  const answer2 = new InterviewItem(pageItem2, "several reasons");
  const interview = new Interview(
    pageSet1,
    { interviewDateVar: "VISDATE" },
    {
      items: DomainCollection(answer, answer2),
    }
  );
  t.deepEqual(interview.date, pageSetDate);
  t.end();
});

test("Interview inclusion item", t => {
  const { pageItem0, pageSet1 } = buildPageSet();
  const answer = new InterviewItem(pageItem0, true);
  const interview = new Interview(
    pageSet1,
    { inclusionVar: "__INCLUDED" },
    {
      items: DomainCollection(answer),
    }
  );
  t.true(interview.included);
  t.end();
});

test("Interview date override", t => {
  const { pageItem1, pageItem2 } = buildPageSet();
  const page = new Page("Inclusion", {
    includes: DomainCollection(pageItem1, pageItem2),
  });
  const pageSet = new PageSet("Inclusion", {
    pages: DomainCollection(page),
    datevar: "VISDATE",
  });
  const pageSetDate = new Date();
  const answerDate = new InterviewItem(pageItem1, pageSetDate);
  const answer1 = new InterviewItem(pageItem2, "several reasons");
  const interview = new Interview(
    pageSet,
    { interviewDateVar: "VDATE" },
    {
      items: DomainCollection(answerDate, answer1),
    }
  );
  t.deepEqual(interview.date, pageSetDate);
  t.end();
});

test("Interview fill rate", t => {
  const { interview: interview0 } = buildInterview();
  t.equal(interview0.fillRate, 0.67);
  const interview1 = complete0(interview0);
  t.equal(interview1.fillRate, 1);
  t.end();
});

test("Interview current page", t => {
  const { interview: interview0 } = buildInterview();
  t.equal(interview0.currentPage, interview0.pageSet.pages[0]);
  t.end();
});

test("Interview current page gives priority in 'insufficient'", t => {
  const { interviewINC: interview } = buildInterview();
  const statusPage = interview.getStatusForPage(interview.currentPage);
  t.equal(statusPage, "insufficient");
  t.end();
});

test("Interview current page when all pages are fulfilled", t => {
  const { interview: interview0 } = buildInterview();
  const interview1 = complete0(interview0);
  const item = new PageItem("New item?", "NEWQUEST", ItemTypes.yesno);
  const answer2 = new InterviewItem(item, true);
  const page = new Page("New page", {
    includes: DomainCollection(item),
  });
  const interview2 = interview1.update({
    pageSet: interview1.pageSet.update({
      pages: interview1.pageSet.pages.append(page),
    }),
    items: interview1.items.append(answer2),
  });
  t.equal(interview2.currentPage, interview2.pageSet.pages[3]);
  t.end();
});

test("Interview last input forced", async t => {
  const { interview: interview0 } = buildInterview();
  await new Promise<void>(r =>
    setTimeout(() => {
      const interview1 = interview0.update({
        nonce: 1,
        lastInput: interview0.lastInput,
      });
      t.true(interview1.lastInput == interview0.lastInput);
      r();
    }, 10)
  );
  t.end();
});

test("Interview has alerts", t => {
  const { pageItem1, pageItem2, pageSet1 } = buildPageSet();
  const itemWithMessage = new InterviewItem(pageItem2, undefined, {
    messages: { required: "value is required" },
  });
  const interviewItems = DomainCollection(
    new InterviewItem(pageItem1, new Date()),
    itemWithMessage
  );
  const interview = new Interview(pageSet1, {}, { items: interviewItems });
  t.deepLooseEqual(interview.alerts, [
    {
      message: itemWithMessage.messages.required,
      item: itemWithMessage,
      interview: interview,
      tags: undefined,
    },
  ]);
  t.end();
});

test("Interview item map to page", t => {
  const { pageItem1, pageSet1 } = buildPageSet();
  const item = new InterviewItem(pageItem1, new Date());
  const interviewItems = DomainCollection(item);
  const interview = new Interview(pageSet1, {}, { items: interviewItems });
  t.equal(interview.pageOf(item), pageSet1.pages[0]);
  t.end();
});

test("Interview check if all mandatory pages are filled", t => {
  const { interviewFUP1, interviewFUP2 } = buildInterviewWithMandatoryPage();
  t.notEqual(interviewFUP1.status, "insufficient");
  t.equal(interviewFUP2.status, "insufficient");
  t.end();
});

test("Get all InterviewItem values for all pins", t => {
  const { interviewFUP2: interview, answer4: answer } =
    buildInterviewWithMandatoryPage();
  t.deepLooseEqual(interview.pins[1], answer);
  t.end();
});

test("Get all InterviewItem values for all kpis #184", t => {
  const { interviewFUP2: interview, answer4: answer } =
    buildInterviewWithMandatoryPage();
  t.deepLooseEqual(interview.kpis[0], answer);
  t.end();
});

test("Zip partial interview with items", t => {
  const { interview } = buildInterview();
  const partial = { nonce: 1223215674234228 };
  const partialItems = {
    items: new Array(interview.items.length).fill({ context: 1 }),
    processes: [],
  };
  const updated = interview.update([partial, partialItems]);
  t.equal(updated.nonce, partial.nonce);
  t.true(updated.items.every(i => i.context == 1));
  t.end();
});

test("Zip with no changes", t => {
  const { interview } = buildInterview();
  const zipped = interview.update([{}, { items: new Array(2).fill({}) }]);
  t.equal(zipped, interview);
  t.end();
});

test("Zip with nothing", t => {
  const { interview } = buildInterview();
  const zipped = interview.update([{}, { items: [] }]);
  t.equal(zipped, interview);
  t.end();
});

function complete0(interview0: Interview) {
  const answer1 = new InterviewItem(
    interview0.pageSet.pages[0].items[1],
    "example"
  );
  return interview0.update({
    items: interview0.items.append(answer1),
  });
}

test("Multiple instance item #168", t => {
  const { interview, page1, answer1 } = buildInterview();
  const pageItem2 = answer1.pageItem.nextInstance();
  const answer2 = new InterviewItem(pageItem2, answer1.value);
  const interview2 = interview.update({
    items: interview.items.append(answer2),
  });
  t.equal(
    interview2.getItemForVariable(answer1.pageItem.variableName),
    answer1
  );
  t.equal(interview2.getItemForVariable(answer2.pageItem), answer2);
  t.equal(
    interview2.getItemForVariable(answer2.pageItem.variableName, 2),
    answer2
  );
  t.deepLooseEqual(interview2.getItemsForPage(page1), [answer1, answer2]);
  t.equal(interview2.nextInstance(answer1), answer2);
  t.equal(interview2.nextInstance(answer2), undefined);
  t.end();
});

test("Interview update with less items #331", t => {
  const interview1 = new Interview(
    new PageSet(""),
    {},
    {
      items: DomainCollection(
        new InterviewItem(new PageItem("", "P1", ItemTypes.acknowledge), true),
        new InterviewItem(new PageItem("", "P2", ItemTypes.acknowledge), false)
      ),
    }
  );
  const interview2 = interview1.update({
    items: DomainCollection(interview1.items[0]),
  });
  const updated = interview1.update([
    interview2,
    { items: [...interview2.items] },
  ]);
  t.deepEqual(updated.items, interview1.items.slice(0, 1));
  t.end();
});

test("Interview with kpi pivot #319", t => {
  const pivot = new PageItem(
    "Pivot",
    "PIV",
    ItemTypes.choice("one", "PIV1", "PIV2", "PIV3"),
    { array: true }
  );
  const kpi = new PageItem("KPI", "KPI", ItemTypes.integer, {
    array: true,
    kpi: { title: "KPI", pivot },
  });
  const page = new Page("P", {
    includes: DomainCollection(pivot, kpi),
  });
  const pageSet = new PageSet("PS", {
    pages: DomainCollection(page),
  });
  const interview = new Interview(
    pageSet,
    {},
    {
      items: DomainCollection(
        new InterviewItem(pivot, "PIV1"),
        new InterviewItem(kpi, 1),
        new InterviewItem(pivot.nextInstance(), "PIV2"),
        new InterviewItem(kpi.nextInstance(), 2),
        new InterviewItem(pivot.nextInstance().nextInstance(), "PIV3"),
        new InterviewItem(kpi.nextInstance().nextInstance(), 3)
      ),
    }
  );
  const [p1, k1, p2, k2, p3, k3] = interview.items;
  t.deepLooseEqual(interview.kpis, [
    [k1, p1],
    [k2, p2],
    [k3, p3],
  ]);
  t.end();
});

test("Interview events #275", t => {
  const interview = new Interview(
    new PageSet(""),
    {},
    {
      items: DomainCollection(
        new InterviewItem(new PageItem("", "", ItemTypes.text), undefined),
        new InterviewItem(new PageItem("", "", ItemTypes.text), undefined, {
          messages: acknowledge({ critical: "inclusion" }, "critical"),
        }),
        new InterviewItem(new PageItem("", "", ItemTypes.text), undefined, {
          messages: acknowledge({ critical: "ae" }, "critical"),
        }),
        new InterviewItem(new PageItem("", "", ItemTypes.text), undefined, {
          messages: { critical: "ae" },
        })
      ),
    }
  );
  t.deepLooseEqual(interview.events, ["ae", "inclusion"]);
  t.deepLooseEqual(interview.pendingEvents, ["ae"]);
  t.deepLooseEqual(interview.acknowledgedEvents, ["inclusion"]);
  t.end();
});

function buildInterview() {
  const pageItem1 = new PageItem(
    "Was the participant included?",
    "ISPATV1",
    ItemTypes.yesno,
    { array: true }
  );
  const pageItem2 = new PageItem(
    "Clarify why the event is unexpected ?",
    "CLARIFY",
    ItemTypes.text,
    { rules: DomainCollection(new RequiredRule()) }
  );
  const infoItem = new PageItem("Info", "INFO", ItemTypes.info);
  const page1 = new Page("General", {
    includes: DomainCollection(pageItem1, pageItem2, infoItem),
  });
  const pageItem3 = new PageItem(
    "Is the participant a smoker",
    "SMOKER",
    ItemTypes.context([ItemTypes.yesno, ItemTypes.text])
  );
  const page2 = new Page("Information", {
    includes: DomainCollection(pageItem3),
  });
  const page3 = new Page("Information", {
    includes: DomainCollection(
      new Library(
        page2,
        DomainCollection(pageItem3),
        DomainCollection({ pageItem: pageItem3, context: 1 })
      )
    ),
  });
  const pageSetINC = new PageSet("Inclusion", {
    pages: DomainCollection(page1, page2),
    mandatoryPages: DomainCollection(page1),
  });
  const interviewINC = new Interview(pageSetINC, new SurveyOptions());
  const pageSet = new PageSet("Follow up", {
    pages: DomainCollection(page1, page2, page3),
  });
  const answer1 = new InterviewItem(pageItem1, true);
  const answer3 = new InterviewItem({ pageItem: pageItem3, context: 1 }, "Yes");
  const interview = new Interview(pageSet, new SurveyOptions(), {
    items: DomainCollection(answer1, answer3),
  });
  return { interviewINC, interview, page1, answer1, answer3, pageItem2 };
}

function buildPageSet() {
  const pageItem0 = new PageItem(
    "Included :",
    "__INCLUDED",
    ItemTypes.acknowledge,
    { rules: DomainCollection(new RequiredRule()), pin: "pg0", kpi: "kpi0" }
  );
  const pageItem1 = new PageItem(
    "Visit date :",
    "VISDATE",
    ItemTypes.date(false),
    { rules: DomainCollection(new RequiredRule()) }
  );
  const pageItem2 = new PageItem(
    "Clarify why the event is unexpected ?",
    "CLARIFY",
    ItemTypes.text
  );
  const pageItem3 = new PageItem("Q3...?", "Q3", ItemTypes.yesno, {
    rules: DomainCollection(new RequiredRule()),
  });
  const pageItem4 = new PageItem("Q4...?", "Q4", ItemTypes.yesno, {
    rules: DomainCollection(new RequiredRule()),
    pin: "pg4",
    kpi: "kpi4",
  });
  const page1 = new Page("Inclusion", {
    includes: DomainCollection(pageItem0, pageItem1, pageItem2),
  });
  const page2 = new Page("Page2", {
    includes: DomainCollection(pageItem2),
  });
  const page3 = new Page("Page3", {
    includes: DomainCollection(pageItem3, pageItem4),
  });
  const pageSet1 = new PageSet("Inclusion", { pages: DomainCollection(page1) });
  const pageSet2 = new PageSet("Follow up 1", {
    pages: DomainCollection(page2, page3),
    mandatoryPages: DomainCollection(page3),
  });
  const pageSet3 = new PageSet("Follow up 2", {
    pages: DomainCollection(page1, page2, page3),
    mandatoryPages: DomainCollection(page1, page3),
  });
  const workflow = new Workflow({
    info: new PageSet("Synthesis"),
    single: DomainCollection(pageSet1),
    many: DomainCollection(pageSet2, pageSet3),
  });
  return {
    pageItem0,
    pageItem1,
    pageItem2,
    pageItem3,
    pageItem4,
    page1,
    page2,
    page3,
    pageSet1,
    pageSet2,
    pageSet3,
    workflow,
  };
}

function buildInterviewWithMandatoryPage() {
  const { pageItem3, pageItem4, pageSet2, pageSet3 } = buildPageSet();

  const answer3 = new InterviewItem(pageItem3, true);
  const answer4 = new InterviewItem(pageItem4, false);
  const interviewFUP1 = new Interview(pageSet2, new SurveyOptions(), {
    items: DomainCollection(answer3, answer4),
  });
  const interviewFUP2 = new Interview(pageSet3, new SurveyOptions(), {
    items: DomainCollection(answer3, answer4),
  });
  return { interviewFUP1, interviewFUP2, answer4 };
}
