import {
  SurveyOptions,
  ItemType,
  Context,
  RuleName,
  RuleArgs,
  TriggerWhen,
  TypeArgs,
  mlstring,
} from "../domain/index.js";
import { Limits } from "../domain/rule/unitrule.js";

export type Computed = {
  formula: string;
};

export type Copy = {
  source: string;
};

export function isComputed(o: unknown): o is Computed {
  if (typeof o != "object" || o == null) return false;
  const oo = o as { formula?: string };
  return typeof oo.formula == "string";
}

export function isCopy(o: unknown): o is Copy {
  return !!(typeof o == "object" && o && "source" in o);
}

export interface ISurveyBuilder {
  options(options: Partial<SurveyOptions>): void;
  strict(): void;
  survey(name: string): ISurveyBuilder;
  pageSet(type: mlstring): IPageSetBuilder;
  page(name: mlstring): IPageBuilder;
  workflow(): IWorkflowBuilder;
  workflow(w: { name: string; raw: true }): IRawWorkflowBuilder;
  workflow(name: string, ...names: string[]): IDerivedWorkflowBuilder;
  rule(variableNames: string[], args: RuleArgs): ICrossRuleBuilder;
  rule(
    variableNames: string[],
    name: RuleName,
    ...args: unknown[]
  ): ICrossRuleBuilder;
}

interface WithPageItem {
  question(varname: string, type: TypeArgs): IPageItemBuilder;
  question(
    varname: string,
    type: ItemType,
    ...contexts: ItemType[]
  ): IPageItemBuilder;
  question(
    wording: mlstring,
    varname: string,
    type: TypeArgs
  ): IPageItemBuilder;
  question(
    wording: mlstring,
    varname: string,
    type: ItemType,
    ...contexts: ItemType[]
  ): IPageItemBuilder;
  info(wording: mlstring, name: string): IPageItemBuilder;
  info(wording: string[], name: string): IPageItemBuilder;
}

export interface WithSection {
  startSection(title?: mlstring): ISectionBuilder;
  endSection(): IPageBuilder;
}

export interface ISectionBuilder extends WithSection, WithPageItem {
  activateWhen(variableName: string, ...values: unknown[]): ISectionBuilder;
  visibleWhen(variableName: string, ...values: unknown[]): ISectionBuilder;
  modifiableWhen(variableName: string, ...values: unknown[]): ISectionBuilder;
  translate(lang: string, translation: string): ISectionBuilder;
}

interface WithInclude {
  include(
    pageName: string,
    mode?: { followUp: true } | { initial: true }
  ): ILibraryBuilder;
}

export interface ILibraryBuilder
  extends WithInclude,
    WithPageItem,
    WithSection {
  select(...variableNames: string[]): ILibraryBuilder;
  context(variableName: string, ctx: Context): ILibraryBuilder;
  activateWhen(variableName: string, ...values: unknown[]): ILibraryBuilder;
  visibleWhen(variableName: string, ...values: unknown[]): ILibraryBuilder;
  modifiableWhen(variableName: string, ...values: unknown[]): ILibraryBuilder;
}

export interface IPageBuilder
  extends ISectionBuilder,
    WithPageItem,
    WithInclude {
  translate(lang: string, translation: string): IPageBuilder;
  exportTo(conf: string | { fileName?: string }): IPageBuilder;
}

export interface IUnitBuilder {
  extendable(): IPageItemBuilder;
}

export interface IPageItemBuilder
  extends ISectionBuilder,
    WithInclude,
    WithPageItem {
  unit(...units: string[]): IPageItemBuilder & IUnitBuilder;
  translate(
    lang: string,
    translation: string,
    ...contexts: string[]
  ): IPageItemBuilder;
  required(formula?: string | Computed): IPageItemBuilder;
  critical(
    event: string | Computed,
    message?: string,
    formula?: Computed
  ): IPageItemBuilder;
  critical(
    event: string | Computed,
    message?: string,
    ...values: unknown[]
  ): IPageItemBuilder;
  inRange(
    min: number | Date | Computed,
    max: number | Date | Computed,
    limits?: Limits
  ): IPageItemBuilder;
  inPeriod(
    min: Date | Computed,
    max: Date | Computed,
    limits?: Limits
  ): IPageItemBuilder;
  comment(comment: mlstring): IPageItemBuilder;
  pin(title: mlstring): IPageItemBuilder;
  kpi(title: mlstring, pivot?: string): IPageItemBuilder;
  maxLength(maxLength: number): IPageItemBuilder;
  decimalPrecision(precision: number): IPageItemBuilder;
  fixedLength(length: number): IPageItemBuilder;
  computed(formula: string | Computed): IPageItemBuilder;
  memorize(): IPageItemBuilder;
  letterCase(letterCase: "upper" | "lower"): IPageItemBuilder;
  activateWhen(formula: string): IPageItemBuilder;
  activateWhen(variableName: string, ...values: unknown[]): IPageItemBuilder;
  visibleWhen(formula: string): IPageItemBuilder;
  visibleWhen(variableName: string, ...values: unknown[]): IPageItemBuilder;
  modifiableWhen(formula: string): IPageItemBuilder;
  modifiableWhen(variableName: string, ...values: unknown[]): IPageItemBuilder;
  rule(args: RuleArgs): IPageItemBuilder;
  rule(name: RuleName, ...args: unknown[]): IPageItemBuilder;
  defaultValue(defaultValue: unknown): IPageItemBuilder;
  wordings(
    wording1: mlstring,
    wording2: mlstring,
    ...contexts: mlstring[]
  ): IPageItemBuilder;
}

export type PageDef = {
  name: string;
  mandatory?: boolean;
};

export interface IPageSetBuilder {
  pageSet(type: mlstring): IPageSetBuilder;
  translate(lang: string, translation: string): IPageSetBuilder;
  datevariable(datevariable: string): IPageSetBuilder;
  pages(...pageDefs: (PageDef | string)[]): IPageSetBuilder;
}

export interface IDerivedWorkflowBuilder {
  withPageSets(...types: string[]): IDerivedWorkflowBuilder;
  notify(...events: string[]): IDerivedWorkflowBuilder;
}

export interface IWorkflowBuilder {
  home(type: string): IWorkflowBuilder;
  initial(...types: string[]): IWorkflowBuilder;
  followUp(...types: string[]): IWorkflowBuilder;
  terminal(...types: string[]): IWorkflowBuilder;
  auxiliary(...types: string[]): IWorkflowBuilder;
}

export interface IRawWorkflowBuilder {
  home(name: string): IRawWorkflowBuilder;
  seq(...names: string[]): IRawWorkflowBuilder;
  n(...names: string[]): IRawWorkflowBuilder;
  one(...names: string[]): IRawWorkflowBuilder;
  end(...names: string[]): IRawWorkflowBuilder;
  notify(...events: string[]): IRawWorkflowBuilder;
}

export interface ICrossRuleBuilder {
  trigger(when: TriggerWhen): ICrossRuleBuilder;
  activateWhen(
    target: string,
    activator: string,
    ...values: unknown[]
  ): ICrossRuleBuilder;
  visibleWhen(
    target: string,
    activator: string,
    ...values: unknown[]
  ): ICrossRuleBuilder;
  modifiableWhen(
    target: string,
    variableName: string,
    ...values: unknown[]
  ): ICrossRuleBuilder;
  copy(target: string, source: string): ICrossRuleBuilder;
  computed(target: string, formula: string): ICrossRuleBuilder;
  dynamic(
    variableNames: string[],
    rule: RuleName,
    values: unknown[],
    ...extraArgs: unknown[]
  ): ICrossRuleBuilder;
  rule(variableNames: string[], args: RuleArgs): ICrossRuleBuilder;
  rule(
    variableNames: string[],
    name: RuleName,
    ...args: unknown[]
  ): ICrossRuleBuilder;
}
