import test from "tape";
import "../../test-extension.js";
import { PageItem } from "../pageitem.js";
import { ItemTypes } from "../itemtypes.js";
import { ComputedParser, ComputedRule } from "./computedrule.js";
import { CrossRule, link } from "./crossrule.js";
import { InterviewItem } from "../interviewitem.js";

test("Computed rule creation", t => {
  const imc = new ComputedRule("$1 / ($2 * $2)");
  testImc(t, imc);
  t.end();
});

test("Computed cross rule helper", t => {
  const { crossRule, taille, poids, imc } = buildComputedExample();
  t.deepLooseEqual(crossRule.pageItems, [
    [poids, "local"],
    [taille, "local"],
    [imc, "local"],
  ]);
  testImc(t, crossRule);
  t.end();
});

test("Computed with unauthorized code", t => {
  const hack = () => new ComputedRule("getSecretData()");
  t.throws(hack);
  t.end();
});

test("Computed cross rule result", t => {
  const { crossRule } = buildComputedExample();
  testImc(t, crossRule);
  t.end();
});

function testImc(t: test.Test, imc: CrossRule) {
  const poids = { value: 70 };
  const taille = { value: 1.6 };
  const result = imc.execute(poids, taille, { value: undefined });
  t.almostEqual(result[2].value, 27.3, 0.1);
}

test("Computed rule with nan result", t => {
  const { crossRule } = buildComputedExample();
  const poids = { value: undefined };
  const taille = { value: undefined };
  const imc = { value: undefined };
  const result = crossRule.execute(poids, taille, imc);
  t.equal(result[2], imc);
  t.true(result[2].value == undefined);
  t.end();
});

test("Computed expression parsing", t => {
  const { variableNames, formula } = ComputedParser.parse(
    "IMC",
    "POIDS / (TAILLE * TAILLE)"
  );
  const rule = new ComputedRule(formula);
  t.equal(rule.formula, "$1 / ($2 * $2)");
  t.deepEqual(variableNames, ["POIDS", "TAILLE", "IMC"]);
  t.end();
});

test("Variable replacement when substring of eachother", t => {
  const { variableNames, formula } = ComputedParser.parse(
    "__INCLUDED",
    "NOM && PRENOM"
  );
  const rule = new ComputedRule(formula);
  t.equal(rule.formula, "$1 && $2");
  t.deepEqual(variableNames, ["NOM", "PRENOM", "__INCLUDED"]);
  t.end();
});

test("Computed ternary expression", t => {
  const { formula } = ComputedParser.parse("COAL", "FOO == 'V' ? @BAR : 'BAZ'");
  t.equal(formula, "$2 == 'V' ? $1 : 'BAZ'");
  t.end();
});

test("Realistic computed rule", t => {
  const c = ComputedParser.parse(
    "__INCLUDED",
    "PAT_NOM && $EFR_DATE ? @ACK : @UNDEF"
  );
  new ComputedRule(c.formula, c.variableNames.length);
  t.pass("formula should be valid");
  t.end();
});

test("Variable names cannot start with single underscore", t => {
  const { variableNames, formula } = ComputedParser.parse("P", "$A _A __A");
  t.deepEqual(variableNames, ["$A", "__A", "P"]);
  t.equal(formula, "$1 _A $2");
  t.end();
});

test("Computed rule with outer item value", t => {
  const c = ComputedParser.parse("POIDS", "$POIDS");
  const rule = new ComputedRule(c.formula, c.variableNames.length);
  const { poids } = buildPageItems();
  const crossRule = link({ variableNames: c.variableNames, rule }, [poids]);
  t.deepLooseEqual(crossRule.pageItems, [
    [poids, "outer"],
    [poids, "local"],
  ]);
  t.end();
});

test("Transpile rule with date literal", t => {
  const tr = ComputedRule.transpile("[#1900-01-01#,$1]");
  t.equal(tr, "[new Date('1900-01-01'),$1]");
  t.end();
});

test("Computed rule with date literal", t => {
  const c = ComputedParser.parse("MINDATE", "#1900-01-01#");
  const rule = new ComputedRule(c.formula, c.variableNames.length);
  const { value } = rule.execute({})[0];
  t.deepEqual(value, new Date("1900-01-01"));
  t.end();
});

test("Computed rule with item that reference itself", t => {
  const c = ComputedParser.parse(
    "DATE",
    "!DATE ? $(#2021-04-06#, 'I') : $() == 'I' ? $(#2021-04-07#, 'N') : $(#2021-04-08#, 'L')"
  );
  const rule = new ComputedRule(c.formula, c.variableNames.length);
  const date = new PageItem("Date", "DATE", ItemTypes.date());
  const crossRule = link({ variableNames: c.variableNames, rule }, [date]);
  const item = new InterviewItem(date, undefined);
  const [result1] = crossRule.execute(item);
  t.deepEqual(result1.context, [0, "I"]);
  const [result2] = crossRule.execute(result1);
  t.deepEqual(result2.context, [0, "N"]);
  const [result3] = crossRule.execute(result2);
  t.deepEqual(result3.context, [0, "L"]);
  const [result4] = crossRule.execute(result3);
  t.equal(result4.context, result3.context);
  t.end();
});

test("Computed rule with with array or string inclusions", t => {
  const { formula, variableNames } = ComputedParser.parse(
    "OTH",
    "~IN(ACT1, '99') && ACT2=='3'"
  );
  const rule = new ComputedRule(formula, variableNames.length);
  const other = new PageItem("Other", "OTH", ItemTypes.date());
  const act1 = new PageItem("Activator", "ACT1", ItemTypes.date());
  const act2 = new PageItem("Activator", "ACT2", ItemTypes.date());
  const crossRule = link({ variableNames, rule }, [other, act1, act2]);
  const result1 = crossRule.execute({ value: "99" }, { value: "3" }, {});
  t.equal(result1[2].value, true);
  const result2 = crossRule.execute(
    { value: ["45", "99"] },
    { value: "3" },
    {}
  );
  t.equal(result2[2].value, true);
  const result3 = crossRule.execute({ value: "1999" }, { value: "3" }, {});
  t.equal(result3[2].value, true);
  const result4 = crossRule.execute(
    { value: ["45", "1999"] },
    { value: "3" },
    {}
  );
  t.equal(result4[2].value, false);
  const result5 = crossRule.execute({ value: "45" }, { value: "3" }, {});
  t.equal(result5[2].value, false);
  t.end();
});

test("Do not parse string content", t => {
  const { variableNames, formula } = ComputedParser.parse(
    "R",
    "(A/B) > 1 ? 'C/D' : 'E-F'"
  );
  t.deepEqual(variableNames, ["A", "B", "R"]);
  t.equal(formula, "($1/$2) > 1 ? 'C/D' : 'E-F'");
  t.end();
});

test("Memento defaults to value", t => {
  const { formula, variableNames } = ComputedParser.parse("V", "$(U)");
  const rule = new ComputedRule(formula, variableNames.length);
  const result = rule.execute({ value: 2 }, { value: 1 });
  t.equal(result[1].value, 2);
  t.deepEqual(result[1].context, [0, 2]);
  t.end();
});

test("Check if special value is NA", t => {
  const { formula, variableNames } = ComputedParser.parse("VAR", "~NA(V)?1:0");
  const rule = new ComputedRule(formula, variableNames.length);
  const result1 = rule.execute({ value: 1 });
  t.equal(result1[0].value, 0);
  const result2 = rule.execute({ value: undefined });
  t.equal(result2[0].value, 0);
  const result3 = rule.execute({ specialValue: "notApplicable" });
  t.equal(result3[0].value, 1);
  t.end();
});

test("Memorize value", t => {
  const { formula, variableNames } = ComputedParser.parse(
    "VAR",
    "~NA(V)?~MEM(~M):~MEM(V)"
  );
  const rule = new ComputedRule(formula, variableNames.length);
  const result1 = rule.execute({ value: 1, context: [0, 5] });
  t.equal(result1[0].value, 1);
  t.deepEqual(result1[0].context, [0, 1]);
  const result2 = rule.execute({ value: undefined, context: [0, 5] });
  t.equal(result2[0].value, undefined);
  t.deepEqual(result2[0].context, [0, "~MEM:undefined"]);
  const result3 = rule.execute({
    specialValue: "notApplicable",
    context: [0, 5],
  });
  t.equal(result3[0].value, 5);
  t.deepEqual(result3[0].context, [0, 5]);
  t.end();
});

function buildComputedExample() {
  const { imc, taille, poids } = buildPageItems();
  const parsed = ComputedParser.parse("IMC", "POIDS / (TAILLE * TAILLE)");
  const crossRule = link(
    {
      variableNames: parsed.variableNames,
      rule: new ComputedRule(parsed.formula),
    },
    [imc, taille, poids]
  );
  return { crossRule, taille, poids, imc };
}

function buildPageItems() {
  const poids = new PageItem("Poids ?", "POIDS", ItemTypes.integer);
  const taille = new PageItem("Taille ?", "TAILLE", ItemTypes.integer);
  const imc = new PageItem("IMC ?", "IMC", ItemTypes.integer);
  return { imc, taille, poids };
}
