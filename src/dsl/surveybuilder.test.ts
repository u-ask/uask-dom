import { builder, SurveyBuilder } from "./surveybuilder.js";
import test from "tape";
import {
  acknowledgeItem,
  execute,
  getItem,
  getItemType,
  InterviewItem,
  isScopedItem,
  ItemTypes,
  Library,
  mlstring,
  todayItem,
  Scope,
  SurveyOptions,
  thisYearItem,
} from "../domain/index.js";

test("Build a survey", t => {
  const surveyBuilder = new SurveyBuilder();
  surveyBuilder.survey("P11-05");
  const survey = surveyBuilder.get();
  t.equal(survey.name, "P11-05");
  t.end();
});

test("Build a survey with options", t => {
  const surveyBuilder = new SurveyBuilder();
  surveyBuilder.options({
    defaultLang: "fr",
  });
  surveyBuilder.survey("P11-05");
  const survey = surveyBuilder.get();
  t.equal(survey.options.defaultLang, "fr");
  t.equal(survey.options.interviewDateVar, "VDATE");
  t.end();
});

test("Build a survey with a lang list", t => {
  const surveyBuilder = new SurveyBuilder();
  surveyBuilder.options({
    defaultLang: "fr",
    languages: ["fr", "en", "it"],
  });
  const survey = surveyBuilder.get();
  t.equal(survey.options.defaultLang, "fr");
  t.deepEqual(survey.options.languages, ["fr", "en", "it"]);
  t.end();
});

test("Build a survey with inclusionVar option", t => {
  const b = new SurveyBuilder();
  t.deepEqual(b.get().options.inclusionVar, {
    name: "__INCLUDED",
    hidden: false,
  });

  b.options(new SurveyOptions());
  b.options({ inclusionVar: "INCL" });
  t.deepEqual(b.get().options.inclusionVar, { name: "INCL", hidden: false });

  b.options(new SurveyOptions());
  b.options({ inclusionVar: { name: "INCL", hidden: true } });
  t.deepEqual(b.get().options.inclusionVar, { name: "INCL", hidden: true });

  b.options(new SurveyOptions());
  b.options({ inclusionVar: { hidden: true } });
  t.deepEqual(b.get().options.inclusionVar, {
    name: "__INCLUDED",
    hidden: true,
  });

  t.end();
});

test("Build a survey with epro option", t => {
  const surveyBuilder = new SurveyBuilder();
  surveyBuilder.options({
    epro: true,
  });
  surveyBuilder.survey("P11-05");
  const survey = surveyBuilder.get();
  t.true(survey.options.epro);
  t.end();
});

test("Build a survey with pages", t => {
  const survey = getBuilder().get();
  t.equal(survey.pages[0].name, "Observance");
  t.equal(survey.pages[1].name, "Side effects");
  t.end();
});

test("Build a survey with pageSets", t => {
  const b = getBuilder();
  b.pageSet("Inclusion").pages("Observance");
  b.pageSet("Follow Up").pages("Observance", "Side effects");
  const survey = b.get();

  t.equal(survey.pageSets[0].pages[0], survey.pages[0]);
  t.equal(survey.pageSets[1].pages[0], survey.pages[0]);
  t.equal(survey.pageSets[1].pages[1], survey.pages[1]);
  t.end();
});

test("Build a survey with renamed page", t => {
  const b = getBuilder();
  b.page("Obs2").translate("en", "Renamed page").include("Observance");
  b.pageSet("Inclusion").pages("Obs2");
  const survey = b.get();

  t.deepEqual(survey.pageSets[0].pages[0].name, {
    __code__: "Obs2",
    en: "Renamed page",
  });
  t.equal(survey.pageSets[0].pages[0].items.length, 2);
  t.end();
});

test("Build survey with page includes", t => {
  const b = getBuilder();
  b.page("Page built from others")
    .include("Observance")
    .question("Specific question", "SPEC", ItemTypes.yesno)
    .include("Side effects")
    .select("SIDEF");
  const survey = b.get();
  const items = survey.pages[2].items.map(getItem);
  t.equal(items.length, 4);
  t.equal(items[0].variableName, "OBSOK");
  t.equal(items[1].variableName, "LASTT");
  t.equal(items[2].variableName, "SPEC");
  t.equal(items[3].variableName, "SIDEF");
  t.deepEqual(getItemType(items[0]), ItemTypes.yesno);
  t.end();
});

test("Build survey with page includes and context", t => {
  const b = getBuilder();
  b.page("Page built from others").include("Observance").context("OBSOK", 1);
  const survey = b.get();
  const obsok = survey.pages[2].items[0];
  t.deepLooseEqual(obsok, { pageItem: survey.pages[0].items[0], context: 1 });
  t.deepEqual(getItemType(obsok), ItemTypes.text);
  t.end();
});

test("Build survey with inclusion cycle", t => {
  const b = builder();
  b.page("Ugly page 1").include("Ugly page 2");
  b.page("Ugly page 2").include("Ugly page 1");
  t.throws(b.get, "inclusion cycle detected in Ugly page 1");
  t.end();
});

test("Build a survey with reordered workflow", t => {
  const b = builder();
  b.pageSet("P0");
  b.pageSet("P1");
  b.pageSet("P2");
  b.pageSet("P3");
  b.pageSet("P4");
  b.pageSet("P5");
  b.pageSet("P6");
  b.pageSet("P7");
  b.pageSet("P8");
  b.pageSet("P9");
  b.workflow()
    .home("P0")
    .initial("P2", "P1", "P3")
    .end("P6", "P4", "P5")
    .auxiliary("P7", "P8", "P9");
  const survey = b.get();

  t.deepLooseEqual(survey.mainWorkflow.single, survey.pageSets.slice(1, 7));
  t.deepLooseEqual(survey.mainWorkflow.many, survey.pageSets.slice(7, 10));
  t.deepLooseEqual(survey.mainWorkflow.sequence, survey.pageSets.slice(1, 4));
  t.deepLooseEqual(survey.mainWorkflow.stop, survey.pageSets.slice(4, 7));
  t.equal(survey.mainWorkflow.info, survey.pageSets[0]);
  t.end();
});

test("Build a question with computed rule", t => {
  const b = builder();
  b.page("General")
    .question("Poids ?", "POIDS", ItemTypes.integer)
    .question("Taille ?", "TAILLE", ItemTypes.integer)
    .question("IMC ?", "IMC", ItemTypes.integer)
    .computed("POIDS / (TAILLE * TAILLE)");
  const survey = b.get();
  t.true(survey.rules[0]);
  t.deepLooseEqual(
    survey.rules[0].pageItems,
    survey.pages[0].items.map(i => [i, "local"])
  );
  t.end();
});

test("Build question with activation rule as formula", t => {
  const b = builder();
  b.page("General")
    .question("Input 1 to activate", "ACT", ItemTypes.yesno)
    .question("Activated", "ACT2", ItemTypes.integer)
    .activateWhen("ACT==1");
  const survey = b.get();
  t.deepLooseEqual(survey.rules[0].pageItems.length, 3);
  t.true(
    survey.rules[0].pageItems.find(
      i => isScopedItem(i) && i[0] == acknowledgeItem && i[1] == "global"
    )
  );
  const item0 = getItem(survey.pages[0].items[0]);
  const item1 = getItem(survey.pages[0].items[1]);
  const scope0 = Scope.create([{ items: [] }], {
    items: [
      new InterviewItem(item0, 1),
      new InterviewItem(item1, undefined, { specialValue: "notApplicable" }),
    ],
  });
  const result0 = execute(survey.rules, scope0);
  t.false(result0.items[1].specialValue);
  const scope1 = Scope.create([{ items: [] }], {
    items: [new InterviewItem(item0, 0), new InterviewItem(item1, 1)],
  });
  const result1 = execute(survey.rules, scope1);
  t.equal(result1.items[1].specialValue, "notApplicable");
  t.end();
});

test("Build question with activation rule with enabling behavior", t => {
  const b = builder();
  b.page("General")
    .question("Activate ?", "ACT", ItemTypes.yesno)
    .question("Activated", "ACT2", ItemTypes.integer)
    .activateWhen("ACT", true);
  const survey = b.get();
  t.true(survey.rules[0].args.behavior, "enable");
  t.deepLooseEqual(
    survey.rules[0].pageItems,
    survey.pages[0].items.map(i => [i, "local"])
  );
  t.end();
});

test("Build question with activation rule with showing behavior", t => {
  const b = builder();
  b.page("General")
    .question("Activate ?", "ACT", ItemTypes.yesno)
    .question("Activated", "ACT2", ItemTypes.integer)
    .visibleWhen("ACT", true);
  const survey = b.get();
  t.true(survey.rules[0].args.behavior, "show");
  t.deepLooseEqual(
    survey.rules[0].pageItems,
    survey.pages[0].items.map(i => [i, "local"])
  );
  t.end();
});

test("Build a survey with activation rule and multiple activator values", t => {
  const b = builder();
  b.page("General")
    .question("Effects ?", "Q1", b.types.text)
    .question("Since when ?", "Q2", b.types.date(true))
    .activateWhen("Q1", "Other", "Another");
  const survey = b.get();
  t.true(survey.rules[0]);
  t.deepLooseEqual(
    survey.rules[0].pageItems,
    survey.pages[0].items.map(i => [i, "local"])
  );
  t.end();
});

test("Build a survey with a dynamic activation rule", t => {
  const b = builder();
  b.page("General")
    .question("value 0", "V0", b.types.integer)
    .question("value 1", "V1", b.types.integer)
    .question("value 2", "V2", b.types.integer)
    .activateWhen("V1", 0, b.computed("V0"));
  const survey = b.get();
  const dynamic = survey.rules[0];
  t.true(dynamic);
  if (dynamic.name == "dynamic") {
    t.deepEqual(dynamic.args.extraArgs, ["enable"]);
    t.deepLooseEqual(
      dynamic.pageItems,
      survey.pages[0].items.map(i => [i, "local"])
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [a1, b1, result1] = dynamic.execute(
      { value: 1 },
      { value: 2 },
      { value: 3 }
    );
    t.equal(result1.specialValue, "notApplicable");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [a2, b2, result2] = dynamic.execute(
      { value: 1 },
      { value: 1 },
      { specialValue: undefined }
    );
    t.false(result2.specialValue);
  } else t.fail();
  t.end();
});

test("Build a survey with a dynamic visibility rule", t => {
  const b = builder();
  b.page("General")
    .question("value 0", "__V0", b.types.integer)
    .question("value 1", "__V1", b.types.integer)
    .question("value 2", "__V2", b.types.integer)
    .visibleWhen("__V1==__V0");
  const survey = b.get();
  const dynamic = survey.rules[0];
  t.true(dynamic);
  if (dynamic.name == "dynamic") t.deepEqual(dynamic.args.extraArgs, ["show"]);
  else t.fail();
  t.end();
});

test("Build a survey with a dynamic in range rule", t => {
  const b = builder();
  b.page("General")
    .question("value 0", "V0", b.types.integer)
    .question("value 1", "V1", b.types.integer)
    .question("value 2", "V2", b.types.integer)
    .inRange(b.computed("V0"), b.computed("V1"));
  const survey = b.get();
  const dynamic = survey.rules[0];
  t.true(dynamic);
  if (dynamic.name == "dynamic") {
    t.deepLooseEqual(
      dynamic.pageItems,
      survey.pages[0].items.map(i => [i, "local"])
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [a1, b1, result1] = dynamic.execute(
      { value: 1 },
      { value: 2 },
      { value: 3 }
    );
    t.true(result1.messages && result1.messages.inRange);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [a2, b2, result2] = dynamic.execute(
      { value: 1 },
      { value: 3 },
      { value: 2 }
    );
    t.true(!result2.messages?.inRange);
  } else t.fail();
  t.end();
});

test("Build a survey with a dynamic in period rule", t => {
  const b = builder();
  b.page("General")
    .question("value 0", "V0", b.types.date(false))
    .question("value 1", "V1", b.types.date(false))
    .question("value 2", "V2", b.types.date(false))
    .inRange(b.computed("V0"), b.computed("V1"));
  const survey = b.get();
  const dynamic = survey.rules[0];
  t.true(dynamic);
  if (dynamic.name == "dynamic") {
    t.deepLooseEqual(
      dynamic.pageItems,
      survey.pages[0].items.map(i => [i, "local"])
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [a1, b1, result1] = dynamic.execute(
      { value: new Date(2020, 1, 1) },
      { value: new Date(2020, 11, 31) },
      { value: new Date(2021, 1, 1) }
    );
    t.true(result1.messages && result1.messages.inRange);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [a2, b2, result2] = dynamic.execute(
      { value: new Date(2020, 1, 1) },
      { value: new Date(2021, 1, 1) },
      { value: new Date(2020, 11, 31) }
    );
    t.true(!result2.messages?.inRange);
  } else t.fail();
  t.end();
});

test("Build a survey with a period rule on incomplete date", t => {
  const b = builder();
  b.page("General")
    .question("Birth date", "BDATE", b.types.date(true))
    .inRange(b.date("1920-01-01"), b.computed("@TODAY"));
  const survey = b.get();
  const dynamic = survey.rules[0];
  t.true(dynamic);
  const scope = Scope.create([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [a1, result1] = dynamic.execute(
    scope.get([todayItem, "global"]) as InterviewItem,
    { value: "2051" }
  );
  t.true(result1.messages && result1.messages.inRange);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [a2, result2] = dynamic.execute(
    scope.get([todayItem, "global"]) as InterviewItem,
    { value: "1976-01" }
  );
  t.true(!result2.messages?.inRange);
  t.end();
});

test("Build a survey with a today limited period rule", t => {
  const b = builder();
  b.page("General")
    .question("Visit date", "VDATE", b.types.date(false))
    .inRange(b.date("1900-01-01"), b.computed("@TODAY"));
  const survey = b.get();
  const dynamic = survey.rules[0];
  t.true(dynamic);
  if (dynamic.name == "dynamic") {
    t.deepLooseEqual(dynamic.pageItems, [
      [todayItem, "global"],
      [survey.pages[0].items[0], "local"],
    ]);
    const scope = Scope.create([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [a1, result1] = dynamic.execute(
      scope.get([todayItem, "global"]) as InterviewItem,
      { value: new Date(2051, 1, 1) }
    );
    t.true(result1.messages && result1.messages.inRange);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [a2, result2] = dynamic.execute(
      scope.get([todayItem, "global"]) as InterviewItem,
      { value: new Date(2020, 11, 31) }
    );
    t.true(!result2.messages || !result2.messages.inRange);
  } else t.fail();
  t.end();
});

test("Build a survey with a current year range check", t => {
  const b = builder();
  b.page("General")
    .question("sWhich year", "YEAR", b.types.integer)
    .inRange(1900, b.computed("@THISYEAR"));
  const survey = b.get();
  const dynamic = survey.rules[0];
  t.true(dynamic);
  if (dynamic.name == "dynamic") {
    t.deepLooseEqual(dynamic.pageItems, [
      [thisYearItem, "global"],
      [survey.pages[0].items[0], "local"],
    ]);
    const scope = Scope.create([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [a1, result1] = dynamic.execute(
      scope.get([thisYearItem, "global"]) as InterviewItem,
      { value: 2051 }
    );
    t.true(result1.messages?.inRange);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [a2, result2] = dynamic.execute(
      scope.get([thisYearItem, "global"]) as InterviewItem,
      { value: 2001 }
    );
    t.false(result2.messages?.inRange);
  } else t.fail();
  t.end();
});

test("Build a survey with age threshold", t => {
  const b = builder();
  b.page("General")
    .question("Last information date", "INFO", b.types.date(false))
    .question("Stale information", "STALE", b.types.yesno)
    .computed("@TODAY-INFO>15811200000");
  const survey = b.get();
  const computed = survey.rules[0];
  t.true(computed);
  if (computed.name == "computed") {
    t.deepLooseEqual(computed.pageItems, [
      [todayItem, "global"],
      ...survey.pages[0].items.map(i => [i, "local"]),
    ]);
    const scope = Scope.create([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [a1, b1, result1] = computed.execute(
      scope.get([todayItem, "global"]) as InterviewItem,
      { value: new Date(2020, 1, 1) },
      {}
    );
    t.true(result1.value);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [a2, b2, result2] = computed.execute(
      scope.get([todayItem, "global"]) as InterviewItem,
      { value: new Date(Date.now() - 86400000) },
      {}
    );
    t.false(result2.value);
  } else t.fail();
  t.end();
});

test("Build a survey with conditionally required item", t => {
  const b = builder();
  b.page("General")
    .question("Next is required if even", "DUMMY", b.types.integer)
    .question("Required if previous even", "TARGET", b.types.text)
    .required("DUMMY % 2 == 0");
  const survey = b.get();
  const dynamic = survey.rules[0];
  t.true(dynamic);
  if (dynamic.name == "dynamic") {
    t.deepLooseEqual(dynamic.pageItems, [
      [survey.pages[0].items[0], "local"],
      [survey.pages[0].items[1], "local"],
    ]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [a1, result1] = dynamic.execute({ value: 2 }, { value: undefined });
    t.true(result1.messages && result1.messages.required);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [a2, result2] = dynamic.execute({ value: 1 }, { value: undefined });
    t.true(!result2.messages || !result2.messages.required);
  } else t.fail();
  t.end();
});

test("Build a page item with a translated choice type", t => {
  const b = builder();
  b.options({ defaultLang: "fr" });
  b.page("General").question(
    "Color ?",
    "Q1",
    b.types
      .choice("one", "R", "G", "B")
      .wording("rouge", "vert", "bleu")
      .translate("en", "red", "green", "blue")
  );
  const survey = b.get();
  const choice = getItemType(survey.pages[0].items[0]) as unknown as {
    defaultLang: string;
    labels: mlstring[];
  };
  t.equal(choice.defaultLang, "fr");
  t.deepEqual(choice.labels[0], { __code__: "R", fr: "rouge", en: "red" });
  t.end();
});

test("Build a survey with rule by name", t => {
  const b = getBuilder() as SurveyBuilder;
  b.rule(["SIDEF", "SIDSC"], "activation", [true], "enable");
  const survey = b.get();
  const rule = survey.crossRules[0];
  t.true(rule.is("activation"));
  t.end();
});

test("Build a pageSet with mandatory page", t => {
  const b = builder();
  const mandatoryPage = b.mandatory("General");
  b.pageSet("Example").pages(mandatoryPage, "Other page");
  t.deepEqual(mandatoryPage, {
    name: "General",
    mandatory: true,
  });
  t.end();
});

test("Survey with a coumputed default that retrieves last value", t => {
  const b = builder();
  b.page("Poids")
    .question("Poids ?", "POIDS", b.types.integer)
    .defaultValue(b.copy("$POIDS"));
  const survey = b.get();
  const rule = survey.rules[0];
  t.deepEqual(rule.pageItems[0], [survey.pages[0].items[0], "outer"]);
  t.deepEqual(rule.pageItems[1], [survey.pages[0].items[0], "local"]);
  t.equal(rule.when, "initialization");
  const result1 = rule.execute({ value: 75, unit: "kg" }, { value: undefined });
  t.equal(result1[1].value, 75);
  t.equal(result1[1].unit, "kg");
  t.end();
});

function getBuilder() {
  const b = builder();

  b.page("Observance")
    .question(
      "Was the treatment taken as prescribed ?",
      "OBSOK",
      b.types.yesno,
      b.types.text
    )
    .question("Date of last take ?", "LASTT", b.types.date(true));

  b.page("Side effects")
    .question("Have side effects been experienced ?", "SIDEF", b.types.yesno)
    .question("Pain scale assessment :", "SIDSC", b.types.scale(0, 5));

  return b;
}

test("Build a survey with a page alias", t => {
  const b = builder();
  b.pageSet("Inclusion").pages(b.alias("Visit", "Inclusion visit"));
  b.pageSet("Follow up").pages(b.alias("Visit", "Follow up visit"));
  b.page("Inclusion visit");
  b.page("Follow up visit");
  const survey = b.get();
  t.equal((survey.pages[0].includes[0] as Library).page, survey.pages[2]);
  t.equal((survey.pages[1].includes[0] as Library).page, survey.pages[3]);
  t.equal(survey.pages[0].exportConfig?.fileName, "Visit");
  t.equal(survey.pages[1].exportConfig?.fileName, "Visit");
  t.end();
});

test("Build a survey whith rule that violates strict order", t => {
  const b = builder();
  b.strict();
  b.pageSet("Inclusion").pages("General");
  b.page("General").include("Inclusion").include("Elligible");
  b.page("Elligible")
    .question("Participant elligible ?", "ELLIG", b.types.acknowledge)
    .computed("INCL");
  b.page("Inclusion").question(
    "Participant included ?",
    "INCL",
    b.types.acknowledge
  );
  t.throws(
    () => b.get(),
    /Variable INCL used in ELLIG must be declared before/
  );
  t.end();
});

test("Build a survey whith self referencing rule violates strict order", t => {
  const b = builder();
  b.strict();
  b.pageSet("Inclusion").pages("General");
  b.page("General").include("Inclusion").include("Elligible");
  b.page("Elligible").question(
    "Participant elligible ?",
    "ELLIG",
    b.types.acknowledge
  );
  b.page("Inclusion")
    .question("Participant included ?", "INCL", b.types.acknowledge)
    .computed("$INCL");
  b.get();
  t.end();
});

test("Build a survey with a participant workflow", t => {
  const b = builder();
  b.pageSet("info").pageSet("main").pageSet("participant");
  b.workflow().home("info").auxiliary("main").initial("main");
  b.workflow("writer:external").withPageSets("info", "participant");
  const survey = b.get();
  t.equal(survey.workflows.length, 2);
  t.equal(survey.mainWorkflow.pageSets.length, 3);
  t.equal(survey.workflow("writer:external")?.pageSets.length, 2);
  t.equal(survey.mainWorkflow.main, undefined);
  t.equal(survey.workflow("writer:external")?.main, survey.mainWorkflow);
  t.end();
});

test("Build a survey with identical derived workflows", t => {
  const b = builder();
  b.pageSet("info").pageSet("main").pageSet("participant");
  b.workflow().home("info").auxiliary("main").initial("main");
  b.workflow("writer:external", "administrator").withPageSets(
    "info",
    "participant"
  );
  const survey = b.get();
  t.equal(survey.workflows.length, 3);
  t.equal(survey.workflow("administrator")?.pageSets.length, 2);
  t.equal(survey.workflow("administrator")?.main, survey.mainWorkflow);
  t.end();
});

test("Build a question with a dynimic unit rule", t => {
  const b = builder();
  b.page("General")
    .question("Critical when greater than 3", "V", b.types.integer)
    .critical("C", "CC", b.computed("V > 3"));
  const survey = b.build();
  t.equal(survey.crossRules.length, 0);
  t.equal(survey.items[0].rules.length, 1);
  const rule = survey.items[0].rules[0];
  t.equal(rule.execute({ value: 3 }).messages?.critical, undefined);
  t.equal(rule.execute({ value: 4 }).messages?.critical, "C");
  t.end();
});

test("Build a question with activation and memo", t => {
  const b = builder();
  b.page("General")
    .question("Activate", "A", b.types.acknowledge)
    .question("Val", "V", ItemTypes.text)
    .activateWhen("A", 1)
    .memorize();
  const survey = b.build();
  t.deepLooseEqual(
    survey.rules.map(r => r.name),
    ["computed", "activation"]
  );
  t.end();
});
