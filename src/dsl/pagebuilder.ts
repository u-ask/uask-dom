import {
  SurveyOptions,
  Page,
  ItemType,
  mlstring,
  PageItem,
  Library,
  DomainCollection,
  ItemTypes,
  TypeArgs,
} from "../domain/index.js";
import { SurveyBuilder } from "./surveybuilder.js";
import { PageItemBuilder } from "./pageitembuilder.js";
import {
  ILibraryBuilder,
  IPageBuilder,
  IPageItemBuilder,
  ISectionBuilder,
} from "./builders.js";
import { DNode } from "./abstracttree.js";
import { LibraryBuilder } from "./inclusionbuilder.js";
import { getTranslation, setTranslation } from "../domain/domain.js";

export class PageBuilder implements IPageBuilder, DNode<Page> {
  readonly includes: (LibraryBuilder | PageItemBuilder)[] = [];
  exportConfig?: { fileName?: string };
  private currentSection?: mlstring;
  private built?: Page;
  private _sectionActivation?: [
    "modifiable" | "enable" | "show",
    string,
    ...unknown[]
  ];

  constructor(
    public name: mlstring,
    private readonly config: SurveyOptions,
    private readonly builder?: SurveyBuilder,
    private readonly crossRulesBuilder?: SurveyBuilder
  ) {}

  get items(): PageItemBuilder[] {
    return this.includes.filter(
      q => q instanceof PageItemBuilder
    ) as PageItemBuilder[];
  }

  translate(lang: string, translation: string): IPageBuilder {
    this.name = setTranslation(
      lang == this.config.defaultLang ? "__code__" : this.config.defaultLang
    )(this.name, lang, translation);
    return this;
  }

  include(
    pageName: string,
    mode?: { followUp: true } | { initial: true }
  ): ILibraryBuilder {
    const builder = new LibraryBuilder(
      pageName,
      mode,
      this.config,
      this,
      this.builder
    );
    this.includes.push(builder);
    return builder;
  }

  startSection(title?: mlstring): ISectionBuilder {
    this.currentSection = title ?? this.builder?.emptySection();
    const p: PageBuilder = new Proxy(this, {
      get: function (target, method, receiver) {
        if (method == "translate") return translateSection.bind(target);
        return Reflect.get(target, method, receiver).bind(target);
      },
    });
    const translateSection = this.translateSection(p);
    return Object.create(p);
  }

  private translateSection(p: PageBuilder) {
    return function (
      this: PageBuilder,
      lang: string,
      translation: string
    ): IPageBuilder {
      this.currentSection = setTranslation(this.config.defaultLang)(
        this.currentSection,
        lang,
        translation
      );
      return p;
    };
  }

  activateWhen(variableName: string, ...values: unknown[]): ISectionBuilder {
    this._sectionActivation = ["enable", variableName, ...values];
    return this;
  }

  visibleWhen(variableName: string, ...values: unknown[]): ISectionBuilder {
    this._sectionActivation = ["show", variableName, ...values];
    return this;
  }

  modifiableWhen(variableName: string, ...values: unknown[]): ISectionBuilder {
    this._sectionActivation = ["modifiable", variableName, ...values];
    return this;
  }

  endSection(): IPageBuilder {
    this.currentSection = undefined;
    this._sectionActivation = undefined;
    return this;
  }

  question(
    x: mlstring,
    y: string | (ItemType | TypeArgs),
    z?: ItemType | TypeArgs,
    t?: (ItemType | TypeArgs) | { followUp?: true },
    ...o: ItemType[]
  ): IPageItemBuilder {
    const wording = x;
    const variableName = typeof y == "string" ? y : (x as string);
    const types = (typeof y == "string" ? [] : [y]).concat(
      z ? [z] : [],
      t ? [t as ItemType] : [],
      ...o
    );
    const pageitemBuilder = new PageItemBuilder(
      wording,
      variableName,
      types.length == 1 ? types[0] : ItemTypes.context(types as ItemType[]),
      this.currentSection,
      this.config,
      this,
      this.crossRulesBuilder
    );
    this.addPageItem(pageitemBuilder);
    this.activation(pageitemBuilder);
    return pageitemBuilder;
  }

  private addPageItem(pageitemBuilder: PageItemBuilder) {
    const ix = this.includes.findIndex(
      i => (i as PageItemBuilder).variableName == pageitemBuilder.variableName
    );
    if (ix == -1) this.includes.push(pageitemBuilder);
    else this.includes[ix] = pageitemBuilder;
  }

  private activation(pageitemBuilder: PageItemBuilder) {
    if (this._sectionActivation) {
      const [behavior, ...args] = this._sectionActivation;
      (behavior == "enable"
        ? PageItemBuilder.prototype.activateWhen
        : behavior == "show"
        ? PageItemBuilder.prototype.visibleWhen
        : PageItemBuilder.prototype.modifiableWhen
      ).call(pageitemBuilder, ...args);
    }
  }

  info(wording: mlstring | string[], name: string): IPageItemBuilder {
    wording = Array.isArray(wording) ? wording.join("\n\n") : wording;
    return this.question(wording, name, ItemTypes.info);
  }

  exportTo(conf: string | { fileName?: string }): IPageBuilder {
    this.exportConfig = typeof conf == "string" ? { fileName: conf } : conf;
    return this;
  }

  build(builders: PageBuilder[]): Page {
    if (this.built) return this.built;
    this.built = this.detectCycle(() => this.resolveAndBuild(builders));
    return this.built;
  }

  private cycle = false;
  private detectCycle(fn: () => Page) {
    if (this.cycle) throw `inclusion cycle detected in ${this.name}`;
    this.cycle = true;
    const built = fn();
    this.cycle = false;
    return built;
  }

  private resolveAndBuild(builders: PageBuilder[]) {
    const includes = this.includes.reduce(
      this.resolve(builders),
      <(Library | PageItem)[]>[]
    );
    return new Page(this.name, {
      includes: DomainCollection(...includes),
      ...(this.exportConfig ? { exportConfig: this.exportConfig } : {}),
    });
  }

  private resolve(builders: PageBuilder[]) {
    return (
      result: (Library | PageItem)[],
      q: LibraryBuilder | PageItemBuilder
    ) => {
      if (q instanceof PageItemBuilder) result.push(q.build(this.items));
      else {
        const page = this.getIncludes(builders, q);
        result.push(q.build([page]));
      }
      return result;
    };
  }

  private getIncludes(builders: PageBuilder[], q: DNode<Library>) {
    const notFound = (n: string) => {
      throw `page ${n} not found`;
    };
    const builder =
      builders.find(
        b =>
          getTranslation(b.name, "__code__", this.config.defaultLang) ==
          q.pageName
      ) ?? notFound(q.pageName);
    return builder.build(builders);
  }
}
