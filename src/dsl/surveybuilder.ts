import {
  Survey,
  SurveyOptions,
  DomainCollection,
  mlstring,
  limits,
  PageItem,
  ItemTypes,
  Rules,
  ComputedParser,
  RuleName,
  RuleArgs,
  TriggerWhen,
  HideableVarDef,
  ItemType,
  Page,
} from "../domain/index.js";
import { PageBuilder } from "./pagebuilder.js";
import { PageSetBuilder } from "./pagesetbuilder.js";
import { validate } from "./validation.js";
import {
  Computed,
  Copy,
  ICrossRuleBuilder,
  IDerivedWorkflowBuilder,
  IPageBuilder,
  IPageSetBuilder,
  IRawWorkflowBuilder,
  isComputed,
  ISurveyBuilder,
  IWorkflowBuilder,
  PageDef,
} from "./builders.js";
import { DNode } from "./abstracttree.js";
import { WorkflowBuilder } from "./workflowbuilder.js";
import { CrossRuleBuilder } from "./crossrulebuilder.js";
import { PageItemBuilder } from "./pageitembuilder.js";

export class SurveyBuilder
  implements ISurveyBuilder, ICrossRuleBuilder, DNode<Survey>
{
  name = "";
  workflows: WorkflowBuilder[] = [];
  readonly pageSets: PageSetBuilder[] = [];
  readonly pages: PageBuilder[] = [];
  config: SurveyOptions = new SurveyOptions();

  readonly includeLower = limits.includeLower;
  readonly includeUpper = limits.includeUpper;
  readonly includeLimits = limits.includeBoth;
  readonly includeBoth = limits.includeBoth;
  readonly types = {
    ...ItemTypes,
    choice: (multiplicity: "one" | "many", ...choices: string[]) =>
      ItemTypes.choice(multiplicity, ...choices).lang(
        this.config.defaultLang ?? "en"
      ),
    glossary: (multiplicity: "one" | "many", ...choices: string[]) =>
      ItemTypes.glossary(multiplicity, ...choices).lang(
        this.config.defaultLang ?? "en"
      ),
    countries: (multiplicity: "one" | "many") =>
      ItemTypes.countries(multiplicity).lang(this.config.defaultLang ?? "en"),
    scale: (min: number, max: number) =>
      ItemTypes.scale(min, max).lang(this.config.defaultLang ?? "en"),
    score: (...scores: number[]) =>
      ItemTypes.score(...scores).lang(this.config.defaultLang ?? "en"),
  } as typeof ItemTypes;
  readonly crossRules: CrossRuleBuilder[] = [];

  private emptySectionTitle = "";
  private isStrict = false;
  private mainWorkflow: WorkflowBuilder | undefined;
  private _currentRule = -1;

  options(options: Partial<SurveyOptions>): void {
    this.config = {
      ...this.config,
      ...options,
      inclusionVar: this.buildHideable(options, "inclusionVar"),
    };
  }

  strict(): void {
    this.isStrict = true;
  }

  private buildHideable(
    options: Partial<SurveyOptions>,
    s: keyof typeof options
  ) {
    return {
      ...this.normalizeHideable(this.config[s] as HideableVarDef | undefined),
      ...this.normalizeHideable(options[s] as HideableVarDef | undefined),
    };
  }

  private normalizeHideable(
    hideable?: HideableVarDef
  ): { name?: string | undefined; hidden?: boolean | undefined } | undefined {
    return typeof hideable == "string" ? { name: hideable } : hideable;
  }

  survey(name: string): ISurveyBuilder {
    this.name = name;
    return this;
  }

  pageSet(type: mlstring): IPageSetBuilder {
    const pageSetBuilder = new PageSetBuilder(type, this.config, this);
    this.pageSets.push(pageSetBuilder);
    return pageSetBuilder;
  }

  page(name: mlstring): IPageBuilder {
    const pageBuilder = new PageBuilder(name, this.config, this, this);
    this.pages.push(pageBuilder);
    return pageBuilder;
  }

  workflow(): IWorkflowBuilder;
  workflow(w: { name: string; raw: true }): IRawWorkflowBuilder;
  workflow(name: string, ...names: string[]): IDerivedWorkflowBuilder;
  workflow(
    w: string | { name: string; raw: true } = "main",
    ...names: string[]
  ): IWorkflowBuilder | IDerivedWorkflowBuilder | IRawWorkflowBuilder {
    const name = typeof w == "string" || typeof w == "undefined" ? w : w.name;
    const workflowBuilder = new WorkflowBuilder(
      name,
      this.config,
      this.mainWorkflow,
      this
    );
    if (name == "main") {
      this.mainWorkflow = workflowBuilder;
    }
    this.workflows.push(workflowBuilder);
    this.workflows.push(...workflowBuilder.copy(names));
    return workflowBuilder;
  }

  activateWhen(
    target: string,
    activator: string,
    ...values: unknown[]
  ): CrossRuleBuilder {
    return this.doWhen("enable", target, activator, ...values);
  }

  visibleWhen(
    target: string,
    activator: string,
    ...values: unknown[]
  ): CrossRuleBuilder {
    return this.doWhen("show", target, activator, ...values);
  }

  private doWhen(
    behavior: "enable" | "show",
    target: string,
    activator: string,
    ...values: unknown[]
  ): CrossRuleBuilder {
    if (values.length == 0)
      return this.doWhen(behavior, target, "@ACK", this.computed(activator));
    const ix = this.getCrossRuleBuilderIndex("activation", target);
    if (ix > -1) {
      const [prevActivator, ...prevValues] = (
        this.crossRules[ix] as unknown as { _memo: [string, ...unknown[]] }
      )._memo;
      const prevFormula = this.activationFormula(prevActivator, prevValues);
      const formula = this.activationFormula(activator, values);
      return this.reallyDoWhen(
        behavior,
        target,
        "@ACK",
        this.computed(`(${prevFormula}) && (${formula})`)
      );
    }
    return this.reallyDoWhen(behavior, target, activator, ...values);
  }

  private activationFormula(activator: string, values: unknown[]) {
    return values
      .map(v => {
        const value = isComputed(v) ? v.formula : v;
        return activator != "@ACK"
          ? value !== true
            ? `${activator}==${typeof value == "string" ? `'${value}'` : value}`
            : activator
          : value;
      })
      .join(" || ");
  }

  private reallyDoWhen(
    behavior: "enable" | "show",
    target: string,
    activator: string,
    ...values: unknown[]
  ) {
    const crossRuleBuilder = values.some(isComputed)
      ? this.dynamic([activator, target], "activation", [values], behavior)
      : this.rule([activator, target], "activation", values, behavior);
    Object.assign(crossRuleBuilder, { _memo: [activator, ...values] });
    return crossRuleBuilder;
  }

  modifiableWhen(
    target: string,
    variableName: string,
    ...values: unknown[]
  ): CrossRuleBuilder {
    if (values.length == 0)
      return this.computed(target, `${variableName}?${target}:$${target}`);
    else {
      const [v] = values;
      const f =
        typeof v == "object" && v && "formula" in v
          ? (v as { formula: string }).formula
          : JSON.stringify(values[0]);
      return this.modifiableWhen(target, `${variableName}==${f}`);
    }
  }

  computed(formula: string): Computed;
  computed(target: string | string[], formula: string): CrossRuleBuilder;
  computed(x: string | string[], y?: string): CrossRuleBuilder | Computed {
    if (typeof x == "string" && typeof y == "undefined") return { formula: x };
    else if (typeof x == "string") {
      const { variableNames, formula } = ComputedParser.parse(x, y as string);
      return this.rule(
        variableNames,
        "computed",
        formula,
        variableNames.length
      );
    }
    return this.rule(x, "computed", y as string, x.length);
  }

  copy(source: string): Copy;
  copy(target: string, source: string): CrossRuleBuilder;
  copy(x: string, y?: string): CrossRuleBuilder | Copy {
    if (typeof y == "undefined") return { source: x };
    return this.rule([y, x], "copy");
  }

  date(iso: string): Computed {
    return this.computed(`#${iso}#`);
  }

  dynamic(
    variableNames: string[],
    underlyingRule: RuleName,
    values: unknown[],
    ...extraArgs: unknown[]
  ): CrossRuleBuilder {
    const { variableNames: parameterNames, formula } = ComputedParser.parse(
      undefined,
      this.dynamicFormula(values)
    );
    const computedNames = [...parameterNames, ...variableNames].filter(
      (v, x, arr) => arr.indexOf(v) == x
    );
    return this.rule(
      computedNames,
      "dynamic",
      underlyingRule,
      [formula, parameterNames.length],
      ...extraArgs
    );
  }

  rule(variableNames: string[], args: RuleArgs): CrossRuleBuilder;
  rule(
    variableNames: string[],
    name: RuleName,
    ...args: unknown[]
  ): CrossRuleBuilder;
  rule(
    variableNames: string[],
    x: RuleName | RuleArgs,
    ...args: unknown[]
  ): CrossRuleBuilder {
    const crossRuleBuilder = new CrossRuleBuilder(
      variableNames,
      typeof x == "string" ? Rules.create(x, ...args) : Rules.create(x),
      this,
      this.isStrict
    );
    return crossRuleBuilder.isUnitRule()
      ? crossRuleBuilder
      : this.addCrossRuleBuilder(crossRuleBuilder);
  }

  private addCrossRuleBuilder(crossRuleBuilder: CrossRuleBuilder) {
    const ix = this.getCrossRuleBuilderIndex(
      crossRuleBuilder.name,
      crossRuleBuilder.target
    );
    if (ix == -1) this.crossRules.push(crossRuleBuilder);
    else this.crossRules[ix] = crossRuleBuilder;
    this._currentRule = ix;
    return crossRuleBuilder;
  }

  private getCrossRuleBuilderIndex(name: string, target: string) {
    return this.crossRules.findIndex(r => r.name == name && r.target == target);
  }

  trigger(when: TriggerWhen): this {
    this.crossRules[this._currentRule]?.trigger(when);
    return this;
  }

  private dynamicFormula(values: unknown[]): string {
    return `[${values.map(v =>
      isComputed(v)
        ? v.formula
        : Array.isArray(v)
        ? this.dynamicFormula(v)
        : v instanceof Date
        ? this.date(v.toLocaleDateString("sv")).formula
        : v
    )}]`;
  }

  readonly get = this.build;

  build(): Survey {
    const pages = this.pages.map(b => b.build(this.pages));
    const pageSets = this.pageSets.map(b => b.build(pages));
    const workflows = this.workflows.map(b => b.build(pageSets));
    const crossRules = this.buildCrossRules(pages);
    return new Survey(this.name, {
      options: this.config,
      pages: DomainCollection(...pages),
      pageSets: DomainCollection(...pageSets),
      workflows: DomainCollection(...workflows),
      crossRules: DomainCollection(...crossRules),
    });
  }

  private buildCrossRules(pages: Page[]) {
    const items = pages.reduce(
      (q, p) =>
        q.concat(
          ...p.includes.filter((i): i is PageItem => i instanceof PageItem)
        ),
      [] as PageItem[]
    );
    return this.crossRules.map(b => b.build(items));
  }

  validate(): string[] {
    const messages: string[] = [];
    validate(this, messages);
    return messages;
  }

  mandatory(page: PageDef | string): PageDef {
    return typeof page == "string"
      ? { name: page, mandatory: true }
      : { ...page, mandatory: true };
  }

  private pageId = 1;

  compose(name: string, includes: string[]): PageDef {
    const code = `Page${this.pageId++}`;
    const p = this.page(code).translate(this.config.defaultLang ?? "en", name);
    includes.forEach(i => {
      p.include(i);
    });
    return { name: code };
  }

  alias(to: string, from: string): PageDef {
    const code = `Page${this.pageId++}`;
    this.page(code)
      .exportTo(to)
      .translate(this.config.defaultLang ?? "en", to)
      .include(from);
    return { name: code };
  }

  emptySection(): string {
    this.emptySectionTitle += " ";
    return this.emptySectionTitle;
  }

  question(
    wording: mlstring,
    variableName: string,
    type: ItemType,
    section?: string
  ): PageItemBuilder {
    return new PageItemBuilder(
      wording,
      variableName,
      type,
      section,
      this.config,
      undefined,
      this
    );
  }
}

const builder = (): SurveyBuilder => new SurveyBuilder();

export { builder };
