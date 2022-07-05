import { IDomainCollection } from "..";
import { Rule } from "./rule.js";
import { ActivationRule } from "./activationrule.js";
import { ComputedRule } from "./computedrule.js";
import { CopyRule } from "./copyrule.js";
import { Dynamical, DynamicRule } from "./dynamicrule.js";
import {
  ConstantRule,
  CriticalRule,
  DecimalPrecisionRule,
  FixedLengthRule,
  InRangeRule,
  LetterCaseRule,
  Limits,
  MaxLengthRule,
  RequiredRule,
  UnitRule,
} from "./unitrule.js";
import { CrossItemRule, CrossRule } from "./crossrule.js";

export type RuleName =
  | "required"
  | "critical"
  | "constant"
  | "copy"
  | "inRange"
  | "maxLength"
  | "fixedLength"
  | "decimalPrecision"
  | "letterCase"
  | "activation"
  | "computed"
  | "dynamic";

export type RuleArgs = {
  name: RuleName;
  [name: string]: unknown;
};

export type RuleFactory<T extends UnitRule | CrossRule> = (
  ...args: unknown[]
) => T;

export class Rules {
  static required = (enforced = true): UnitRule => new RequiredRule(enforced);

  static critical = (
    event: string,
    message = event,
    ...values: unknown[]
  ): UnitRule => new CriticalRule(event, message, ...values);

  static constant = (value: unknown): UnitRule => new ConstantRule(value);

  static copy = (): CrossRule => new CopyRule();

  static inRange = (min?: number, max?: number, limits?: Limits): UnitRule =>
    new InRangeRule(min, max, limits);

  static maxLength = (length: number): UnitRule => new MaxLengthRule(length);

  static fixedLength = (length: number): UnitRule =>
    new FixedLengthRule(length);

  static decimalPrecision = (precision: number): UnitRule =>
    new DecimalPrecisionRule(precision);

  static letterCase = (letterCase: "upper" | "lower"): UnitRule =>
    new LetterCaseRule(letterCase);

  static activation = (
    values: unknown[],
    behavior: "enable" | "show"
  ): CrossRule => new ActivationRule(values, behavior);

  static computed = (formula: string, argCount = 10): CrossRule =>
    new ComputedRule(formula, argCount);

  static dynamic = <T extends UnitRule | CrossRule, S extends unknown[]>(
    rule: Dynamical<T, S> | RuleName,
    computed: [formula: string, argCount?: number],
    ...extraArgs: unknown[]
  ): CrossRule =>
    new DynamicRule(
      typeof rule == "string" ? Rules.factory<T>(rule) : rule,
      new ComputedRule(...computed),
      ...extraArgs
    );

  static create<T extends UnitRule | CrossRule>(args: RuleArgs): T;
  static create<T extends UnitRule | CrossRule>(
    name: RuleName,
    ...args: unknown[]
  ): T;
  static create<T extends UnitRule | CrossRule>(
    x: RuleName | RuleArgs,
    ...args: unknown[]
  ): T {
    const f = Rules.factory<T>(typeof x == "string" ? x : x.name);
    const a = typeof x == "string" ? args : Rules.args(x);
    return f(...a);
  }

  static args({ name, ...args }: RuleArgs): unknown[] {
    switch (name) {
      case "required":
        return [args.enforced];
      case "critical":
        return [args.event, args.message, ...(args.values as unknown[])];
      case "constant":
        return [args.value];
      case "copy":
        return [];
      case "inRange":
        return [args.min, args.max, args.limits];
      case "maxLength":
        return [args.length];
      case "fixedLength":
        return [args.length];
      case "decimalPrecision":
        return [args.precision];
      case "letterCase":
        return [args.letterCase];
      case "activation":
        return [args.values, args.behavior];
      case "computed":
        return [args.formula, args.argCount];
      case "dynamic":
        return [
          args.underlyingRule,
          args.formula,
          ...(args.extraArgs as unknown[]),
        ];
    }
  }

  static factory<T extends UnitRule | CrossRule>(
    name: RuleName
  ): RuleFactory<T> {
    switch (name) {
      case "required":
        return Rules.required as RuleFactory<T>;
      case "critical":
        return Rules.critical as RuleFactory<T>;
      case "constant":
        return Rules.constant as RuleFactory<T>;
      case "copy":
        return Rules.copy as RuleFactory<T>;
      case "inRange":
        return Rules.inRange as RuleFactory<T>;
      case "maxLength":
        return Rules.maxLength as RuleFactory<T>;
      case "fixedLength":
        return Rules.fixedLength as RuleFactory<T>;
      case "decimalPrecision":
        return Rules.decimalPrecision as RuleFactory<T>;
      case "letterCase":
        return Rules.letterCase as RuleFactory<T>;
      case "activation":
        return Rules.activation as RuleFactory<T>;
      case "computed":
        return Rules.computed as RuleFactory<T>;
      case "dynamic":
        return Rules.dynamic as RuleFactory<T>;
    }
  }

  static find<T extends Rule | CrossItemRule>(
    rules: IDomainCollection<T>,
    name: RuleName,
    ...args: unknown[]
  ): T | undefined {
    return rules.find(r => Rules.matchRule(r, name, ...args));
  }

  static matchRule(
    rule: CrossItemRule | Rule,
    ruleName: RuleName,
    ...args: unknown[]
  ): boolean {
    return (
      Rules.matchDirectRule(rule, ruleName, args) ||
      Rules.matchDynamicRule(rule, ruleName, args)
    );
  }

  static matchDirectRule(
    rule: CrossItemRule | Rule,
    ruleName: RuleName,
    args: unknown[]
  ): boolean {
    return (
      (rule instanceof CrossItemRule &&
        rule.is(ruleName) &&
        this.isSubset(args, Object.values(rule.args))) ||
      (rule.name == ruleName && this.isSubset(args, Object.values(rule)))
    );
  }

  static matchDynamicRule(
    rule: CrossItemRule | Rule,
    ruleName: RuleName,
    args: unknown[]
  ): boolean {
    return (
      rule instanceof CrossItemRule &&
      rule.is("dynamic") &&
      rule.args.underlyingRule == ruleName &&
      Rules.isSubset(args, rule.args.extraArgs as unknown[])
    );
  }

  private static isSubset(search: unknown[], into: unknown[]) {
    return search.every(a => into.includes(a));
  }
}
