import test from "tape";
import { ItemTypes } from "../domain/itemtypes.js";
import { PageItemBuilder } from "./pageitembuilder.js";
import { PageBuilder } from "./pagebuilder.js";
import {
  getItem,
  hasPivot,
  isContextual,
  Library,
  Rules,
} from "../domain/index.js";
import { isML } from "../domain/domain.js";
import { SurveyBuilder } from "./surveybuilder.js";
import {
  DecimalPrecisionRule,
  FixedLengthRule,
  LetterCaseRule,
  MaxLengthRule,
} from "../domain/rule/unitrule.js";

test("Build item", t => {
  const pageItemBuilder = new PageItemBuilder(
    "Was the treatment taken as prescribed?",
    "OBSOK",
    ItemTypes.yesno,
    undefined,
    {}
  );
  const item = pageItemBuilder.build([]);
  t.equal(item.wording, "Was the treatment taken as prescribed?");
  t.equal(item.variableName, "OBSOK");
  t.equal(item.type, ItemTypes.yesno);
  t.end();
});

test("Build item countries", t => {
  const pageItemBuilder = new PageItemBuilder(
    "Country:",
    "COU",
    ItemTypes.countries("one"),
    undefined,
    {}
  );
  const item = pageItemBuilder.build([]);
  t.deepEqual(item.type, ItemTypes.countries("one"));
  t.end();
});

test("Build translated item", t => {
  const pageItemBuilder = new PageItemBuilder(
    "Was the treatment taken as prescribed?",
    "OBSOK",
    ItemTypes.yesno,
    undefined,
    { defaultLang: "en" }
  )
    .translate("fr", "La prescription a-t-elle été suivie ?")
    .translate("martian", "[^-|#) ?") as PageItemBuilder;
  const item = pageItemBuilder.build([]);
  if (!isContextual(item.wording) && isML(item.wording)) {
    t.equal(item.wording["en"], "Was the treatment taken as prescribed?");
    t.equal(item.wording["fr"], "La prescription a-t-elle été suivie ?");
    t.equal(item.wording["martian"], "[^-|#) ?");
  } else t.fail();
  t.end();
});

test("Page item builder fluent", t => {
  const pageItemBuilder = new PageItemBuilder(
    "Was the treatment taken as prescribed?",
    "OBSOK",
    ItemTypes.yesno,
    undefined,
    {},
    new PageBuilder("Observance", {})
  ).question(
    "Date of last take ?",
    "LASTT",
    ItemTypes.date(false)
  ) as PageItemBuilder;

  const item = pageItemBuilder.build([]);

  t.equal(item.wording, "Date of last take ?");
  t.equal(item.variableName, "LASTT");
  t.deepEqual(item.type, ItemTypes.date(false));
  t.end();
});

test("Page item builder not fluent", t => {
  const pageItemBuilder = new PageItemBuilder(
    "Have side effects been experienced ?",
    "SIDEF",
    ItemTypes.yesno,
    undefined,
    {}
  );
  t.throws(() => pageItemBuilder.question("", "", ItemTypes.yesno));
  t.end();
});

test("Build two items contain one rule each", t => {
  const pageItemBuilder = new PageItemBuilder(
    "required",
    "REQUIRED",
    ItemTypes.text,
    undefined,
    {}
  ).required();
  const item = pageItemBuilder.build([]);
  t.equal(item.rules.length, 1);

  const pageItemBuilder2 = new PageItemBuilder(
    "required",
    "REQUIRED",
    ItemTypes.integer,
    undefined,
    {}
  ).inRange(1, 4);
  const pageItem2 = pageItemBuilder2.build([]);
  t.equal(pageItem2.rules.length, 1);
  t.end();
});

test("First item contains two rules", t => {
  const pageItemBuilder = new PageItemBuilder(
    "two rules",
    "R2",
    ItemTypes.integer,
    undefined,
    {}
  )
    .required()
    .inRange(1, 4);
  const item = pageItemBuilder.build([]);
  t.equal(item.rules.length, 2);
  const pageitemBuilder2 = new PageItemBuilder(
    "no rule",
    "R0",
    ItemTypes.yesno,
    undefined,
    {}
  );
  const pageItem2 = pageitemBuilder2.build([]);
  t.equal(pageItem2.rules.length, 0);
  t.end();
});

test("Builder returns always the same item", t => {
  const pageItemBuilder = new PageItemBuilder(
    "required",
    "REQUIRED",
    ItemTypes.text,
    undefined,
    {}
  ).required();
  const pageItem1 = pageItemBuilder.build([]);
  const pageItem2 = pageItemBuilder.build([]);
  t.equal(pageItem2, pageItem1);
  t.end();
});

test("Build a item with strict units", t => {
  const pageItemBuilder = new PageItemBuilder(
    "DLCO",
    "DLCO",
    ItemTypes.real,
    undefined,
    {}
  );
  pageItemBuilder.unit("ml", "mmHg", "mn");
  const item = pageItemBuilder.build([]);
  t.equal(item.units?.values?.length, 3);
  t.end();
});

test("Build an item with units", t => {
  const pageItemBuilder = new PageItemBuilder(
    "DLCO",
    "DLCO",
    ItemTypes.real,
    undefined,
    {}
  );
  t.false(
    (pageItemBuilder.build([]).units as { isExtendable: boolean }).isExtendable
  );
  pageItemBuilder.unit("ml", "mmHg", "mn").extendable().inRange(0, 2);
  const item = pageItemBuilder.build([]);
  t.equal(item.units?.values?.length, 3);
  t.true((item.units as { isExtendable: boolean }).isExtendable);
  t.end();
});

test("Build an item with text length", t => {
  const pageItemBuilder = new PageItemBuilder(
    "maxLength",
    "MAXLENGTH",
    ItemTypes.text,
    undefined,
    {}
  ).maxLength(10);
  const item = pageItemBuilder.build([]);
  t.equal((Rules.find(item.rules, "maxLength") as MaxLengthRule).length, 10);
  t.end();
});

test("Build a pageItem with decimal precision rule", t => {
  const pageItemBuilder = new PageItemBuilder(
    "decimalPrecision",
    "DECIMAL",
    ItemTypes.real,
    undefined,
    {}
  ).decimalPrecision(3);
  const item = pageItemBuilder.build([]);
  t.equal(
    (Rules.find(item.rules, "decimalPrecision") as DecimalPrecisionRule)
      .precision,
    3
  );
  t.end();
});

test("build an info page item", t => {
  const pageBuilder = new PageBuilder("this is a page", { defaultLang: "en" });
  pageBuilder
    .question("Test", "TEST", ItemTypes.real)
    .info("This is a page comment chained with a question", "COMMENT");
  const page = pageBuilder.build([]);
  const items = page.items.map(getItem);
  t.equal(page.items.length, 2);
  t.equal(items[1].type.name, "info");
  t.end();
});

test("Build a fixed length page item", t => {
  const builder = new PageItemBuilder(
    "Length",
    "LENGTH",
    ItemTypes.text,
    undefined,
    {}
  ).fixedLength(2);
  const item = builder.build([]);
  t.equal((Rules.find(item.rules, "fixedLength") as FixedLengthRule).length, 2);
  t.end();
});

test("Build a specify letter case page item", t => {
  const builder = new PageItemBuilder(
    "Participant initials",
    "PI",
    ItemTypes.text,
    undefined,
    {}
  ).letterCase("upper");
  const item = builder.build([]);
  t.equal(
    (Rules.find(item.rules, "letterCase") as LetterCaseRule).letterCase,
    "upper"
  );
  t.end();
});

test("Build a pinned question", t => {
  const builder = new PageItemBuilder(
    { en: "to be pinned", fr: "à épingler" },
    "PIN",
    ItemTypes.text,
    undefined,
    { defaultLang: "en" }
  );
  builder.pin("pin").translate("fr", "épingle");
  const item = builder.build([]);
  t.deepEqual(item.pin, { en: "pin", fr: "épingle" });
  t.end();
});

test("Build a pageItem with a default value", t => {
  const builder = new PageItemBuilder(
    "Question",
    "VAR",
    ItemTypes.text,
    undefined,
    {}
  ).defaultValue("The answer");
  const item = builder.build([]);
  t.equal(item.defaultValue?.value, "The answer");
  t.end();
});

test("Build a rule by its name", t => {
  const builder = new PageItemBuilder(
    "Question",
    "VAR",
    ItemTypes.text,
    undefined,
    {}
  );
  builder.rule("inRange", 1, 6);
  const item = builder.build([]);
  t.equal(item.rules[0].name, "inRange");
  t.end();
});

test("Build an item with period rule", t => {
  const builder = new PageItemBuilder(
    "Question",
    "VAR",
    ItemTypes.date(false),
    undefined,
    {}
  );
  builder.inPeriod(new Date(2020, 1, 1), new Date(2020, 11, 31));
  const item = builder.build([]);
  t.equal(item.rules[0].name, "inRange");
  t.end();
});

test("Build an item with contextual wording", t => {
  const builder = new PageBuilder("Page", { defaultLang: "en" })
    .question("V", ItemTypes.yesno)
    .wordings("Wording 1", "Wording 2")
    .translate("fr", "Enoncé 1", "Enoncé 2") as PageItemBuilder;
  const item = builder.build([]);
  t.equal(item.variableName, "V");
  t.equal(item.type, ItemTypes.yesno);
  t.deepEqual(item.wording, [
    { en: "Wording 1", fr: "Enoncé 1" },
    { en: "Wording 2", fr: "Enoncé 2" },
  ]);
  t.end();
});

test("Build an item that is modifiable only if another changes", t => {
  const b = new SurveyBuilder();
  const builder = new PageBuilder("Page", { defaultLang: "en" }, b, b);
  builder.question("Question", "U", ItemTypes.yesno);
  builder
    .question("Question", "U_D", ItemTypes.yesno)
    .modifiableWhen("U != $U") as PageItemBuilder;
  const page = builder.build([]);
  const item0 = getItem(page.items[0]);
  const item1 = getItem(page.items[1]);
  const rules = b.crossRules.map(cb => cb.build([item0, item1]));
  t.equal(rules[0].target, page.items[1]);
  t.equal(rules[0].args.formula, "$3 != $1?$4:$2");
  t.equal(rules[0].when, "always");
  t.deepLooseEqual(rules[0].pageItems, [
    [item0, "outer"],
    [item1, "outer"],
    [item0, "local"],
    [item1, "local"],
  ]);
  t.end();
});

test("Build a section with mlstring title", t => {
  const b = new SurveyBuilder();
  const builder = new PageBuilder("Page", { defaultLang: "en" }, b, b);
  builder
    .question("", "V", ItemTypes.text)
    .startSection({ en: "New section", fr: "Nouvelle section" })
    .question("", "A", ItemTypes.integer)
    .endSection();
  const page = builder.build([]);
  t.deepEqual(getItem(page.items[1]).section, {
    en: "New section",
    fr: "Nouvelle section",
  });
  t.end();
});

test("Build a multiple instance page item #168", t => {
  const naBuilder = new PageItemBuilder(
    "not an array",
    "NA",
    ItemTypes.acknowledge,
    undefined,
    {}
  );
  const na = naBuilder.build([]);
  t.false(na.array);
  const aBuilder = new PageItemBuilder(
    " -> an array",
    "NA",
    ItemTypes.acknowledge,
    undefined,
    {}
  );
  const a = aBuilder.build([]);
  t.true(a.array);
  t.end();
});

test("And activation rules if builder called multiple times", t => {
  const b = new SurveyBuilder();
  const pb = b
    .page("P")
    .question("Q1", "Q1", ItemTypes.yesno)
    .question("Q2", "Q2", ItemTypes.yesno)
    .question("Q3", "Q3", ItemTypes.yesno)
    .question("Multiple activation", "MULTACT", ItemTypes.acknowledge);
  pb.activateWhen("Q1", 3, 4);
  pb.activateWhen("Q2", 2);
  pb.activateWhen("Q3==1");
  const survey = b.build();
  t.equal(survey.crossRules[0].pageItems.length, 5);
  t.deepEqual(survey.crossRules[0].args.formula, [
    "[[(($1==3 || $1==4) && ($2==2)) && ($3==1)]]",
    3,
  ]);
  t.end();
});

test("Declare a pageitem as kpi #184", t => {
  const b = new SurveyBuilder();
  b.page("P")
    .question("Q1", "Q1", ItemTypes.real)
    .kpi({ en: "Q1", fr: "Q1" })
    .question("Q2", "Q2", ItemTypes.choice("one", "1", "2", "3"));
  const survey = b.build();
  t.deepEqual(survey.items[0].kpi, { en: "Q1", fr: "Q1" });
  t.notOk(survey.items[1].kpi);
  t.end();
});

test("Declare a pageitem as kpi #319", t => {
  const b = new SurveyBuilder();
  b.page("P")
    .question("Q1", "Q1", ItemTypes.choice("one", "1", "2", "3"))
    .question("Q2", "Q2", ItemTypes.real)
    .kpi({ en: "Q2", fr: "Q2" }, "Q1");
  const survey = b.build();
  const kpi = survey.items[1].kpi;
  if (hasPivot(kpi)) {
    t.deepLooseEqual(kpi.title, { en: "Q2", fr: "Q2" });
    t.equal(kpi.pivot, survey.items[0]);
    t.notOk(survey.items[0].kpi);
  } else t.fail();
  t.end();
});

test("Declare a pageitem as kpi #319", t => {
  const b = new SurveyBuilder();
  b.page("P1").question("Q1", "Q1", ItemTypes.choice("one", "1", "2", "3"));
  b.page("P2")
    .question("Q2", "Q2", ItemTypes.real)
    .kpi({ en: "Q2", fr: "Q2" }, "Q1");
  t.throws(() => b.build(), "pivot variable Q1 does not exist in same page");
  t.end();
});

test("Declare a critical page item #275", t => {
  const b = new SurveyBuilder();
  b.page("P1").question("Q1", "Q1", b.types.integer).critical("ae");
  const survey = b.build();
  const rule = survey.items[0].rules[0];
  t.deepEqual(
    { ...rule },
    { name: "critical", precedence: 70, event: "ae", message: "ae", values: [] }
  );
  t.end();
});

test("Declare a critical page item with trigger values #275", t => {
  const b = new SurveyBuilder();
  b.page("P1").question("Q1", "Q1", b.types.integer).critical("ae", "ae", 2, 3);
  const survey = b.build();
  const rule = survey.items[0].rules[0];
  t.deepEqual(
    { ...rule },
    {
      name: "critical",
      precedence: 70,
      event: "ae",
      message: "ae",
      values: [2, 3],
    }
  );
  t.end();
});

test("Declare a critical page item with trigger formula #275", t => {
  const b = new SurveyBuilder();
  b.page("P1")
    .question("Q0", "Q0", b.types.integer)
    .question("Q1", "Q1", b.types.integer)
    .critical("ae", "ae", b.computed("Q0 == 2"));
  const survey = b.build();
  const rule = Reflect.get(survey.crossRules[0], "rule");
  const result1 = rule.execute({ value: 2 }, { value: 1 });
  t.equal(result1[1].messages?.critical, "ae");
  const result2 = rule.execute({ value: 1 }, { value: 1 });
  t.false(result2[1].messages?.critical);
  t.end();
});
