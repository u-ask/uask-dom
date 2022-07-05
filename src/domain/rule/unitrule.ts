import { ItemTypes } from "../itemtypes.js";
import { Rule, HasValue, setMessageIf, update } from "./rule.js";

export interface UnitRule extends Rule {
  execute(arg: HasValue): HasValue;
}

export class ConstantRule implements UnitRule {
  constructor(readonly value: unknown) {}
  readonly name: string = "constant";
  readonly precedence: number = 100;
  execute(a: HasValue): HasValue {
    return update(a, { value: this.value });
  }
}

export class RequiredRule implements UnitRule {
  static readonly message: string = "value is required";
  readonly name: string = "required";
  readonly precedence: number = 70;

  constructor(readonly enforced: boolean = true) {}

  execute(a: HasValue): HasValue {
    const messages = setMessageIf(
      this.enforced && typeof a.value == "undefined"
    )(a.messages, this.name, RequiredRule.message);
    return update(a, { messages });
  }
}

export class CriticalRule implements UnitRule {
  readonly name: string = "critical";
  readonly precedence: number = 70;
  readonly values: unknown[];

  constructor(event: string, message?: string, enforced?: boolean);
  constructor(event: string, message?: string, ...values: unknown[]);
  constructor(
    readonly event: string,
    readonly message = event,
    ...values: unknown[]
  ) {
    this.values = values;
  }

  execute(a: HasValue): HasValue {
    const enforced =
      this.values.length == 0 ||
      this.values[0] === true ||
      this.values.includes(a.value);
    const messages = setMessageIf(enforced && typeof a.value != "undefined")(
      a.messages,
      this.name,
      `${this.event}`
    );
    return update(a, { messages });
  }
}

export const limits = {
  includeNone: { includeLower: false, includeUpper: false },
  includeLower: { includeLower: true, includeUpper: false },
  includeUpper: { includeLower: false, includeUpper: true },
  includeBoth: { includeLower: true, includeUpper: true },
};

export type Limits = typeof limits[keyof typeof limits];

export class InRangeRule implements UnitRule {
  readonly name: string = "inRange";
  readonly precedence: number = 10;

  execute(a: { value: number | Date | string } & HasValue): HasValue {
    const minLimitChar = this.limits?.includeLower ? "[" : "]";
    const maxLimitChar = this.limits?.includeUpper ? "]" : "[";
    const minLabel =
      typeof this.min == "number"
        ? this.min
        : ItemTypes.date(false).label(this.min);
    const maxLabel =
      typeof this.max == "number"
        ? this.max
        : ItemTypes.date(false).label(this.max);
    const message = `value must be in range ${minLimitChar}${minLabel}, ${maxLabel}${maxLimitChar}`;
    const value =
      typeof a.value == "string"
        ? new Date(`${a.value}-01-01`.substr(0, 10))
        : a.value;
    const messages = setMessageIf(
      value < this.min ||
        value > this.max ||
        (!this.limits.includeLower && a.value == this.min) ||
        (!this.limits.includeUpper && a.value == this.max)
    )(a.messages, this.name, message);
    return update(a, { messages });
  }

  constructor(
    readonly min: number | Date = 0,
    readonly max: number | Date = 1,
    readonly limits: Limits = { includeLower: false, includeUpper: false }
  ) {}
}

export class MaxLengthRule implements UnitRule {
  readonly name: string = "maxLength";
  readonly length: number;
  readonly precedence: number = 10;

  constructor(length: number) {
    this.length = length;
  }

  execute(a: { value: string } & HasValue): HasValue {
    const messages = setMessageIf(a.value?.length > this.length)(
      a.messages,
      this.name,
      `Text must be less than ${this.length} characters long`
    );
    return update(a, { messages });
  }
}

export class DecimalPrecisionRule implements UnitRule {
  readonly name: string = "decimalPrecision";
  readonly precedence: number = 10;
  readonly precision: number;

  constructor(precision: number) {
    this.precision = precision;
  }

  execute(a: { value: number } & HasValue): HasValue {
    if (!a.value) return a;
    const k = 10 ** this.precision;
    return update(a, {
      value: Math.round(a.value * k) / k,
    });
  }
}

export class FixedLengthRule implements UnitRule {
  readonly name: string = "fixedLength";
  readonly precedence: number = 10;
  readonly length: number;

  constructor(length: number) {
    this.length = length;
  }

  execute(a: { value: string } & HasValue): HasValue {
    const messages = setMessageIf(a.value?.length != this.length)(
      a.messages,
      this.name,
      `text length must be ${this.length}`
    );
    return update(a, { messages });
  }
}

export class LetterCaseRule implements UnitRule {
  readonly name: string = "letterCase";
  readonly precedence: number = 10;

  constructor(readonly letterCase: "upper" | "lower") {}

  execute(target: HasValue): HasValue {
    if (target.value != undefined) {
      const value = target.value as string;
      target =
        this.letterCase == "upper"
          ? update(target, { value: value.toUpperCase() })
          : update(target, { value: value.toLowerCase() });
    }
    return target;
  }
}
