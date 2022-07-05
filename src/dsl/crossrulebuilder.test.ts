import test from "tape";
import { PageItem, ItemTypes, ComputedParser, Rules } from "../domain/index.js";
import { acknowledgeItem, inDateItem, undefinedItem } from "../domain/scope.js";
import { CrossRuleBuilder } from "./crossrulebuilder.js";

test("Build cross rules", t => {
  const pageItem1 = new PageItem(
    "Did you take the pills ?",
    "Q1",
    ItemTypes.yesno
  );
  const pageItem2 = new PageItem("Since when ?", "Q2", ItemTypes.date(true));
  const crossRule = new CrossRuleBuilder(
    ["Q1", "Q2"],
    Rules.activation([true], "enable")
  ).build([pageItem1, pageItem2]);
  t.deepLooseEqual(crossRule.pageItems, [
    [pageItem1, "local"],
    [pageItem2, "local"],
  ]);
  const items = [{ value: true }, { value: "ok" }];
  t.deepEqual(crossRule.execute(...items), items);
  t.end();
});

test("Build a computed rule with @INDATE", t => {
  const pageItem = new PageItem("Date ?", "DT1", ItemTypes.date(false));
  const { variableNames, formula } = ComputedParser.parse("DT1", "@INDATE");
  const rule = Rules.computed(formula);
  const crossRule = new CrossRuleBuilder(variableNames, rule).build([pageItem]);
  t.deepLooseEqual(crossRule.pageItems, [
    [inDateItem, "global"],
    [pageItem, "local"],
  ]);
  t.end();
});

test("Build a computed rule with @ACK", t => {
  const pageItem = new PageItem(
    "Participant is included ?",
    "INC",
    ItemTypes.acknowledge
  );
  const { variableNames, formula } = ComputedParser.parse("INC", "@ACK");
  const rule = Rules.computed(formula);
  const crossRule = new CrossRuleBuilder(variableNames, rule).build([pageItem]);
  t.deepLooseEqual(crossRule.pageItems, [
    [acknowledgeItem, "global"],
    [pageItem, "local"],
  ]);
  t.end();
});

test("Build a computed rule with @UNDEF", t => {
  const pageItem = new PageItem(
    "Participant is included ?",
    "INC",
    ItemTypes.acknowledge
  );
  const { variableNames, formula } = ComputedParser.parse("INC", "@UNDEF");
  const rule = Rules.computed(formula);
  const crossRule = new CrossRuleBuilder(variableNames, rule).build([pageItem]);
  t.deepLooseEqual(crossRule.pageItems, [
    [undefinedItem, "global"],
    [pageItem, "local"],
  ]);
  t.end();
});

test("Build a computed rule that violates strict order", t => {
  const pageItem0 = new PageItem(
    "Participant is elligible ?",
    "ELLIG",
    ItemTypes.acknowledge
  );
  const pageItem1 = new PageItem(
    "Participant is included ?",
    "INCL",
    ItemTypes.acknowledge
  );
  const { variableNames, formula } = ComputedParser.parse("ELLIG", "INCL");
  const rule = Rules.computed(formula);
  const crossRuleBuilder = new CrossRuleBuilder(
    variableNames,
    rule,
    undefined,
    true
  );
  t.throws(
    () => crossRuleBuilder.build([pageItem0, pageItem1]),
    /Variable INCL used in ELLIG must be declared before/
  );
  t.end();
});
