import { getItemContext, getItemMemento, Memento } from "../pageitem.js";
import { CrossRule } from "./crossrule.js";
import { HasValue, update } from "./rule.js";

export class ComputedRule implements CrossRule {
  readonly name: string = "computed";
  readonly precedence: number = 100;

  func: (...a: unknown[]) => unknown;

  constructor(readonly formula: string, readonly argCount = 10) {
    if (isAuthorized(formula)) this.func = this.makeFunc(argCount, formula);
    else throw "Unauthorized code in formula";
    Object.defineProperties(this, {
      func: {
        enumerable: false,
        writable: false,
        configurable: false,
      },
    });
    Object.freeze(this);
  }

  private makeFunc(argCount: number, formula: string) {
    const argList = ComputedRule.makeArgList(argCount);
    const body = ComputedRule.transpile(formula);
    return new Function(...argList, `return ${body}`) as (
      ...args: unknown[]
    ) => unknown;
  }

  static makeArgList(argCount: number): string[] {
    const args = new Array(argCount).fill(1).map((o, i) => `$${i + o}`);
    return ["$", ...args];
  }

  static transpile(formula: string): string {
    return formula
      .replace(
        /#([0-9]{4}-[0-9]{2}-[0-9]{2})#/g,
        (_, iso) => `new Date('${iso}')`
      )
      .replace(/~/g, "$.");
  }

  execute(...args: HasValue[]): HasValue[] {
    const firsts = args.slice(0, args.length - 1);
    const last = args[args.length - 1];
    return [...firsts, this.compute(args, last)];
  }

  private compute(args: HasValue[], last: HasValue) {
    const a = [
      this.buildContextArg(last),
      ...args.map(a => (a.specialValue == "notApplicable" ? null : a.value)),
    ];
    const result = this.func(...a);
    const value = this.buildResult(result, last);
    return update(last, value);
  }

  private buildContextArg(last: HasValue) {
    const undef = "~MEM:undefined";
    const context = getItemMemento(last);
    const state = context == undef ? undefined : context;
    const ctx = {
      IN: <T>(searchValues: T[] | undefined, value: T) => {
        return !!searchValues?.includes(value);
      },
      UNDEF: (...v: unknown[]) => v.every(v => v == undefined),
      NA: (...v: unknown[]) => v.every(v => v === null),
      MEM: (value: unknown, memento: unknown) => {
        return { value, memento: memento ?? value ?? undef };
      },
      M: state,
    };
    const ctxFun = (value?: unknown, memento?: Memento) => {
      return ctx.UNDEF(value, memento) ? ctx.M : ctx.MEM(value, memento);
    };
    return Object.assign(ctxFun, ctx);
  }

  private buildResult(result: unknown, last: HasValue) {
    if (isUndef(result)) return makeUndef();
    return this.buildValuedResult(result, last);
  }

  private buildValuedResult(result: unknown, last: HasValue) {
    const value = hasContextValue(result) ? result.value : result;
    const memento = hasContextValue(result) ? result.memento : undefined;
    const { lastContext, lastMemento } = getLastContext(last);
    return {
      value,
      specialValue: undefined,
      ...makeNewContext(lastContext, lastMemento, memento),
    };
  }
}

export class ComputedParser {
  private constructor(
    private formula: string,
    private variableNames: string[] = []
  ) {}

  static parse(
    variableName: string | undefined,
    formula: string
  ): { variableNames: string[]; formula: string } {
    const stringsOut = formula.replace(/'[^']+'/g, "''");
    const varExp = new RegExp(/(^|[^\w'~])([$@]?(__)?[A-Za-z]\w*)/, "g");
    const variableNames: string[] = ComputedParser.parseVars(
      varExp,
      stringsOut
    );
    const parser = variableNames
      .filter(v => v != variableName)
      .concat(variableName ? [variableName] : [])
      .reduce(
        (parser, v) => ComputedParser.rewrite(parser, v),
        new ComputedParser(formula)
      );
    return {
      variableNames: parser.variableNames,
      formula: parser.formula,
    };
  }

  private static parseVars(varExp: RegExp, formula: string) {
    const variableNames: string[] = [];
    let match = varExp.exec(formula);
    while (match) {
      if (!variableNames.includes(match[2])) variableNames.push(match[2]);
      match = varExp.exec(formula);
    }
    return variableNames.sort();
  }

  private static rewrite(
    result: ComputedParser,
    variableName: string
  ): ComputedParser {
    const variableNames = [...result.variableNames, variableName];
    const variableExpr = variableName.replace(/([$@])?(\w*)$/, (s, p1, p2) => {
      return `${p1 ? `\\${p1}` : ""}\\b${p2}\\b`;
    });
    const expression = result.formula.replace(
      new RegExp(variableExpr, "g"),
      `$${String(variableNames.length)}`
    );
    return new ComputedParser(expression, variableNames);
  }
}

function makeNewContext(
  lastContext: number,
  lastMemento?: Memento,
  memento?: Memento
): HasValue {
  return memento && memento != lastMemento
    ? { context: [lastContext as number, memento] }
    : {};
}

function getLastContext(last: HasValue) {
  const lastContext = getItemContext(last);
  const lastMemento = getItemMemento(last);
  return { lastContext, lastMemento };
}

function hasContextValue(
  result: unknown
): result is { value: unknown; memento: Memento } {
  return (
    typeof result == "object" &&
    result != null &&
    "memento" in result &&
    "value" in result
  );
}

function makeUndef() {
  return {
    value: undefined,
    specialValue: undefined,
  };
}

function isAuthorized(formula: string) {
  return /^([[#$\d.,+\-*/%()=<>?:&!| \]]|('.*')|(~[A-Z(]+))*$/.test(formula);
}

function isUndef(result: unknown) {
  return typeof result == "number" && isNaN(result);
}

export class Macros {
  static memorize(variableName: string): string {
    return `~NA(${variableName})?~MEM(~M):~MEM(${variableName})`;
  }
}
