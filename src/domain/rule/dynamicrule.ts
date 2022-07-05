import { HasValue } from "./rule.js";
import { ComputedRule } from "./computedrule.js";
import { CrossRule } from "./crossrule.js";
import { UnitRule } from "./unitrule.js";

export type Dynamical<T extends UnitRule | CrossRule, S extends unknown[]> = {
  (...args: S): T;
};

export class DynamicRule<T extends UnitRule | CrossRule, S extends unknown[]>
  implements CrossRule, UnitRule
{
  readonly name: string = "dynamic";
  readonly precedence: number;
  readonly underlyingRule: string;
  readonly extraArgs: unknown[];
  readonly formula: [string, number];

  constructor(
    private rule: Dynamical<T, S>,
    private computedArgs: ComputedRule,
    ...extraArgs: unknown[]
  ) {
    const r = rule(...([] as unknown as S));
    this.precedence = r.precedence;
    this.underlyingRule = r.name;
    this.extraArgs = extraArgs;
    this.formula = [this.computedArgs.formula, this.computedArgs.argCount];
  }

  execute(arg: HasValue): HasValue;
  execute(...args: HasValue[]): HasValue[];
  execute(...args: HasValue[]): HasValue | HasValue[] {
    const computed = this.computedArgs.execute(...args.map(i => ({ ...i })));
    const dynamicArgs = computed[computed.length - 1].value as unknown[];
    const a = [...dynamicArgs, ...this.extraArgs] as S;
    const dynamic = this.rule(...a);
    if (dynamic.execute.length == 1) {
      const result = this.executeUnitRule(dynamic, args);
      return args.length == 1 ? result[0] : result;
    }
    return this.executeCrossRule(dynamic, args);
  }

  private executeUnitRule(dynamic: T, args: HasValue[]) {
    const result = dynamic.execute(args[args.length - 1]) as HasValue;
    return [...args.slice(0, -1), result];
  }

  private executeCrossRule(dynamic: T, args: HasValue[]) {
    const execute = dynamic.execute.bind(dynamic) as (
      ...args: HasValue[]
    ) => HasValue[];
    const execArgs = args.slice(-dynamic.execute.length);
    const result = execute(...execArgs);
    return [...args.slice(0, -result.length), ...result];
  }
}
