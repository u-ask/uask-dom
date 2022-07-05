import {
  IDomainCollection,
  PageItem,
  CrossItemRule,
  Rules,
  DateType,
  TimeType,
  ChoiceType,
  RuleName,
  ScopedItem,
  Macros,
  TriggerWhen,
  getScopedItem,
} from "../domain/index.js";
import { ActivationRule } from "../domain/rule/activationrule.js";
import { Limits } from "../domain/rule/unitrule.js";
import { isComputed } from "../dsl/index.js";
export class Metadata {
  [name: string]: unknown;
  crossRules: IDomainCollection<CrossItemRule>;

  constructor(
    readonly pageItem: PageItem,
    crossRules: IDomainCollection<CrossItemRule>
  ) {
    this.crossRules = crossRules.filter(r => pageItem.isInstanceOf(r.target));
    this.activable = this.getActivable();
    this.showable = this.getShowable();
    this.computed = this.getComputed();
    [this.default, this.defaultType] = this.getDefault();
    this.memorized = this.getMemorized();
    this.maxLength = this.getMaxLength();
    this.min = this.getMinRange();
    this.max = this.getMaxRange();
    this.limits = this.getLimits();
    this.range = this.getRange();
    this.precision = this.getPrecision();
    this.required = this.getRequired();
    this.critical = this.getCritical();
    this.notification = this.getNotification();
    this.trigger = this.getTrigger();
    this.fixedLength = this.getFixedLength();
    this.letterCase = this.getLetterCase();
    this.properties = this.getProperties();
  }

  private getProperties(): unknown[] {
    const type = this.pageItem.type;
    if (type instanceof DateType)
      return [
        "date",
        ...(type.incomplete ? ["incomplete"] : []),
        ...(type.month ? ["YYYY-MM"] : ["YYYY-MM-DD"]),
      ];
    if (type instanceof TimeType) {
      if (type.duration) return ["duration", "HH:MI"];
      else return ["time", "HH24:MI"];
    }
    if (type instanceof ChoiceType && type.multiplicity == "many")
      return ["choice", "multiple"];
    return [type.name];
  }

  private getActivable(): string | undefined {
    return this.getActivation("enable");
  }

  private getShowable(): string | undefined {
    return this.getActivation("show");
  }

  private getActivation(behavior: ActivationRule["behavior"]) {
    const rule = Rules.find(this.crossRules, "activation", behavior);
    if (typeof rule == "undefined") return undefined;
    return rule.name == "dynamic"
      ? this.rewriteFormula(
          "dynamic",
          rule.pageItems,
          (rule.args.formula as string[])[0]
        )
      : this.rewriteFormula(
          "activation",
          rule.pageItems as IDomainCollection<PageItem>,
          rule.args.values as unknown[]
        );
  }

  private getComputed(when: TriggerWhen = "always") {
    const rule = Rules.find(
      this.crossRules.filter(r => r.when == when),
      "computed"
    );
    if (typeof rule == "undefined") return undefined;
    return this.rewriteFormula(
      "computed",
      rule.pageItems,
      rule.args.formula as string
    );
  }

  private getDefault(): [unknown, string | undefined] {
    const prop = this.getProperty("constant", "value");
    if (isComputed(prop)) return [prop.formula, "computed"];
    if (typeof prop != "undefined") return [prop, "constant"];
    const computed = this.getComputed("initialization");
    if (typeof computed != "undefined") return [computed, "computed"];
    const copy = Rules.find(this.crossRules, "copy");
    if (typeof copy != "undefined")
      return [getScopedItem(copy.pageItems[0]).variableName, "copy"];
    return [undefined, undefined];
  }

  private getMemorized() {
    return this.computed == Macros.memorize(this.pageItem.variableName);
  }

  private getFixedLength(): number | string | undefined {
    const prop = this.getProperty("fixedLength", "length");
    return isComputed(prop) ? prop.formula : (prop as number);
  }

  private getMaxLength(): number | string | undefined {
    const prop = this.getProperty("maxLength", "length");
    return isComputed(prop) ? prop.formula : (prop as number);
  }

  private getPrecision(): number | string | undefined {
    const prop = this.getProperty("decimalPrecision", "precision");
    return isComputed(prop) ? prop.formula : (prop as number);
  }

  private getMinRange(): number | string | Date | undefined {
    const prop = this.getProperty("inRange", "min");
    return isComputed(prop) ? prop.formula.split(",")[0] : (prop as number);
  }

  private getMaxRange(): number | string | Date | undefined {
    const prop = this.getProperty("inRange", "max");
    return isComputed(prop) ? prop.formula.split(",")[1] : (prop as number);
  }

  private getRequired(): boolean | string {
    const prop = this.getProperty("required");
    return isComputed(prop) ? prop.formula : !!prop;
  }

  private getCritical(): string | undefined {
    const prop = this.getProperty("critical", "event");
    return isComputed(prop)
      ? this.splitArrayFormula(prop.formula)[0].replace(/^'([^']+)'$/, "$1")
      : (prop as string);
  }

  private getNotification(): string | undefined {
    const prop = this.getProperty("critical", "message");
    return isComputed(prop)
      ? this.splitArrayFormula(prop.formula)[1].replace(/^'([^']+)'$/, "$1")
      : (prop as string);
  }

  private getTrigger(): string | undefined {
    const rule = Rules.find(this.crossRules, "critical");
    if (typeof rule == "undefined") return undefined;
    return rule.name == "dynamic"
      ? this.rewriteDynamic(rule)[2]
      : this.rewriteFormula(
          "critical",
          rule.pageItems as IDomainCollection<PageItem>,
          rule.args.values as unknown[]
        );
  }

  private getLetterCase(): string | undefined {
    const prop = this.getProperty("letterCase", "letterCase");
    return isComputed(prop) ? prop.formula : (prop as string);
  }

  private getRange(): string | undefined {
    if (!this.limits) return undefined;
    const minLimit = (this.limits as Limits).includeLower ? "[" : "]";
    const maxLimit = (this.limits as Limits).includeUpper ? "]" : "[";
    return `${minLimit}${this.min}, ${this.max}${maxLimit}`;
  }

  private getLimits(): Limits | undefined {
    const rule = Rules.find(this.crossRules, "inRange");
    if (!rule) return undefined;
    return (
      rule.name == "dynamic" ? rule.args.extraArgs : rule.args.limits
    ) as {
      includeLower: boolean;
      includeUpper: boolean;
    };
  }

  private getProperty(ruleName: RuleName, prop?: string) {
    const rule = Rules.find(this.crossRules, ruleName);
    if (typeof rule == "undefined") return undefined;
    return rule.name == "dynamic"
      ? {
          formula: this.rewriteFormula(
            "dynamic",
            rule.pageItems,
            (rule.args.formula as string[])[0]
          ),
        }
      : prop
      ? rule.args[prop]
      : true;
  }

  private rewriteDynamic(rule: CrossItemRule): string[] {
    const array = this.rewriteFormula(
      "dynamic",
      rule.pageItems,
      (rule.args.formula as string[])[0]
    ) as string;
    return this.splitArrayFormula(array);
  }

  private splitArrayFormula(array: string): string[] {
    return array.match(/'[^']*'|[^,]+/g) as RegExpMatchArray;
  }

  private rewriteFormula(
    ruleName: RuleName,
    pageItems: IDomainCollection<PageItem | ScopedItem>,
    formula: string | unknown[]
  ): string | undefined {
    if (ruleName == "dynamic" && typeof formula == "string")
      formula = this.extractArrayContent(formula);
    if (
      ["activation", "critical"].includes(ruleName) &&
      Array.isArray(formula)
    ) {
      if (formula.length == 0) return undefined;
      formula = this.orValues(formula);
    }
    const variableNames = pageItems?.map(p => this.rewriteVariable(p));
    return variableNames?.reduce(
      (expr, name, i) => this.replaceVariable(expr, i + 1, name),
      formula as string
    );
  }

  private extractArrayContent(formula: string): string | unknown[] {
    return formula.replace(/(\[|\])/g, "") as string;
  }

  private orValues(values: unknown[]) {
    return values
      .map(value => {
        return "$1 == " + value;
      })
      .join(" || ");
  }

  private replaceVariable(
    formula: string,
    variableIndex: number,
    variableName: string
  ) {
    const regex = new RegExp("\\$" + variableIndex, "g");
    return formula.replace(regex, variableName);
  }

  private rewriteVariable(p: PageItem | ScopedItem) {
    if (p instanceof PageItem) return p.variableName;
    const variableName = p[0].variableName;
    const level = p[1];
    if (level == "global") return "@" + variableName;
    if (level == "outer") return "$" + variableName;
    return variableName;
  }
}
