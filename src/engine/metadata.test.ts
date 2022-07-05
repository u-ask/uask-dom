import test from "tape";
import {
  limits,
  ItemTypes,
  PageItem,
  DomainCollection,
  Rules,
  CrossItemRule,
} from "../domain/index.js";
import {
  CrossRuleBuilder,
  PageItemBuilder,
  SurveyBuilder,
} from "../dsl/index.js";
import { Metadata } from "./metadata.js";

test("MaxLength test", t => {
  const item = new PageItemBuilder(
    "maxlength",
    "MAXLENGTH",
    ItemTypes.text,
    undefined,
    {}
  );
  item.maxLength(30);
  const pageItem = item.build([]);
  const metadata = new Metadata(
    pageItem,
    DomainCollection(new CrossItemRule(pageItem, pageItem.rules[0]))
  );
  t.equal(metadata.maxLength, 30);
  t.end();
});

test("Undefined max length", t => {
  const item = new PageItemBuilder(
    "maxlength",
    "MAXLENGTH",
    ItemTypes.text,
    undefined,
    {}
  );
  const pageItem = item.build([]);
  const metadata = new Metadata(pageItem, DomainCollection());
  t.false(metadata.maxLength);
  t.end();
});

test("Min max range", t => {
  const item = new PageItemBuilder(
    "range",
    "RANGE",
    ItemTypes.integer,
    undefined,
    {}
  );
  item.inRange(1, 4);
  const pageItem = item.build([]);
  const metadata = new Metadata(
    pageItem,
    DomainCollection(new CrossItemRule(pageItem, pageItem.rules[0]))
  );
  t.equal(metadata.min, 1);
  t.equal(metadata.max, 4);
  t.end();
});

test("No inrange rule", t => {
  const item = new PageItemBuilder(
    "noinrange",
    "NOINRANGE",
    ItemTypes.integer,
    undefined,
    {}
  );
  const pageItem = item.build([]);
  const metadata = new Metadata(pageItem, DomainCollection());
  t.false(metadata.min);
  t.false(metadata.max);
  t.end();
});

test("Get range all limits included test", t => {
  const item = new PageItemBuilder(
    "range",
    "RANGE",
    ItemTypes.integer,
    undefined,
    {}
  );
  item.inRange(1, 4, limits.includeBoth);
  const pageItem = item.build([]);
  const metadata = new Metadata(
    pageItem,
    DomainCollection(new CrossItemRule(pageItem, pageItem.rules[0]))
  );
  t.equal(metadata.range, "[1, 4]");
  t.end();
});

test("Get range min limit excluded test", t => {
  const item = new PageItemBuilder(
    "range",
    "RANGE",
    ItemTypes.real,
    undefined,
    {}
  );
  item.inRange(1, 4, limits.includeUpper);
  const pageItem = item.build([]);
  const metadata = new Metadata(
    pageItem,
    DomainCollection(new CrossItemRule(pageItem, pageItem.rules[0]))
  );
  t.equal(metadata.range, "]1, 4]");
  t.end();
});

test("Get range max limit excluded test", t => {
  const item = new PageItemBuilder(
    "range",
    "RANGE",
    ItemTypes.real,
    undefined,
    {}
  );
  item.inRange(1, 4, limits.includeLower);
  const pageItem = item.build([]);
  const metadata = new Metadata(
    pageItem,
    DomainCollection(new CrossItemRule(pageItem, pageItem.rules[0]))
  );
  t.equal(metadata.range, "[1, 4[");
  t.end();
});

test("Get range all limit excluded test", t => {
  const item = new PageItemBuilder(
    "range",
    "RANGE",
    ItemTypes.real,
    undefined,
    {}
  );
  item.inRange(1, 4);
  const pageItem = item.build([]);
  const metadata = new Metadata(
    pageItem,
    DomainCollection(new CrossItemRule(pageItem, pageItem.rules[0]))
  );
  t.equal(metadata.range, "]1, 4[");
  t.end();
});

test("Page item required", t => {
  const item = new PageItemBuilder(
    "required",
    "REQUIRED",
    ItemTypes.yesno,
    undefined,
    {}
  );
  item.required();
  const pageItem = item.build([]);
  const metadata = new Metadata(
    pageItem,
    DomainCollection(new CrossItemRule(pageItem, pageItem.rules[0]))
  );
  t.true(metadata.required);
  t.end();
});

test("Page item lowercased", t => {
  const item = new PageItemBuilder(
    "required",
    "REQUIRED",
    ItemTypes.yesno,
    undefined,
    {}
  );
  item.letterCase("lower");
  const pageItem = item.build([]);
  const metadata = new Metadata(
    pageItem,
    DomainCollection(new CrossItemRule(pageItem, pageItem.rules[0]))
  );
  t.equal(metadata.letterCase, "lower");
  t.end();
});

test("Page item uppercased", t => {
  const item = new PageItemBuilder(
    "required",
    "REQUIRED",
    ItemTypes.yesno,
    undefined,
    {}
  );
  item.letterCase("upper");
  const pageItem = item.build([]);
  const metadata = new Metadata(
    pageItem,
    DomainCollection(new CrossItemRule(pageItem, pageItem.rules[0]))
  );
  t.equal(metadata.letterCase, "upper");
  t.end();
});

test("Page item limits", t => {
  const item = new PageItemBuilder(
    "required",
    "REQUIRED",
    ItemTypes.yesno,
    undefined,
    {}
  );
  item.inRange(0, 5, { includeLower: true, includeUpper: false });
  const pageItem = item.build([]);
  const metadata = new Metadata(
    pageItem,
    DomainCollection(new CrossItemRule(pageItem, pageItem.rules[0]))
  );
  t.deepLooseEqual(metadata.limits, {
    includeLower: true,
    includeUpper: false,
  });
  t.end();
});

test("Page item not required", t => {
  const item = new PageItemBuilder(
    "required",
    "REQUIRED",
    ItemTypes.yesno,
    undefined,
    {}
  );
  const pageItem = item.build([]);
  const metadata = new Metadata(pageItem, DomainCollection());
  t.false(metadata.required);
  t.end();
});

test("Page item is activable", t => {
  const item1 = new PageItem("Activator", "ACTIVATOR", ItemTypes.yesno);
  const item2 = new PageItem("Activable", "ACTIVABLE", ItemTypes.integer);
  const crossRules = DomainCollection(
    new CrossRuleBuilder(
      ["ACTIVATOR", "ACTIVABLE"],
      Rules.activation([1], "enable")
    ).build([item1, item2])
  );
  const metadata1 = new Metadata(item1, crossRules);
  const metadata2 = new Metadata(item2, crossRules);
  t.false(metadata1.activable);
  t.equal(metadata2.activable, "ACTIVATOR == 1");
  t.false(metadata2.showable);
  t.end();
});

test("Page item instance is activable #227", t => {
  const item1 = new PageItem("Activator", "ACTIVATOR", ItemTypes.yesno);
  const item2 = new PageItem("Activable", "ACTIVABLE", ItemTypes.integer, {
    array: true,
  });
  const crossRules = DomainCollection(
    new CrossRuleBuilder(
      ["ACTIVATOR", "ACTIVABLE"],
      Rules.activation([1], "enable")
    ).build([item1, item2])
  );
  const metadata = new Metadata(
    item2.nextInstance().nextInstance(),
    crossRules
  );
  t.equal(metadata.activable, "ACTIVATOR == 1");
  t.false(metadata.showable);
  t.end();
});

test("Page item is showable", t => {
  const item1 = new PageItem("Activator", "ACTIVATOR", ItemTypes.yesno);
  const item2 = new PageItem("Activable", "ACTIVABLE", ItemTypes.integer);
  const crossRules = DomainCollection(
    new CrossRuleBuilder(
      ["ACTIVATOR", "ACTIVABLE"],
      Rules.activation([1], "show")
    ).build([item1, item2])
  );
  const metadata1 = new Metadata(item1, crossRules);
  const metadata2 = new Metadata(item2, crossRules);
  t.false(metadata1.showable);
  t.equal(metadata2.showable, "ACTIVATOR == 1");
  t.false(metadata2.activable);
  t.end();
});

test("Page item is showable when rule is dynamic", t => {
  const item0 = new PageItem("Control", "CONTROL", ItemTypes.yesno);
  const item1 = new PageItem("Activator", "ACTIVATOR", ItemTypes.yesno);
  const item2 = new PageItem("Activable", "ACTIVABLE", ItemTypes.integer);
  const crossRules = DomainCollection(
    new CrossRuleBuilder(
      ["ACTIVATOR", "CONTROL", "ACTIVABLE"],
      Rules.dynamic("activation", ["$1 == $2", 1], "show")
    ).build([item0, item1, item2])
  );
  const metadata2 = new Metadata(item2, crossRules);
  t.equal(metadata2.showable, "ACTIVATOR == CONTROL");
  t.end();
});

test("Page item has range when rule is dynamic", t => {
  const item1 = new PageItem("Min", "MIN", ItemTypes.yesno);
  const item2 = new PageItem("Max", "MAX", ItemTypes.integer);
  const item3 = new PageItem("Has range", "RANGE", ItemTypes.integer);
  const crossRules = DomainCollection(
    new CrossRuleBuilder(
      ["MIN", "MAX", "RANGE"],
      Rules.dynamic("inRange", ["[$1, $2]", 2])
    ).build([item1, item2, item3])
  );
  const metadata3 = new Metadata(item3, crossRules);
  t.equal(metadata3.min, "MIN");
  t.end();
});

test("No activation rule", t => {
  const pageItem = new PageItem("test", "TEST", ItemTypes.yesno);
  const metadata = new Metadata(pageItem, DomainCollection());
  t.false(metadata.activable);
  t.end();
});

test("Fixed length", t => {
  const itemBuilder = new PageItemBuilder(
    "Length",
    "LENGTH",
    ItemTypes.text,
    undefined,
    {}
  ).fixedLength(2);
  const pageItem = itemBuilder.build([]);
  const metadata = new Metadata(
    pageItem,
    DomainCollection(new CrossItemRule(pageItem, pageItem.rules[0]))
  );
  t.equal(metadata.fixedLength, 2);
  t.end();
});

test("Computed rule", t => {
  const item1 = new PageItem("A", "A", ItemTypes.yesno);
  const item2 = new PageItem("B", "B", ItemTypes.integer);
  const item3 = new PageItem("C", "C", ItemTypes.integer);
  const crossRules = DomainCollection(
    new CrossRuleBuilder(["A", "B", "C"], Rules.computed("$1 + $2")).build([
      item1,
      item2,
      item3,
    ])
  );
  const metadata3 = new Metadata(item3, crossRules);
  t.equal(metadata3.computed, "A + B");
  t.end();
});

test("Memorized metadata", t => {
  const surveyBuilder = new SurveyBuilder();
  surveyBuilder.page("P").question("V", "V", ItemTypes.text).memorize();
  const survey = surveyBuilder.build();
  const pageItem = survey.items[0];
  const metadata = new Metadata(pageItem, survey.rules);
  t.true(metadata.memorized);
  t.end();
});

test("Critical metadata #275", t => {
  const surveyBuilder = new SurveyBuilder();
  surveyBuilder
    .page("P")
    .question("V", "V", ItemTypes.integer)
    .critical("ae", "ae", 2, 3);
  const survey = surveyBuilder.build();
  const pageItem = survey.items[0];
  const metadata = new Metadata(pageItem, survey.rules);
  t.equal(metadata.critical, "ae");
  t.equal(metadata.trigger, "V == 2 || V == 3");
  t.end();
});

test("Critical metadata when event and trigger are computed #275", t => {
  const surveyBuilder = new SurveyBuilder();
  surveyBuilder
    .page("P")
    .question("U", "U", ItemTypes.integer)
    .question("V", "V", ItemTypes.integer)
    .critical(
      surveyBuilder.computed("U == 1 ? 'ae' : 'bc'"),
      "hello",
      surveyBuilder.computed("V == 2 || V == 3")
    );
  const survey = surveyBuilder.build();
  const pageItem = survey.items[1];
  const metadata = new Metadata(pageItem, survey.rules);
  t.equal(metadata.critical, "U == 1 ? 'ae' : 'bc'");
  t.equal(metadata.trigger, "V == 2 || V == 3");
  t.end();
});

test("Critical metadata when trigger only is computed #275", t => {
  const surveyBuilder = new SurveyBuilder();
  surveyBuilder
    .page("P")
    .question("V", "V", ItemTypes.integer)
    .critical("ae", "ae", surveyBuilder.computed("V == 2 || V == 3"));
  const survey = surveyBuilder.build();
  const pageItem = survey.items[0];
  const metadata = new Metadata(pageItem, survey.rules);
  t.equal(metadata.critical, "ae");
  t.equal(metadata.trigger, "V == 2 || V == 3");
  t.end();
});

test("Critical metadata with no trigger #275", t => {
  const surveyBuilder = new SurveyBuilder();
  surveyBuilder
    .page("P")
    .question("U", "U", ItemTypes.integer)
    .question("V", "V", ItemTypes.integer)
    .critical("ae");
  const survey = surveyBuilder.build();
  const pageItem = survey.items[1];
  const metadata = new Metadata(pageItem, survey.rules);
  t.equal(metadata.critical, "ae");
  t.equal(metadata.trigger, undefined);
  t.end();
});

test("Critical metadata with message #399", t => {
  const surveyBuilder = new SurveyBuilder();
  surveyBuilder
    .page("P")
    .question("V", "V", ItemTypes.integer)
    .critical(
      "ae",
      "Adverse event, please login.",
      surveyBuilder.computed("V == 2 || V == 3")
    );
  const survey = surveyBuilder.build();
  const pageItem = survey.items[0];
  const metadata = new Metadata(pageItem, survey.rules);
  t.equal(metadata.critical, "ae");
  t.equal(metadata.notification, "Adverse event, please login.");
  t.equal(metadata.trigger, "V == 2 || V == 3");
  t.end();
});

test("Default value metadata", t => {
  const surveyBuilder = new SurveyBuilder();
  surveyBuilder.page("P").question("V", "V", ItemTypes.integer).defaultValue(2);
  const survey = surveyBuilder.build();
  const pageItem = survey.items[0];
  const metadata = new Metadata(pageItem, survey.rules);
  t.equal(metadata.default, 2);
  t.equal(metadata.defaultType, "constant");
  t.equal(metadata.computed, undefined);
  t.end();
});

test("Computed default value metadata", t => {
  const surveyBuilder = new SurveyBuilder();
  surveyBuilder
    .page("P")
    .question("A", "A", ItemTypes.integer)
    .question("V", "V", ItemTypes.integer)
    .defaultValue(surveyBuilder.computed("A + 2"));
  const survey = surveyBuilder.build();
  const pageItem = survey.items[1];
  const metadata = new Metadata(pageItem, survey.rules);
  t.equal(metadata.default, "A + 2");
  t.equal(metadata.defaultType, "computed");
  t.equal(metadata.computed, undefined);
  t.end();
});

test("Copy default value metadata", t => {
  const surveyBuilder = new SurveyBuilder();
  surveyBuilder
    .page("P")
    .question("A", "A", ItemTypes.integer)
    .question("V", "V", ItemTypes.integer)
    .defaultValue(surveyBuilder.copy("A"));
  const survey = surveyBuilder.build();
  const pageItem = survey.items[1];
  const metadata = new Metadata(pageItem, survey.rules);
  t.equal(metadata.default, "A");
  t.equal(metadata.defaultType, "copy");
  t.equal(metadata.computed, undefined);
  t.end();
});
