import test from "tape";
import "../test-extension.js";
import { InterviewItem } from "./interviewitem.js";
import { DomainCollection } from "./domaincollection.js";
import { Library, Page } from "./page.js";
import { PageSet } from "./pageSet.js";
import { Workflow } from "./workflow.js";
import { CrossItemRule, execute, link } from "./rule/crossrule.js";
import { ActivationRule } from "./rule/activationrule.js";
import {
  ConstantRule,
  InRangeRule,
  RequiredRule,
  UnitRule,
} from "./rule/unitrule.js";
import { PageItem } from "./pageitem.js";
import { ItemTypes } from "./itemtypes.js";
import { Survey } from "./survey.js";
import { Scope } from "./scope.js";
import { ComputedParser, ComputedRule } from "./rule/computedrule.js";
import { Interview } from "./interview.js";
import { Participant } from "./participant.js";
import { Sample } from "./sample.js";
import { User } from "./user.js";

test("Survey construction", t => {
  const survey = new Survey("P11-05");
  t.equal(survey.name, "P11-05");
  t.end();
});

test("Survey default language", t => {
  const survey1 = new Survey("P11-05");
  t.equal(survey1.options.defaultLang, "en");
  const survey2 = new Survey("P11-05", { options: { defaultLang: "fr" } });
  t.equal(survey2.options.defaultLang, "fr");
  t.end();
});

test("Survey available languages", t => {
  const survey1 = new Survey("P11-05");
  t.deepEqual(survey1.options.languages, ["en", "fr"]);
  t.equal(survey1.options.defaultLang, "en");
  const survey2 = new Survey("P11-05", {
    options: { languages: ["en", "fr", "it"] },
  });
  t.deepEqual(survey2.options.languages, ["en", "fr", "it"]);
  t.end();
});

test("Survey default pageSet date variable name", t => {
  const survey1 = new Survey("P11-05");
  t.equal(survey1.options.interviewDateVar, "VDATE");
  const survey2 = new Survey("P11-05", { options: { interviewDateVar: "LADATE" } });
  t.equal(survey2.options.interviewDateVar, "LADATE");
  t.end();
});

test("Survey default unitSuffix", t => {
  const survey1 = new Survey("P11-05");
  t.equal(survey1.options.unitSuffix, "_UNIT");
  const survey2 = new Survey("P11-05", { options: { unitSuffix: "_U" } });
  t.equal(survey2.options.unitSuffix, "_U");
  t.end();
});

test("Survey default inclusionVar variable name", t => {
  const survey1 = new Survey("P11-05");
  t.deepEqual(survey1.options.inclusionVar, {
    name: "__INCLUDED",
    hidden: false,
  });
  const survey2 = new Survey("P11-05", { options: { inclusionVar: "INCLU" } });
  t.equal(survey2.options.inclusionVar, "INCLU");
  t.end();
});

test("Survey inclusion page set", t => {
  const survey = new Survey("P11-05", {
    pageSets: DomainCollection(
      new PageSet("Inclusion", {
        pages: DomainCollection(
          new Page("Inclusion", {
            includes: DomainCollection(
              new PageItem("Inclusion", "__INCLUDED", ItemTypes.acknowledge)
            ),
          })
        ),
      })
    ),
  });
  t.equal(survey.inclusionPageSet, survey.pageSets[0]);
  t.end();
});

test("Survey default showFillRate", t => {
  const survey1 = new Survey("P11-05");
  t.equal(survey1.options.showFillRate, true);
  const survey2 = new Survey("P11-05", { options: { showFillRate: false } });
  t.equal(survey2.options.showFillRate, false);
  t.end();
});

test("Survey change option", t => {
  const survey1 = new Survey("P11-05");
  t.equal(survey1.options.defaultLang, "en");
  t.equal(survey1.options.interviewDateVar, "VDATE");
  const survey2 = survey1.update({
    options: { ...survey1.options, defaultLang: "fr" },
  });
  t.equal(survey2.options.interviewDateVar, "VDATE");
  t.equal(survey2.options.defaultLang, "fr");
  t.end();
});

test("Survey has pageSets", t => {
  const pageSet1 = new PageSet("Enrolement");
  const pageSet2 = new PageSet("Follow up");
  const survey = new Survey("P11-05", {
    pageSets: DomainCollection(pageSet1, pageSet2),
  });
  t.arrayContains(survey.pageSets, [pageSet1, pageSet2]);
  t.end();
});

test("Survey has pages", t => {
  const page1 = new Page("Observance");
  const page2 = new Page("Side effects");
  const survey = new Survey("P11-05", {
    pages: DomainCollection(page1, page2),
  });
  t.arrayContains(survey.pages, [page1, page2]);
  t.end();
});

test("Survey has workflow", t => {
  const pageSet0 = new PageSet("Introduction");
  const pageSet1 = new PageSet("Enrolement");
  const pageSet2 = new PageSet("Follow up");
  const survey = new Survey("P11-05", {
    pageSets: DomainCollection(pageSet1, pageSet2),
    workflows: DomainCollection(
      new Workflow({
        info: pageSet0,
        single: DomainCollection(pageSet1),
        many: DomainCollection(pageSet2),
        sequence: DomainCollection(pageSet1),
      })
    ),
  });
  t.equal(survey.mainWorkflow.single[0], pageSet1);
  t.equal(survey.mainWorkflow.many[0], pageSet2);
  t.end();
});

test("Survey update", t => {
  const page1 = new Page("Observance");
  const survey = new Survey("P11-05", {
    pages: DomainCollection(page1),
  });
  const copy = survey.update({});
  t.equal(copy, survey);
  const page2 = new Page("Side effects");
  const updated = survey.update({ pages: survey.pages.append(page2) });
  t.arrayContains(updated.pages, [page1, page2]);
  t.end();
});

test("Survey fully update", t => {
  const survey = new Survey("P11-05");
  const updated0 = survey.update({ name: "EXX-40" });
  const updated1 = survey.update(updated0);
  t.equal(updated1, updated0);
  t.end();
});

test("Survey has rules", t => {
  const pageItem1 = new PageItem(
    "Was the participant included ?",
    "ISPATV1",
    ItemTypes.yesno
  );
  const pageItem2 = new PageItem(
    "Date of your last administration",
    "HUSDT",
    ItemTypes.date(true)
  );
  const page1 = new Page("Observance", {
    includes: DomainCollection(pageItem1),
  });
  const page2 = new Page("Side effects", {
    includes: DomainCollection(pageItem2),
  });
  const survey = new Survey("Example", {
    pages: DomainCollection(page1, page2),
    crossRules: DomainCollection(
      new CrossItemRule(
        DomainCollection(pageItem1, pageItem2),
        ActivationRule.enable("Other")
      )
    ),
  });
  t.equal(survey.crossRules.length, 1);
  t.end();
});

const outerScope = Scope.create([]);

test("Survey with validation", t => {
  const pageItem1 = new PageItem("Question blabla", "BTXT", ItemTypes.text);
  const pageItem2 = new PageItem("Question range", "QRANGE", ItemTypes.integer);
  const page1 = new Page("Observance", {
    includes: DomainCollection(pageItem1),
  });
  const page2 = new Page("Side effects", {
    includes: DomainCollection(pageItem2),
  });
  const survey = new Survey("Example", {
    pages: DomainCollection(page1, page2),
    crossRules: DomainCollection(
      new CrossItemRule(
        DomainCollection(pageItem1, pageItem2),
        ActivationRule.enable("Other")
      )
    ),
  });
  const answer1 = new InterviewItem(pageItem1, "Other");
  const answer2 = new InterviewItem(pageItem2, undefined, {
    specialValue: "notApplicable",
  });
  const scope = outerScope.with([answer1, answer2]);
  const result1 = execute(survey.crossRules, scope).items;
  t.deepLooseEqual(
    result1.map(r => r.specialValue),
    [undefined, undefined]
  );
  t.equal(result1[0], answer1);
  t.end();
});

test("Get all rules in the survey", t => {
  const { survey } = buildSurvey();
  t.equal(survey.rules.filter(r => r.when == "always").length, 5);
  t.equal(survey.rules.filter(r => r.when == "initialization").length, 1);
  const targets = survey.rules.map(r =>
    survey.items.findIndex(i => i == r.target)
  );
  const sorted = targets.slice(1).every((ix, i) => targets[i] <= ix);
  t.ok(sorted);
  t.end();
});

test("Execute all rules in the survey with answers missing", t => {
  const { survey, pageItem1 } = buildSurvey();
  const answer1 = new InterviewItem(pageItem1, undefined);
  t.deepEqual(
    execute(survey.rules, outerScope.with([answer1])).items[0].messages,
    {
      required: "value is required",
    }
  );
  t.end();
});

test("Get item by variable name", t => {
  const { survey, pageItem1 } = buildSurvey();
  const actual = survey.getItemForVariable(pageItem1.variableName);
  t.equal(actual, pageItem1);
  t.end();
});

test("Execute all rules in the survey with activation rule", t => {
  const { survey, pageItem2, pageItem3 } = buildSurvey();
  const answer2 = new InterviewItem(pageItem2, "Other");
  const answer3 = new InterviewItem(pageItem3, 2);
  const answer3bis = new InterviewItem(pageItem3, {
    specialValue: "notApplicable",
  });
  t.equal(
    execute(survey.rules, outerScope.with([answer2, answer3])).items[1],
    answer3
  );
  t.false(
    execute(survey.rules, outerScope.with([answer2, answer3bis])).items[1]
      .specialValue
  );
  t.end();
});

test("Execute all rules in the survey with activation rule (activator value boolean)", t => {
  const { survey, pageItem4, pageItem5 } = buildSurvey();
  const answer4 = new InterviewItem(pageItem4, true);
  const answer5 = new InterviewItem(pageItem5, undefined);
  const answer5bis = new InterviewItem(pageItem5, 1.6);
  t.equal(
    execute(survey.rules, outerScope.with([answer4, answer5])).items[1],
    answer5
  );
  t.equal(
    execute(survey.rules, outerScope.with([answer4, answer5bis])).items[1],
    answer5bis
  );
  t.end();
});

test("Get survey pins", t => {
  const { survey, pageItem1, pageItem2 } = buildSurvey();
  t.deepLooseEqual(survey.pins, [pageItem1, pageItem2]);
  t.end();
});

test("Get survey pins with library includes", t => {
  const { survey, pageItem1, pageItem2 } = buildSurvey();
  const pageItem3 = new PageItem(
    "Date of your last administration",
    "HUSDT",
    ItemTypes.date(true),
    { pin: "last admin" }
  );
  const page = new Page("Observance", {
    includes: DomainCollection(pageItem3),
  });
  const composample = new Page("Composample", {
    includes: DomainCollection(new Library(page, DomainCollection(pageItem3))),
  });
  const survey1 = new Survey("Example", {
    pages: DomainCollection(
      survey.pages[0],
      survey.pages[1],
      survey.pages[2],
      page,
      composample
    ),
  });
  t.deepLooseEqual(survey1.pins, [pageItem1, pageItem2, pageItem3]);
  t.end();
});

test("Get survey kpis #184", t => {
  const { survey, pageItem1, pageItem2 } = buildSurvey();
  t.deepLooseEqual(survey.kpis, [pageItem1, pageItem2]);
  t.end();
});

test("First interview with item that defaults to last known value", t => {
  const { pageSet, pageItem, survey } = buildSurveyWithDefaults();
  const interview0 = new Interview(
    pageSet,
    {},
    {
      items: DomainCollection(new InterviewItem(pageItem, undefined)),
    }
  );
  const participant = new Participant("", new Sample(""), {
    interviews: DomainCollection(interview0),
  });
  const local0 = Scope.create(participant, interview0);
  const result0 = execute(survey.crossRules, local0, ["initialization"]).items;
  t.equal(result0[0].value, undefined);
  t.end();
});

test("Second interview with item that defaults to last known value", t => {
  const { pageSet, pageItem, survey } = buildSurveyWithDefaults();
  const interview1 = new Interview(
    pageSet,
    {},
    {
      items: DomainCollection(new InterviewItem(pageItem, undefined)),
    }
  );
  const interview0 = new Interview(
    pageSet,
    {},
    {
      items: DomainCollection(new InterviewItem(pageItem, 70)),
    }
  );
  const participant = new Participant("", new Sample(""), {
    interviews: DomainCollection(interview0, interview1),
  });
  const local1 = Scope.create(participant, interview1);
  const result1 = execute(survey.crossRules, local1, ["initialization"]).items;
  t.equal(result1[0].value, 70);
  t.end();
});

test("Survey with multiple workflows", t => {
  const mainPageSetInfo = new PageSet("main info");
  const mainPageSet = new PageSet("main");
  const participantPageSet = new PageSet("participant");
  const mainWorkflow = new Workflow({
    info: mainPageSetInfo,
    single: DomainCollection(mainPageSet, participantPageSet),
    sequence: DomainCollection(mainPageSet),
  });
  const participantWorkflow = new Workflow({
    single: DomainCollection(participantPageSet),
    sequence: DomainCollection(participantPageSet),
    name: "participant",
  });
  const survey = new Survey("survey", {
    pageSets: DomainCollection(
      mainPageSetInfo,
      mainPageSet,
      participantPageSet
    ),
    workflows: DomainCollection(mainWorkflow, participantWorkflow),
  });
  t.equal(survey.mainWorkflow, mainWorkflow);
  t.equal(survey.workflow("participant"), participantWorkflow);
  t.end();
});

test("Survey workflow for user", t => {
  const mainPageSetInfo = new PageSet("main info");
  const mainPageSet = new PageSet("main");
  const participantPageSet = new PageSet("participant");
  const mainWorkflow = new Workflow({
    info: mainPageSetInfo,
    single: DomainCollection(mainPageSet, participantPageSet),
    sequence: DomainCollection(mainPageSet),
  });
  const participantWorkflow = new Workflow({
    single: DomainCollection(participantPageSet),
    sequence: DomainCollection(participantPageSet),
    name: "participant",
  });
  const survey = new Survey("survey", {
    pageSets: DomainCollection(
      mainPageSetInfo,
      mainPageSet,
      participantPageSet
    ),
    workflows: DomainCollection(mainWorkflow, participantWorkflow),
  });
  const workflow = survey.workflow(new User("participant"));
  t.equal(workflow?.name, "participant");
  t.end();
});

function buildSurvey() {
  const pageItem1 = new PageItem("Quel est etc...", "ETC", ItemTypes.text, {
    rules: DomainCollection(new RequiredRule()),
    pin: "etc",
    kpi: "kpi1",
  });
  const pageItem2 = new PageItem("Question blabla", "BTXT", ItemTypes.text, {
    rules: DomainCollection<UnitRule>(new RequiredRule()),
    pin: "blabla",
    kpi: "kpi2",
  });
  const pageItem3 = new PageItem(
    "Question range",
    "QRANGE",
    ItemTypes.integer,
    { rules: DomainCollection(new InRangeRule(1, 3)) }
  );
  const pageItem4 = new PageItem("Question yesno", "QYN", ItemTypes.yesno, {
    defaultValue: new ConstantRule(true),
  });
  const pageItem5 = new PageItem("Question date", "QDATE", ItemTypes.real);
  const page0 = new Page("Introduction", {
    includes: DomainCollection(pageItem1),
  });
  const page1 = new Page("Observance", {
    includes: DomainCollection(pageItem2),
  });
  const page2 = new Page("Side effects", {
    includes: DomainCollection(pageItem3, pageItem4, pageItem5),
  });
  const survey = new Survey("Example", {
    pages: DomainCollection(page0, page1, page2),
    crossRules: DomainCollection(
      new CrossItemRule(
        DomainCollection(pageItem2, pageItem3),
        ActivationRule.enable("Other")
      ),
      new CrossItemRule(
        DomainCollection(pageItem4, pageItem5),
        ActivationRule.enable(true)
      )
    ),
  });
  return { survey, pageItem1, pageItem2, pageItem3, pageItem4, pageItem5 };
}

function buildSurveyWithDefaults() {
  const pageItem = new PageItem("Poids", "POIDS", ItemTypes.integer);
  const page = new Page("Poids", { includes: DomainCollection(pageItem) });
  const pageSet = new PageSet("Poids", { pages: DomainCollection(page) });
  const parsed = ComputedParser.parse("POIDS", "$POIDS");
  const rule = new ComputedRule(parsed.formula, parsed.variableNames.length);
  const crossrule = link(
    { variableNames: parsed.variableNames, rule },
    [pageItem],
    "initialization"
  );
  const survey = new Survey("S", {
    pages: DomainCollection(page),
    pageSets: DomainCollection(pageSet),
    crossRules: DomainCollection(crossrule),
  });
  return { pageSet, pageItem, survey };
}
