import {
  PageItem,
  ItemType,
  DomainCollection,
  SurveyOptions,
  mlstring,
  UnitRule,
  ItemTypes,
  Rules,
  RuleName,
  RuleArgs,
  HasContext,
  isContextual,
  TypeArgs,
  isamplemType,
  PivotKpi,
  Macros,
} from "../domain/index.js";
import {
  Computed,
  ILibraryBuilder,
  IPageBuilder,
  IPageItemBuilder,
  isComputed,
  isCopy,
  ISectionBuilder,
} from "./builders.js";
import { PageBuilder } from "./pagebuilder.js";
import { DNode } from "./abstracttree.js";
import {
  getTranslation,
  isMLstring,
  setTranslation,
} from "../domain/domain.js";
import { ConstantRule } from "../domain/rule/unitrule.js";
import { SurveyBuilder } from "./surveybuilder.js";

export class PageItemBuilder implements IPageItemBuilder, DNode<PageItem> {
  readonly array: boolean;
  readonly type: ItemType;
  readonly rules: UnitRule[] = [];
  readonly units: { values: string[]; isExtendable: boolean } = {
    values: [],
    isExtendable: false,
  };
  itemComment?: mlstring;
  pinTitle?: mlstring;
  kpiTitle?: mlstring;
  kpiPivot?: string;
  private built?: PageItem;
  default: unknown;

  constructor(
    public wording: mlstring | HasContext<mlstring>,
    readonly variableName: string,
    type: ItemType | TypeArgs,
    readonly section: mlstring | undefined,
    private readonly config: SurveyOptions,
    private readonly builder?: PageBuilder,
    private readonly crossRulesBuilder?: SurveyBuilder
  ) {
    this.type = isamplemType(type) ? type : ItemTypes.create(type);
    this.array =
      wording != undefined &&
      (isMLstring(wording) ? isArray(wording) : wording.some(w => isArray(w)));

    function isArray(w: mlstring): boolean {
      return /^\s*(\+\+|->)/.test(getTranslation(w) ?? "");
    }
  }

  translate(
    lang: string,
    translation: string,
    ...contexts: string[]
  ): IPageItemBuilder {
    if (isContextual(this.wording)) {
      const t = [translation, ...contexts];
      for (const i in this.wording) {
        this.wording[i] = this.tr(this.wording[i], lang, t[i]);
      }
    } else this.wording = this.tr(this.wording, lang, translation);
    return this;
  }

  private tr(
    w: mlstring,
    lang: string,
    t: string
  ): string | Record<string, string> {
    return setTranslation(this.config.defaultLang)(w, lang, t);
  }

  question(
    x: mlstring,
    y: string | ItemType | TypeArgs,
    z?: ItemType | TypeArgs,
    t?: ItemType | TypeArgs | { followUp?: true },
    ...o: ItemType[]
  ): IPageItemBuilder {
    if (!this.builder) throw "builder is not fluent";
    return this.builder.question(x, y, z, t, ...o);
  }

  wordings(
    wording1: mlstring,
    wording2: mlstring,
    ...contexts: mlstring[]
  ): IPageItemBuilder {
    this.wording = [wording1, wording2, ...contexts];
    return this;
  }

  comment(comment: mlstring): IPageItemBuilder {
    this.itemComment = comment;
    const p = new Proxy(this, {
      get: function (target, method, receiver) {
        if (method == "translate") return translateComment.bind(target);
        return Reflect.get(target, method, receiver).bind(target);
      },
    });
    const translateComment = this.translateComment(p);
    return Object.create(p);
  }

  private translateComment(p: PageItemBuilder) {
    return function (
      this: PageItemBuilder,
      lang: string,
      translation: string
    ): IPageItemBuilder {
      this.itemComment = setTranslation(this.config.defaultLang)(
        this.itemComment,
        lang,
        translation
      );
      return p;
    };
  }

  pin(title: mlstring): IPageItemBuilder {
    this.pinTitle = title;
    const p = new Proxy(this, {
      get: function (target, method, receiver) {
        if (method == "translate") method = "translatePin";
        return Reflect.get(target, method, receiver).bind(target);
      },
    });
    return Object.create(p);
  }

  kpi(title: mlstring, pivot?: string): IPageItemBuilder {
    this.kpiTitle = title;
    this.kpiPivot = pivot;
    const p = new Proxy(this, {
      get: function (target, method, receiver) {
        if (method == "translate") method = "translateKpi";
        return Reflect.get(target, method, receiver).bind(target);
      },
    });
    return Object.create(p);
  }

  protected translateKpi(lang: string, translation: string): IPageItemBuilder {
    this.kpiTitle = setTranslation(this.config.defaultLang)(
      this.kpiTitle,
      lang,
      translation
    );
    return this;
  }

  protected translatePin(lang: string, translation: string): IPageItemBuilder {
    this.pinTitle = setTranslation(this.config.defaultLang)(
      this.pinTitle,
      lang,
      translation
    );
    return this;
  }

  info(wording: mlstring | string[], name: string): IPageItemBuilder {
    wording = Array.isArray(wording) ? wording.join("\n\n") : wording;
    return this.question(wording, name, ItemTypes.info);
  }

  include(
    pageName: string,
    mode?: { followUp: true } | { initial: true }
  ): ILibraryBuilder {
    if (!this.builder) throw "builder is not fluent";
    return this.builder.include(pageName, mode);
  }

  startSection(title?: mlstring): ISectionBuilder {
    if (!this.builder) throw "builder is not fluent";
    return this.builder.startSection(title);
  }

  endSection(): IPageBuilder {
    if (!this.builder) throw "builder is not fluent";
    return this.builder.endSection();
  }

  unit(...units: string[]): this {
    this.units.values.push(...units);
    return this;
  }

  extendable(): this {
    this.units.isExtendable = true;
    return this;
  }

  required(formula?: string | Computed): this {
    formula = isComputed(formula) ? formula.formula : formula;
    return typeof formula == "string"
      ? this.dynamic([this.variableName], "required", [formula])
      : this.rule("required");
  }

  critical(
    event: string | Computed,
    message?: string,
    ...values: unknown[]
  ): this {
    return this.isComputed(event, values[0])
      ? this.dynamic([this.variableName], "critical", [
          isComputed(event) ? event : { formula: `'${event}'` },
          { formula: `'${message ?? event}'` },
          values[0],
        ])
      : this.rule("critical", event, message ?? event, ...values);
  }

  inRange(
    min: number | Date | Computed,
    max: number | Date | Computed,
    limits?: { includeLower: boolean; includeUpper: boolean }
  ): this {
    const theLimits =
      this.type.name === "integer" || this.type.name == "date"
        ? { includeLower: true, includeUpper: true }
        : limits;
    return this.isComputed(min, max)
      ? this.dynamic([this.variableName], "inRange", [min, max], theLimits)
      : this.rule("inRange", min, max, theLimits);
  }

  private isComputed(...values: unknown[]) {
    return values.some(isComputed);
  }

  inPeriod(start: Date | Computed, end: Date | Computed): this {
    return this.inRange(start, end);
  }

  activateWhen(variableName: string, ...values: unknown[]): IPageItemBuilder {
    if (!this.crossRulesBuilder) throw "crossRulesBuilder is not fluent";
    this.crossRulesBuilder.activateWhen(
      this.variableName,
      variableName,
      ...values
    );
    return this;
  }

  visibleWhen(variableName: string, ...values: unknown[]): IPageItemBuilder {
    if (!this.crossRulesBuilder) throw "crossRulesBuilder is not fluent";
    this.crossRulesBuilder.visibleWhen(
      this.variableName,
      variableName,
      ...values
    );
    return this;
  }

  modifiableWhen(variableName: string, ...values: unknown[]): IPageItemBuilder {
    if (!this.crossRulesBuilder) throw "crossRulesBuilder is not fluent";
    this.crossRulesBuilder.modifiableWhen(
      this.variableName,
      variableName,
      ...values
    );
    return this;
  }

  computed(formula: string | Computed): IPageItemBuilder {
    formula = isComputed(formula) ? formula.formula : formula;
    if (!this.crossRulesBuilder) throw "crossRulesBuilder is not fluent";
    const crossRule = this.crossRulesBuilder.computed(
      this.variableName,
      formula
    );
    if (crossRule.isUnitRule())
      this.rules.push(crossRule.getRule() as UnitRule);
    return this;
  }

  memorize(): IPageItemBuilder {
    return this.computed(Macros.memorize(this.variableName));
  }

  maxLength(length: number): this {
    return this.rule("maxLength", length);
  }

  decimalPrecision(precision: number): this {
    return this.rule("decimalPrecision", precision);
  }

  fixedLength(length: number): this {
    return this.rule("fixedLength", length);
  }

  letterCase(letterCase: "upper" | "lower"): this {
    return this.rule("letterCase", letterCase);
  }

  private dynamic(
    variableNames: string[],
    underlyingRule: RuleName,
    values: unknown[],
    ...extraArgs: unknown[]
  ) {
    if (!this.crossRulesBuilder) throw "crossRulesBuilder is not fluent";
    const crossRule = this.crossRulesBuilder.dynamic(
      variableNames,
      underlyingRule,
      values,
      ...extraArgs
    );
    if (crossRule.isUnitRule())
      this.rules.push(crossRule.getRule() as UnitRule);
    return this;
  }

  rule(args: RuleArgs): this;
  rule(name: RuleName, ...args: unknown[]): this;
  rule(x: RuleName | RuleArgs, ...args: unknown[]): this {
    this.rules.push(
      typeof x == "string" ? Rules.create(x, ...args) : Rules.create(x)
    );
    return this;
  }

  defaultValue(defaultValue: unknown): this {
    if (isCopy(defaultValue)) {
      if (!this.crossRulesBuilder) throw "crossRulesBuilder is not fluent";
      this.crossRulesBuilder
        .copy(this.variableName, defaultValue.source)
        .trigger("initialization");
    } else if (isComputed(defaultValue)) {
      if (!this.crossRulesBuilder) throw "crossRulesBuilder is not fluent";
      this.crossRulesBuilder
        .computed(this.variableName, defaultValue.formula)
        .trigger("initialization");
    } else this.default = defaultValue;
    return this;
  }

  build(pageItems: (PageItem | PageItemBuilder)[]): PageItem {
    if (!this.built)
      this.built = new PageItem(this.wording, this.variableName, this.type, {
        units: this.units,
        section: this.section,
        rules: DomainCollection(...this.rules),
        comment: this.itemComment,
        pin: this.pinTitle,
        kpi: this.buildKpi(pageItems),
        defaultValue:
          this.default == undefined
            ? undefined
            : new ConstantRule(this.default),
        array: this.array,
      });
    return this.built;
  }

  private buildKpi(
    pageItems: (PageItem | PageItemBuilder)[]
  ): undefined | mlstring | PivotKpi {
    if (typeof this.kpiTitle == "undefined") return undefined;
    if (typeof this.kpiPivot != "undefined")
      return this.buildPivotKpi(pageItems, this.kpiTitle);
    return this.kpiTitle;
  }

  private buildPivotKpi(
    pageItems: (PageItem | PageItemBuilder)[],
    title: mlstring
  ) {
    const pivot = this.getPivotItem(pageItems);
    if (typeof pivot == "undefined")
      throw `pivot variable ${this.kpiPivot} does not exist in same page`;
    return { title, pivot };
  }

  private getPivotItem(pageItems: (PageItem | PageItemBuilder)[]) {
    const pivot = pageItems.find(p => p.variableName == this.kpiPivot);
    if (pivot instanceof PageItem) return pivot;
    return pivot?.build([]);
  }
}
