import test from "tape";
import "../../test-extension.js";
import {
  compareRules,
  comparePrecedences,
  CrossItemRule,
  execute,
  getVariableName,
  link,
  parseVariableNames,
} from "./crossrule.js";
import { InterviewItem } from "../interviewitem.js";
import { DomainCollection } from "../domaincollection.js";
import { PageItem } from "../pageitem.js";
import { ItemTypes } from "../itemtypes.js";
import {
  ConstantRule,
  DecimalPrecisionRule,
  InRangeRule,
  RequiredRule,
} from "./unitrule.js";
import { Page } from "../page.js";
import { Survey } from "../survey.js";
import { ActivationRule } from "./activationrule.js";
import { ComputedParser, ComputedRule } from "./computedrule.js";
import { HasValue, Rule } from "./rule.js";
import { getItem } from "../pageitem.js";
import {
  inDateItem,
  Scope,
  acknowledgeItem,
  undefinedItem,
  ScopeLevel,
  globalItems,
} from "../scope.js";
import { Participant } from "../participant.js";
import { Sample } from "../sample.js";
import { Interview } from "../interview.js";
import { PageSet } from "../pageSet.js";
import { DynamicRule } from "./dynamicrule.js";
import { Rules } from "./rules.js";

const global = Scope.create(
  new Participant("002", new Sample("1"), {
    interviews: DomainCollection(
      new Interview(
        new PageSet("Inclusion"),
        {},
        { lastInput: new Date(1999, 2, 2) }
      )
    ),
  }),
  new Interview(new PageSet("Follow up"), {})
);

test("Item is target of rule", t => {
  const item = new PageItem("I need a value", "REQ", ItemTypes.integer);
  const required = new CrossItemRule(item, new RequiredRule());
  t.equal(required.target, item);
  t.end();
});

test("Rule underlying type", t => {
  const item = new PageItem("I need a value", "REQ", ItemTypes.integer);
  const required = new CrossItemRule(item, new RequiredRule());
  const inRange = new CrossItemRule(item, new InRangeRule(1, 5));
  t.true(required.is("required"));
  t.true(inRange.is("inRange"));
  t.end();
});

test("Execute multiple rules in sequence", t => {
  const item = new PageItem("I need a value", "REQ", ItemTypes.integer);
  const answer = new InterviewItem(item, 3, {
    messages: { required: "value is required" },
  });
  const rules = DomainCollection(
    new CrossItemRule(item, new RequiredRule()),
    new CrossItemRule(item, new InRangeRule(1, 5))
  );
  const result = execute(rules, global.with([answer])).items;
  t.deepEqual(result[0].messages, {});
  t.end();
});

test("Execute rule with context", t => {
  const pageItem = new PageItem("I need a value", "REQ", ItemTypes.integer);
  const answer = new InterviewItem({ pageItem, context: 0 }, 3, {
    messages: { required: "value is required" },
  });
  const rules = DomainCollection(
    new CrossItemRule(pageItem, new RequiredRule()),
    new CrossItemRule(pageItem, new InRangeRule(1, 5))
  );
  const result = execute(rules, global.with([answer])).items;
  t.deepEqual(result[0].messages, {});
  t.end();
});

test("Activation and required rules when not activated", t => {
  const { survey, item0, item1 } = buildActivationRequiredCase();
  const scope = global.with([
    new InterviewItem(item0, 2),
    new InterviewItem(item1, 2),
  ]);
  const result = execute(survey.rules, scope).items;
  t.false(result[1].value);
  t.equal(result[1].specialValue, "notApplicable");
  t.deepEqual(result[1].messages, {});
  t.end();
});

test("Activation and required rules when activated", t => {
  const { survey, item0, item1 } = buildActivationRequiredCase();
  const scope = global.with([
    new InterviewItem(item0, 1),
    new InterviewItem(item1, undefined, { specialValue: "unknown" }),
  ]);
  const result = execute(survey.rules, scope).items;
  t.false(result[1].value);
  t.equal(result[1].specialValue, "unknown");
  t.true(result[1].messages.required);
  t.end();
});

test("Rule has args", t => {
  class FakeRule implements Rule {
    precedence = 0;
    name = "fake";
    execute = (a1: HasValue, a2: HasValue) => [a1, a2];
    fake = "haha";
  }
  const poids = new PageItem("Poids ?", "POIDS", ItemTypes.integer);
  const taille = new PageItem("Taille ?", "TAILLE", ItemTypes.integer);
  const cross = new CrossItemRule(
    DomainCollection(poids, taille),
    new FakeRule()
  );
  t.equal(cross.args.fake, "haha");
  t.end();
});

test("Computed and precision precedence", t => {
  const { survey, poids, taille, imc } = buildComputedPrecisionCase();
  const scope = global.with([
    new InterviewItem(poids, 70),
    new InterviewItem(taille, 1.6),
    new InterviewItem(imc, undefined),
  ]);
  const result = execute(survey.rules, scope).items;
  t.equal(result[2].value, 27.34);
  t.end();
});

test("Computed and required precedence", t => {
  const { age, included, crossRule } = buildComputedRequiredCase();
  const scope = global.with([
    new InterviewItem(age, 1),
    new InterviewItem(included, undefined),
  ]);
  const result = execute(DomainCollection(crossRule), scope).items;
  t.equal(result[1].value, 1);
  t.deepEqual(result[1].messages, {});
  t.end();
});

test("Test @INDATE", t => {
  const date = new PageItem("date ?", "DATE", ItemTypes.date(false));
  const parsed = ComputedParser.parse("DATE", "@INDATE");
  const crossRule = link(
    {
      variableNames: parsed.variableNames,
      rule: new ComputedRule(parsed.formula),
    },
    [date, inDateItem]
  );
  const scope = global.with([new InterviewItem(date, undefined)]);
  const result = execute(DomainCollection(crossRule), scope).items;
  t.deepEqual(result[0].value, new Date(1999, 2, 2));
  t.end();
});

test("Test @ACK", t => {
  const question = new PageItem(
    "Participant is included ?",
    "Q",
    ItemTypes.acknowledge
  );
  const parsed = ComputedParser.parse("Q", "@ACK");
  const crossRule = link(
    {
      variableNames: parsed.variableNames,
      rule: new ComputedRule(parsed.formula),
    },
    [question, acknowledgeItem]
  );
  const scope = global.with([new InterviewItem(question, undefined)]);
  const result = execute(DomainCollection(crossRule), scope).items;
  t.deepEqual(result[0].value, 1);
  t.end();
});

test("Test @UNDEF", t => {
  const question = new PageItem(
    "Participant is included ?",
    "Q",
    ItemTypes.acknowledge
  );
  const parsed = ComputedParser.parse("Q", "@UNDEF");
  const crossRule = link(
    {
      variableNames: parsed.variableNames,
      rule: new ComputedRule(parsed.formula),
    },
    [question, undefinedItem],
    "initialization"
  );
  const scope = global.with([new InterviewItem(question, undefined)]);
  const result = execute(DomainCollection(crossRule), scope, [
    "initialization",
  ]).items;
  t.deepEqual(result[0].value, undefined);
  t.end();
});

function buildComputedPrecisionCase() {
  const poids = new PageItem("Poids ?", "POIDS", ItemTypes.integer);
  const taille = new PageItem("Taille ?", "TAILLE", ItemTypes.integer);
  const imc = new PageItem("IMC ?", "IMC", ItemTypes.integer, {
    rules: DomainCollection(new DecimalPrecisionRule(2)),
  });
  const page = new Page("Test page", {
    includes: DomainCollection(poids, taille, imc),
  });
  const survey = new Survey("Test survey", {
    pages: DomainCollection(page),
    crossRules: DomainCollection(
      new CrossItemRule(
        page.items.map(getItem),
        new ComputedRule("$1 / ($2 * $2)")
      )
    ),
  });
  return { survey, poids, taille, imc };
}

function buildComputedRequiredCase() {
  const age = new PageItem("AGE > 18 ?", "AGE", ItemTypes.yesno);
  const included = new PageItem(
    "__INCLUDED ?",
    "__INCLUDED",
    ItemTypes.acknowledge,
    {
      rules: DomainCollection(new RequiredRule()),
    }
  );
  const parsed = ComputedParser.parse("__INCLUDED", "AGE ? @ACK : @UNDEF");
  const crossRule = link(
    {
      variableNames: parsed.variableNames,
      rule: new ComputedRule(parsed.formula),
    },
    [age, included, acknowledgeItem, undefinedItem]
  );
  return { age, included, crossRule };
}

test("Cross rule with outer scope items", t => {
  const { pageItem, rules } = buildOuterCase();
  const scope = Scope.create(
    [{ items: [new InterviewItem(pageItem, 1, { context: 0 })] }],
    {
      items: [new InterviewItem(pageItem, 2, { context: 1 })],
    }
  );
  const result = execute(rules, scope).items;
  t.equal(result.length, 1);
  t.equal(result[0].value, 0);
  t.equal(result[0].context, 1);
  t.end();
});

test("Get variable name", t => {
  t.equal(getVariableName(acknowledgeItem), "ACK");
  t.equal(getVariableName([acknowledgeItem, "global"]), "@ACK");
  t.equal(getVariableName([acknowledgeItem, "outer"]), "$ACK");
  t.equal(getVariableName([acknowledgeItem, "local"]), "ACK");
  t.end();
});

test("Parse variable with level", t => {
  const parsed = parseVariableNames(["POIDS", "$POIDS", "@POIDS"]);
  t.deepEqual(parsed, [
    ["POIDS", "local"],
    ["POIDS", "outer"],
    ["POIDS", "global"],
  ]);
  t.end();
});

test("Variable name linked to scoped item", t => {
  const age = new PageItem("AGE", "AGE", ItemTypes.integer);
  const crossRule = link(
    {
      variableNames: ["@ACK", "AGE"],
      rule: new ComputedRule("$1"),
    },
    [acknowledgeItem, age]
  );
  t.deepEqual(crossRule.pageItems[0], [acknowledgeItem, "global"]);
  t.deepEqual(crossRule.pageItems[1], [age, "local"]);
  t.end();
});

test("Computed rule retreives last item value", t => {
  const c = ComputedParser.parse("POIDS", "$POIDS");
  const rule = new ComputedRule(c.formula, c.variableNames.length);
  const pageItem = new PageItem("POIDS", "POIDS", ItemTypes.integer);
  const crossRule = link({ variableNames: c.variableNames, rule }, [pageItem]);
  const scope = Scope.create([{ items: [new InterviewItem(pageItem, 70)] }], {
    items: [new InterviewItem(pageItem, undefined)],
  });
  const result = execute(DomainCollection(crossRule), scope).items;
  t.equal(result[0].value, 70);
  t.end();
});

test("Cross item rule event triggers", t => {
  const { rules } = buildRulesThatTriggerOn();
  t.equal(rules[0].when, "initialization");
  t.equal(rules[1].when, "always");
  t.end();
});

test("Execute rules that always trigger", t => {
  const { items, rules } = buildRulesThatTriggerOn();
  const scope = global.with(items);
  const result = execute(rules, scope).items;
  t.equal(result[0].value, undefined);
  t.equal(result[1].value, 1);
  t.end();
});

test("Execute rules on initialization", t => {
  const { items, rules } = buildRulesThatTriggerOn();
  const scope = global.with(items);
  const result = execute(rules, scope, ["always", "initialization"]).items;
  t.equal(result[0].value, 1);
  t.equal(result[1].value, 2);
  t.end();
});

test("Target precedences comparison", t => {
  const pageItem1 = new PageItem("Q", "Q", ItemTypes.real);
  const rule1 = new CrossItemRule(pageItem1, new DecimalPrecisionRule(2));
  const rule2 = new CrossItemRule(
    DomainCollection(pageItem1),
    new ComputedRule("2.3456")
  );
  t.ok(comparePrecedences(rule1, rule2) > 0);
  t.ok(compareRules([68, rule1], [129, rule2]) > 0);
  t.end();
});

test("Rule executed with missing item in scope", t => {
  const { pageItem1, pageItem2, rule } = buildComputedRule();
  const item2 = new InterviewItem(pageItem2, undefined);
  const scope = Scope.create([], {
    items: [item2],
    pageSet: { items: [pageItem1, pageItem2] },
  });
  const result = execute(DomainCollection(rule), scope).items;
  t.equal(result.length, 1);
  t.equal(result[0].pageItem, pageItem2);
  t.equal(result[0].value, 1);
  t.end();
});

test("Rule with missing target in scope not executed", t => {
  const { pageItem1, pageItem2, rule } = buildComputedRule();
  const item1 = new InterviewItem(pageItem1, undefined);
  const scope = Scope.create([], {
    items: [item1],
    pageSet: { items: [pageItem1, pageItem2] },
  });
  const result = execute(DomainCollection(rule), scope).items;
  t.equal(result.length, 1);
  t.equal(result[0].pageItem, pageItem1);
  t.notok(result[0].value);
  t.end();
});

test("Rule with undefined item in scope not executed", t => {
  const { pageItem2, rule } = buildComputedRule();
  const item2 = new InterviewItem(pageItem2, undefined);
  const scope = Scope.create([], {
    items: [item2],
    pageSet: { items: [pageItem2] },
  });
  const result = execute(DomainCollection(rule), scope).items;
  t.equal(result.length, 1);
  t.equal(result[0].pageItem, pageItem2);
  t.notok(result[0].value);
  t.end();
});

test("Value reset if activated", t => {
  const { item0, item1, survey } = buildActivationDefaultCase();
  const scope = global.with([
    new InterviewItem(item0, 1),
    new InterviewItem(item1, undefined, { specialValue: "notApplicable" }),
  ]);
  const result = execute(survey.rules, scope).items;
  t.equal(result[0].value, 1);
  t.equal(result[1].value, 2);
  t.end();
});

test("Value not reset if not activated", t => {
  const { item0, item1, survey } = buildActivationDefaultCase();
  const scope = global.with([
    new InterviewItem(item0, 1),
    new InterviewItem(item1, 3),
  ]);
  const result = execute(survey.rules, scope).items;
  t.equal(result[0].value, 1);
  t.equal(result[1].value, 3);
  t.end();
});

test("Execute rules on whole participant", t => {
  const { pageItem, rules } = buildOuterCase();
  const pageSet = new PageSet("", {
    pages: DomainCollection(
      new Page("", { includes: DomainCollection(pageItem) })
    ),
  });
  const participant = new Participant("00001", new Sample("001"), {
    interviews: DomainCollection(
      new Interview(
        pageSet,
        {},
        {
          items: DomainCollection(
            new InterviewItem(pageItem, 5, {
              messages: { required: "should disappear" },
            })
          ),
        }
      ),
      new Interview(
        pageSet,
        {},
        { items: DomainCollection(new InterviewItem(pageItem, 5)) }
      ),
      new Interview(
        pageSet,
        {},
        { items: DomainCollection(new InterviewItem(pageItem, 5)) }
      )
    ),
  });
  const result = execute(rules, participant).interviews;
  t.equal(result[0].items[0].value, 5);
  t.deepEqual(result[0].items[0].messages, {});
  t.equal(result[1].items[0].value, 4);
  t.equal(result[2].items[0].value, 3);
  t.end();
});

test("Rule execution for multiple instance target", t => {
  const a0 = new PageItem("A0", "A1", ItemTypes.yesno);
  const a1 = new PageItem(" -> A1", "A1", ItemTypes.yesno, {
    array: true,
  });
  const a2 = new PageItem(" -> A2", "A2", ItemTypes.yesno, {
    array: true,
  });
  const { formula, variableNames } = ComputedParser.parse("A2", "A0 && A1");
  const rule = new ComputedRule(formula, variableNames.length);
  const crossRule = new CrossItemRule(DomainCollection(a0, a1, a2), rule);
  const items = DomainCollection(
    new InterviewItem(a0, 1),
    new InterviewItem(a1, 1),
    new InterviewItem(a2, undefined),
    new InterviewItem(a1.nextInstance(), 0),
    new InterviewItem(a2.nextInstance(), undefined)
  );
  const scope = Scope.create([], {
    items,
    pageSet: { items: [a0, a1, a2] },
  });
  const result = execute(DomainCollection(crossRule), scope).items;
  t.equal(result[2].value, 1);
  t.equal(result[4].value, 0);
  t.end();
});

test("Rule execution with partial initialization #231", t => {
  const pageItemA = new PageItem("A", "A", ItemTypes.text, { array: true });
  const pageItemB = new PageItem("B", "B", ItemTypes.text, { array: true });
  const ruleA = new CrossItemRule(
    pageItemA,
    new ConstantRule("A"),
    "initialization"
  );
  const ruleB = new CrossItemRule(
    pageItemB,
    new ConstantRule("B"),
    "initialization"
  );
  const itemA1 = new InterviewItem(pageItemA, undefined);
  const itemB1 = new InterviewItem(pageItemB, undefined);
  const itemA2 = new InterviewItem(pageItemA.nextInstance(), undefined);
  const itemB2 = new InterviewItem(pageItemB.nextInstance(), undefined);
  const scope = Scope.create([], { items: [itemA1, itemB1, itemA2, itemB2] });
  const result = execute(DomainCollection(ruleA, ruleB), scope, {
    initialization: [itemA2, itemB2],
  }).items;
  t.equal(result[0].value, undefined);
  t.equal(result[1].value, undefined);
  t.equal(result[2].value, "A");
  t.equal(result[3].value, "B");
  t.end();
});

test("Rule that depends on sample #257", t => {
  const pageItem = new PageItem("activate for sample A", "ACT_A", ItemTypes.text);
  const rule = new ActivationRule(["A", "B"], "enable");

  const crossRule = link({ variableNames: ["@SAMPLE", "ACT_A"], rule }, [
    ...globalItems,
    pageItem,
  ]);

  const participant1 = new Participant("01", new Sample("A"));
  const scope1 = Scope.create(participant1).with([
    new InterviewItem(pageItem, "Activated"),
  ]);
  const result1 = execute(DomainCollection(crossRule), scope1, [
    "always",
  ]).items;
  t.equal(result1[0].value, "Activated");
  t.equal(result1[0].specialValue, undefined);

  const participant2 = new Participant("01", new Sample("c"));
  const scope2 = Scope.create(participant2).with([
    new InterviewItem(pageItem, "Activated"),
  ]);
  const result2 = execute(DomainCollection(crossRule), scope2, [
    "always",
  ]).items;
  t.equal(result2[0].value, undefined);
  t.equal(result2[0].specialValue, "notApplicable");

  t.end();
});

test("Computed activation rule precedence #264", t => {
  const pageItem1 = new PageItem("A", "A", ItemTypes.yesno);
  const pageItem2 = new PageItem("B", "B", ItemTypes.yesno);
  const dynamical = new DynamicRule(
    Rules.activation,
    new ComputedRule("[[$1]]", 1),
    "show"
  );
  const defaultValue = new CrossItemRule(
    pageItem2,
    new ConstantRule(0),
    "initialization"
  );
  const activation = new CrossItemRule(
    DomainCollection(
      [pageItem1, "local"],
      [acknowledgeItem, "global"],
      [pageItem2, "local"]
    ),
    dynamical
  );
  const interviewItem1 = new InterviewItem(pageItem1, 0);
  const interviewItem2 = new InterviewItem(pageItem2, undefined);
  const scope = global.with([interviewItem1, interviewItem2]);
  const result = execute(DomainCollection(activation, defaultValue), scope, [
    "always",
    "initialization",
  ]).items;
  t.equal(result[1].value, undefined);
  t.equal(result[1].specialValue, "notApplicable");
  t.end();
});

test("Execute all rules for participant", t => {
  const pageItem = new PageItem("", "", ItemTypes.integer);
  const pageSet = new PageSet("");
  const interview1 = new Interview(
    pageSet,
    {},
    {
      items: DomainCollection(new InterviewItem(pageItem, 7)),
    }
  );
  const interview2 = new Interview(
    pageSet,
    {},
    {
      items: DomainCollection(new InterviewItem(pageItem, 7)),
    }
  );
  const interview3 = new Interview(
    pageSet,
    {},
    {
      items: DomainCollection(new InterviewItem(pageItem, 7)),
    }
  );
  const participant = new Participant("", new Sample(""), {
    interviews: DomainCollection(interview1, interview2, interview3),
  });
  const rangeRule = new CrossItemRule(pageItem, new InRangeRule(1, 5));
  const executed = execute(
    DomainCollection(rangeRule),
    participant,
    ["always"],
    interview2
  );
  t.false(executed.interviews[0].items[0].messages.inRange);
  t.true(executed.interviews[1].items[0].messages.inRange);
  t.true(executed.interviews[2].items[0].messages.inRange);
  t.end();
});

test("Participant not updated when no change", t => {
  const pageItem = new PageItem("", "", ItemTypes.integer);
  const pageSet = new PageSet("");
  const interview1 = new Interview(
    pageSet,
    {},
    {
      items: DomainCollection(new InterviewItem(pageItem, 4)),
    }
  );
  const participant = new Participant("", new Sample(""), {
    interviews: DomainCollection(interview1),
  });
  const rangeRule = new CrossItemRule(pageItem, new InRangeRule(1, 5));
  const executed = execute(DomainCollection(rangeRule), participant, ["always"]);
  t.equal(executed, participant);
  t.end();
});

function buildOuterCase() {
  const rule = new ComputedRule("$1 - 1");
  const pageItem = new PageItem("Outer scope", "VAR", ItemTypes.integer);
  const cross = new CrossItemRule(
    DomainCollection(<const>[pageItem, "outer"], <const>[pageItem, "local"]),
    rule
  );
  const rules = DomainCollection(cross);
  return { pageItem, rules };
}

function buildActivationRequiredCase() {
  const item0 = new PageItem(
    "I activate the next item",
    "ACT",
    ItemTypes.integer
  );
  const item1 = new PageItem(
    "I need a value when activated",
    "REQ",
    ItemTypes.integer,
    { rules: DomainCollection(new RequiredRule()) }
  );
  const page = new Page("Test page", {
    includes: DomainCollection(item0, item1),
  });
  const survey = new Survey("Test survey", {
    pages: DomainCollection(page),
    crossRules: DomainCollection(
      new CrossItemRule(page.items.map(getItem), ActivationRule.enable(1))
    ),
  });
  return { survey, item0, item1 };
}

function buildActivationDefaultCase() {
  const item0 = new PageItem(
    "I activate the next item",
    "ACT",
    ItemTypes.integer
  );
  const item1 = new PageItem(
    "I have a default value when activated",
    "REQ",
    ItemTypes.integer
  );
  const page = new Page("Test page", {
    includes: DomainCollection(item0, item1),
  });
  const survey = new Survey("Test survey", {
    pages: DomainCollection(page),
    crossRules: DomainCollection(
      new CrossItemRule(
        page.items.map(getItem),
        ActivationRule.enable(1, 3, 5)
      ),
      new CrossItemRule(
        page.items.map(getItem),
        new ComputedRule("$1+1"),
        "initialization"
      )
    ),
  });
  return { item0, item1, survey };
}

function buildComputedRule() {
  const pageItem1 = new PageItem("Missing", "M", ItemTypes.integer);
  const pageItem2 = new PageItem("Target", "T", ItemTypes.acknowledge);
  const rule = new CrossItemRule(
    DomainCollection<[PageItem, ScopeLevel]>(
      [pageItem1, "local"],
      [acknowledgeItem, "global"],
      [undefinedItem, "global"],
      [pageItem2, "local"]
    ),
    new ComputedRule("$1?$3:$2")
  );
  return { pageItem1, pageItem2, rule };
}

function buildRulesThatTriggerOn() {
  const pageItem0 = new PageItem("", "INIT", ItemTypes.integer);
  const rule0 = new CrossItemRule(
    pageItem0,
    new ConstantRule(1),
    "initialization"
  );
  const pageItem1 = new PageItem("", "ALWAYS", ItemTypes.integer);
  const rule1 = new CrossItemRule(
    DomainCollection(pageItem0, pageItem1),
    new ComputedRule("($1 ?? 0) + 1")
  );
  const item0 = new InterviewItem(pageItem0, undefined);
  const item1 = new InterviewItem(pageItem1, undefined);
  const items = [item0, item1];
  const rules = DomainCollection(rule0, rule1);
  return { items, rules };
}
