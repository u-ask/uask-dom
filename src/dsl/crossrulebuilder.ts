import {
  CrossItemRule,
  PageItem,
  link,
  getRuleArgs,
  CrossRule,
  RuleName,
  RuleArgs,
  TriggerWhen,
  UnitRule,
} from "../domain/index.js";
import { ICrossRuleBuilder } from "./builders.js";
import { DNode } from "./abstracttree.js";
import { getScopedItem, globalItems } from "../domain/scope.js";
import { DynamicRule } from "../domain/rule/dynamicrule.js";

export class CrossRuleBuilder
  implements ICrossRuleBuilder, DNode<CrossItemRule>
{
  readonly name: string;
  readonly precedence: number;
  readonly args: Record<string, unknown>;
  when: TriggerWhen = "always";

  constructor(
    readonly variableNames: string[],
    private readonly _rule: CrossRule | UnitRule,
    private builder?: ICrossRuleBuilder,
    private strict: boolean = false
  ) {
    this.name =
      _rule instanceof DynamicRule ? _rule.underlyingRule : _rule.name;
    this.precedence = _rule.precedence;
    this.args = getRuleArgs(_rule);
  }

  isUnitRule(): this is { getRule(): UnitRule } {
    return this.variableNames.length == 1;
  }

  getRule(): CrossRule | UnitRule {
    return this._rule;
  }

  get target(): string {
    return this.variableNames[this.variableNames.length - 1];
  }

  trigger(when: TriggerWhen): ICrossRuleBuilder {
    this.when = when;
    return this;
  }

  activateWhen(
    target: string,
    activator: string,
    ...values: unknown[]
  ): ICrossRuleBuilder {
    if (!this.builder) throw "builder is not fluent";
    return this.builder.activateWhen(target, activator, ...values);
  }

  visibleWhen(
    target: string,
    activator: string,
    ...values: unknown[]
  ): ICrossRuleBuilder {
    if (!this.builder) throw "builder is not fluent";
    return this.builder.visibleWhen(target, activator, ...values);
  }

  modifiableWhen(
    target: string,
    activator: string,
    ...values: unknown[]
  ): ICrossRuleBuilder {
    if (!this.builder) throw "builder is not fluent";
    return this.builder.activateWhen(target, activator, ...values);
  }

  computed(target: string, formula: string): ICrossRuleBuilder {
    if (!this.builder) throw "builder is not fluent";
    return this.builder.computed(target, formula);
  }

  copy(target: string, source: string): ICrossRuleBuilder {
    if (!this.builder) throw "builder is not fluent";
    return this.builder.copy(target, source);
  }

  dynamic(
    variableNames: string[],
    rule: RuleName,
    values: unknown[],
    ...extra: unknown[]
  ): ICrossRuleBuilder {
    if (!this.builder) throw "builder is not fluent";
    return this.builder.dynamic(variableNames, rule, values, ...extra);
  }

  rule(variableNames: string[], args: RuleArgs): this;
  rule(variableNames: string[], name: RuleName, ...args: unknown[]): this;
  rule(
    variableNames: string[],
    x: RuleName | RuleArgs,
    ...args: unknown[]
  ): ICrossRuleBuilder {
    if (!this.builder) throw "builder is not fluent";
    return typeof x == "string"
      ? this.builder.rule(variableNames, x, ...args)
      : this.builder.rule(variableNames, x);
  }

  build(pageItems: PageItem[]): CrossItemRule {
    const rule = link(
      { variableNames: this.variableNames, rule: this._rule as CrossRule },
      [...pageItems, ...globalItems],
      this.when
    );
    if (this.strict) this.assertStrict(rule, pageItems);
    return rule;
  }

  private assertStrict(rule: CrossItemRule, pageItems: PageItem[]) {
    const indexes = rule.pageItems.map(i => {
      const pageItem = getScopedItem(i);
      return [pageItems.indexOf(pageItem), pageItem.variableName];
    });
    const last = indexes[indexes.length - 1];
    for (let i = 0; i < indexes.length - 1; i++) {
      if (indexes[i][0] > last[0])
        throw `Variable ${indexes[i][1]} used in ${last[1]} must be declared before`;
    }
  }
}
