import { PageItem } from "../pageitem.js";
import { HasValue, Rule, update } from "./rule.js";
import { UnitRule } from "./unitrule.js";
import { InterviewItem, status } from "../interviewitem.js";
import { IDomainCollection } from "../domaincollectiondef.js";
import { DomainCollection } from "../domaincollection.js";
import { RuleName } from "./rules.js";
import {
  getScope,
  getScopedItem,
  isMissing,
  isScopedItem,
  Missing,
  Scope,
  ScopedItem,
  ScopeLevel,
} from "../scope.js";
import { Participant } from "../participant.js";
import { hasMessages, isamplemMessages } from "./messages.js";
import { Interview } from "../interview.js";

export interface CrossRule extends Rule {
  execute(...args: HasValue[]): HasValue[];
}
export function getRuleArgs(rule: Rule | UnitRule): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { name, precedence, ...args } = rule;
  return args as Record<string, unknown>;
}

export type TriggerWhen = "always" | "initialization";

type Prototype = PageItem<"prototype">;

export class CrossItemRule implements CrossRule {
  readonly pageItems: IDomainCollection<Prototype | ScopedItem>;
  private readonly rule: CrossRule | UnitRule;

  constructor(
    q:
      | IDomainCollection<Prototype | readonly [Prototype, ScopeLevel]>
      | Prototype
      | readonly [Prototype, ScopeLevel],
    rule: CrossRule | UnitRule,
    readonly when: TriggerWhen = <const>"always"
  ) {
    if (q instanceof PageItem || isScopedItem(q)) {
      this.pageItems = DomainCollection(q);
    } else {
      this.pageItems = q;
    }
    this.rule = rule;
    Object.freeze(this);
  }

  get name(): string {
    return this.rule.name;
  }

  get precedence(): number {
    return this.rule.precedence;
  }

  get args(): Record<string, unknown> {
    return getRuleArgs(this.rule);
  }

  get target(): Prototype {
    const t = this.pageItems.last as Prototype | [Prototype, ScopeLevel];
    return isScopedItem(t) ? t[0] : t;
  }

  is<T extends Rule, U extends unknown[]>(name: RuleName): boolean {
    return this.rule.name == name;
  }

  execute(...args: HasValue[]): HasValue[] {
    const result =
      this.pageItems.length == 1
        ? (this.rule as UnitRule).execute(args[0])
        : (this.rule as CrossRule).execute(...args);
    return Array.isArray(result) ? result : [result];
  }
}

export function unitToCrossRules(
  pageItem: Prototype
): IDomainCollection<CrossItemRule> {
  return pageItem.rules.map(r => new CrossItemRule(pageItem, r));
}

export function parseVariableNames(
  variableNames: string[]
): (readonly [string, ScopeLevel])[] {
  return variableNames.map(v => {
    return parseVariableName(v);
  });
}

export function parseVariableName(
  v: string
): readonly [string, "global" | "outer" | "local"] {
  return v.startsWith("@")
    ? [v.substr(1), "global"]
    : v.startsWith("$")
    ? [v.substr(1), "outer"]
    : [v, "local"];
}

export function getVariableName(
  pageItem: Prototype | readonly [Prototype, ScopeLevel]
): string {
  if (pageItem instanceof PageItem) return pageItem.variableName;
  return getVariableNameWhenScoped(pageItem);
}

function getVariableNameWhenScoped(pageItem: readonly [Prototype, ScopeLevel]) {
  const [{ variableName }, scope] = pageItem;
  const prefix = scope == "global" ? "@" : scope == "outer" ? "$" : "";
  return prefix + variableName;
}

export function link(
  parsed: { variableNames: string[]; rule: CrossRule },
  pageItems: Prototype[],
  when: TriggerWhen = "always"
): CrossItemRule {
  const parsedVariables = parseVariableNames(parsed.variableNames);
  const items = parsedVariables.map(variableName =>
    getPageItemForVariable(variableName, pageItems)
  );
  return new CrossItemRule(DomainCollection(...items), parsed.rule, when);
}

function getPageItemForVariable(
  [variableName, scope]: readonly [string, ScopeLevel],
  pageItems: Prototype[]
) {
  const pageItem = getPageItem(variableName, pageItems);
  if (!pageItem) throw `unknown variable ${variableName}`;
  return <const>[pageItem, scope];
}

function getPageItem(variableName: string, pageItems: Prototype[]) {
  return pageItems.find(q => q.variableName == variableName);
}

type TriggerForItems = { initialization?: InterviewItem[] };

interface IExecReset extends Set<HasValue> {
  proceedWithRule(rule: CrossItemRule): boolean;
  proceedWithItems(rule: CrossItemRule, items: HasValue[]): boolean;
  processResult(item: HasValue, result: HasValue): void;
}

class FirstPassReset extends Set<HasValue> implements IExecReset {
  private readonly when: TriggerWhen[];

  constructor(when: TriggerWhen[] | TriggerForItems) {
    super();
    if (!Array.isArray(when)) {
      this.when = ["always"];
      if (typeof when.initialization != "undefined")
        for (const init of when.initialization)
          if (status(init) == "missing") this.add(init);
    } else this.when = when;
  }

  proceedWithRule(rule: CrossItemRule): boolean {
    return this.when.includes(rule.when) || this.size > 0;
  }

  proceedWithItems(rule: CrossItemRule, items: InterviewItem[]): boolean {
    return (
      this.when.includes(rule.when) ||
      (rule.when == "initialization" && this.has(items[items.length - 1]))
    );
  }

  processResult(item: HasValue, result: HasValue): void {
    if (this.isActivated(item, result)) this.add(result);
    if (item != result) this.delete(item);
  }

  isActivated(item: HasValue & Partial<Missing>, result: HasValue) {
    return (
      item.specialValue == "notApplicable" &&
      typeof result.specialValue == "undefined"
    );
  }
}

class SecondPassReset extends Set<HasValue> implements IExecReset {
  constructor(reset: FirstPassReset) {
    super();
    for (const item of reset) this.add(item);
  }

  proceedWithRule(rule: CrossItemRule): boolean {
    return rule.when == "initialization";
  }

  proceedWithItems(rule: CrossItemRule, items: HasValue[]): boolean {
    return this.has(items[items.length - 1]);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  processResult(): void {}
}

export function execute(
  rules: IDomainCollection<CrossItemRule>,
  participant: Participant,
  when?: TriggerWhen[],
  startsWith?: Interview
): Participant;
export function execute(
  rules: IDomainCollection<CrossItemRule>,
  scope: Scope,
  when?: TriggerWhen[]
): Scope;
export function execute(
  rules: IDomainCollection<CrossItemRule>,
  scope: Scope,
  when: TriggerForItems
): Scope;
export function execute(
  rules: IDomainCollection<CrossItemRule>,
  x: Scope | Participant,
  when: TriggerWhen[] | TriggerForItems = [<const>"always"],
  startsWith?: Interview
): Scope | Participant {
  if (x instanceof Participant)
    return executeAll(rules, x, when as TriggerWhen[], startsWith);
  const sequence = ruleSequence(rules);
  const firstPass = new FirstPassReset(when);
  const execScope = executeSequence(sequence, x, firstPass);
  const secondPass = new SecondPassReset(firstPass);
  return executeSequence(sequence, execScope, secondPass);
}

function executeSequence(
  selection: IDomainCollection<CrossItemRule>,
  scope: Scope,
  reset: IExecReset
) {
  return selection
    .filter(rule => reset.proceedWithRule(rule))
    .reduce(
      (result, rule) => executeRuleAndMapResult(rule, result, reset),
      scope
    );
}

export function ruleSequence(
  rules: IDomainCollection<CrossItemRule>
): IDomainCollection<CrossItemRule> {
  return rules
    .map((r, i) => <const>[i, r])
    .sort((r1, r2) => compareRules(r1, r2))
    .map(([_, r]) => r); // eslint-disable-line @typescript-eslint/no-unused-vars
}

export function compareRules(
  [i1, r1]: readonly [number, CrossItemRule],
  [i2, r2]: readonly [number, CrossItemRule]
): number {
  if (r1.target == r2.target) {
    const c = comparePrecedences(r1, r2);
    if (c) return c;
  }
  return comparePositions(i1, i2);
}

export function comparePrecedences(
  r1: CrossItemRule,
  r2: CrossItemRule
): number {
  return r2.precedence - r1.precedence;
}

function comparePositions(i1: number, i2: number) {
  return i1 - i2;
}

function executeRuleAndMapResult(
  rule: CrossItemRule,
  scope: Scope,
  reset: IExecReset,
  instance = 1
): Scope {
  const items = getItemsForRule(rule, scope, instance);
  if (items !== false)
    return executeRuleForInstance(rule, scope, items, reset, instance);
  return scope;
}

function executeRuleForInstance(
  rule: CrossItemRule,
  scope: Scope,
  items: (HasValue & Partial<Missing>)[],
  reset: IExecReset,
  instance: number
) {
  const scopeForInstance = reset.proceedWithItems(rule, items)
    ? proceed(rule, scope, items, reset)
    : scope;
  if (rule.target.array)
    return executeRuleForNextInstance(rule, scopeForInstance, reset, instance);
  return scopeForInstance;
}

function proceed(
  rule: CrossItemRule,
  scope: Scope,
  items: (HasValue & Partial<Missing>)[],
  reset: IExecReset
) {
  const results = tryExecuteRule(rule, items);
  const localResults = processResults(rule, results, items, reset);
  return scope.with(localResults);
}

function executeRuleForNextInstance(
  rule: CrossItemRule,
  scope: Scope,
  reset: IExecReset,
  instance: number
) {
  return executeRuleAndMapResult(rule, scope, reset, instance + 1) || scope;
}

function processResults(
  rule: CrossItemRule,
  results: HasValue[],
  items: (HasValue & Partial<Missing>)[],
  reset: IExecReset
) {
  const localResults = new Array<InterviewItem>();
  for (const i in results) {
    const item = items[i];
    const result = results[i];
    const prototype = rule.pageItems[i];
    if (isLocalResult(item, prototype)) {
      localResults.push(result as InterviewItem);
      reset.processResult(item, result);
    }
  }
  return localResults;
}

function tryExecuteRule(rule: CrossItemRule, items: HasValue[]): HasValue[] {
  try {
    return executeRule(rule, items);
  } catch (e) {
    console.log(e);
    return [];
  }
}

function executeRule(rule: CrossItemRule, items: HasValue[]) {
  const result = rule.execute(...items);
  return items.map((a, i) => update(a, result[i]));
}

function getItemsForRule(
  rule: CrossItemRule,
  scope: Scope,
  instance: number
): false | (HasValue & Partial<Missing>)[] {
  const items = new Array<HasValue & Partial<Missing>>(rule.pageItems.length);
  for (let i = 0; i < rule.pageItems.length; i++) {
    const added = addItemForRule(items, rule, scope, instance, i);
    if (!added) return false;
  }
  const targetItem = items[items.length - 1];
  return isMissing(targetItem) ? false : items;
}

function addItemForRule(
  items: (HasValue & Partial<Missing>)[],
  rule: CrossItemRule,
  scope: Scope,
  instance: number,
  i: number
) {
  const pageItem = getItemForInstance(rule, i, instance);
  if (pageItem === false) return false;
  const scoped = scope.get(pageItem);
  if (typeof scoped == "undefined") return false;
  items[i] = scoped;
  return true;
}

function getItemForInstance(rule: CrossItemRule, i: number, instance: number) {
  const level = getScope(rule.pageItems[i]);
  const proto = getScopedItem(rule.pageItems[i]);
  const pageItem = proto.array ? PageItem.getInstance(proto, instance) : proto;
  if (pageItem.array && pageItem.instance != instance) return false;
  return <const>[pageItem, level];
}

function isLocalResult(
  item: HasValue & Partial<Missing>,
  pageItem: Prototype | readonly [Prototype, ScopeLevel]
) {
  return !isMissing(item) && getScope(pageItem) == "local";
}

function executeAll(
  rules: IDomainCollection<CrossItemRule>,
  participant: Participant,
  when: TriggerWhen[],
  startsWith: Interview | undefined
): Scope | Participant {
  const startIndex = startsWith ? participant.interviews.indexOf(startsWith) : 0;
  const reset = resetMessages(participant, startIndex);
  return reset.interviews.reduce((p, i, x) => {
    if (x < startIndex) return p;
    const scope = Scope.create(p, i);
    const executed = execute(rules, scope, when).items;
    return p.update({
      interviews: p.interviews.update(ii =>
        ii == i ? i.update({ items: i.items.map((i, x) => executed[x]) }) : ii
      ),
    });
  }, reset);
}

function resetMessages(participant: Participant, startIndex: number) {
  return participant.update({
    interviews: participant.interviews.map((i, x) =>
      x < startIndex
        ? i
        : i.update({
            items: i.items.map(t =>
              hasMessages(t.messages) ? resetItemMessages(t) : t
            ),
          })
    ),
  });
}

function resetItemMessages(t: InterviewItem): InterviewItem {
  return t.update({
    messages: isamplemMessages(t.messages)
      ? { __acknowledged: t.messages.__acknowledged }
      : {},
  });
}
