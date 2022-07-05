import {
  Context,
  DomainCollection,
  getItem,
  Library,
  TypeArgs,
  ItemType,
  Page,
  PageItem,
  SurveyOptions,
  IDomainCollection,
  Item,
  getTranslation,
  mlstring,
} from "../domain/index.js";
import { DNode } from "./abstracttree.js";
import {
  ICrossRuleBuilder,
  ILibraryBuilder,
  IPageBuilder,
  IPageItemBuilder,
  ISectionBuilder,
} from "./builders.js";
import { PageBuilder } from "./pagebuilder.js";

export class LibraryBuilder implements ILibraryBuilder, DNode<Library> {
  variableNames?: string[];
  contexts?: [string, Context][];
  private _libraryActivation?: [
    (target: string, variableName: string, ...values: unknown[]) => void,
    string,
    ...unknown[]
  ];

  constructor(
    readonly pageName: string,
    readonly mode: { followUp: true } | { initial: true } | undefined,
    private readonly options: SurveyOptions,
    private readonly builder?: PageBuilder,
    private readonly ruleBuilder?: ICrossRuleBuilder
  ) {}

  build(pages: Page[]): Library {
    const page = this.getIncludedPage(pages);
    const pageItems = this.getSelectedItems(page);
    const contexts = this.getContexts(page);
    this.setActivationRule(pageItems ?? page.items);
    if (pageItems && !contexts)
      return new Library(page, DomainCollection(...pageItems));
    if (contexts)
      return new Library(
        page,
        pageItems ? DomainCollection(...pageItems) : undefined,
        DomainCollection(...contexts)
      );
    return new Library(page);
  }

  private setActivationRule(items: IDomainCollection<Item> | PageItem[]) {
    if (typeof this._libraryActivation != "undefined") {
      if (typeof this.ruleBuilder == "undefined") throw "builder is not fluent";
      const [action, ...args] = this._libraryActivation;
      items?.forEach(i => {
        action.call(this.ruleBuilder, getItem(i).variableName, ...args);
      });
    }
  }

  private getIncludedPage(pages: Page[]) {
    const page = pages.find(
      p =>
        getTranslation(p.name, "__code__", this.options.defaultLang) ==
        this.pageName
    );
    if (!page) throw `uknown page ${page}`;
    return page;
  }

  private getFolloUpItems(page: Page) {
    const items = page.items.map(getItem);
    return items.filter(
      i => items.findIndex(t => t.variableName == `__${i.variableName}`) > -1
    );
  }

  private getSelectedItems(page: Page) {
    if (this.mode && "initial" in this.mode) return this.getFolloUpItems(page);
    if (page.items.length == this.variableNames?.length) return undefined;
    return this.variableNames?.map(
      v => page.items.map(getItem).find(i => v == i.variableName) as PageItem
    );
  }

  private getContexts(page: Page) {
    if (this.mode && "followUp" in this.mode)
      return this.getFolloUpItems(page).map(i => ({ pageItem: i, context: 1 }));
    return this.contexts?.map(c => {
      const pageItem = page?.items
        .map(getItem)
        .find(i => c[0] == i.variableName) as PageItem;
      return { pageItem, context: c[1] };
    });
  }

  include(
    pageName: string,
    mode?: { followUp: true } | { initial: true }
  ): ILibraryBuilder {
    if (!this.builder) throw "builder is not fluent";
    return this.builder.include(pageName, mode);
  }

  select(...variableNames: string[]): LibraryBuilder {
    this.variableNames = variableNames;
    return this;
  }

  context(variableName: string, ctx: Context): LibraryBuilder {
    if (!this.contexts) this.contexts = [];
    this.contexts.push([variableName, ctx]);
    return this;
  }

  activateWhen(variableName: string, ...values: unknown[]): ILibraryBuilder {
    if (typeof this.ruleBuilder == "undefined") throw "builder is not fluent";
    this._libraryActivation = [
      this.ruleBuilder.activateWhen,
      variableName,
      ...values,
    ];
    return this;
  }

  visibleWhen(variableName: string, ...values: unknown[]): ILibraryBuilder {
    if (typeof this.ruleBuilder == "undefined") throw "builder is not fluent";
    this._libraryActivation = [
      this.ruleBuilder.visibleWhen,
      variableName,
      ...values,
    ];
    return this;
  }

  modifiableWhen(variableName: string, ...values: unknown[]): ILibraryBuilder {
    if (typeof this.ruleBuilder == "undefined") throw "builder is not fluent";
    this._libraryActivation = [
      this.ruleBuilder.modifiableWhen,
      variableName,
      ...values,
    ];
    return this;
  }

  startSection(title?: string): ISectionBuilder {
    if (!this.builder) throw "builder is not fluent";
    return this.builder.startSection(title);
  }

  endSection(): IPageBuilder {
    if (!this.builder) throw "builder is not fluent";
    return this.builder.endSection();
  }

  question(
    x: mlstring,
    y: string | ItemType | TypeArgs,
    z?: ItemType | TypeArgs,
    t?: ItemType | TypeArgs | { followUp?: true },
    ...o: ItemType[]
  ): IPageItemBuilder {
    if (!this.builder) throw "builder is not fluent";
    if (t && "followUp" in t)
      return this.builder.question(
        x as string,
        y as string,
        z as ItemType,
        t as { followUp: true }
      );

    const types = (typeof y == "string" ? [] : [y]).concat(
      z ? [z] : [],
      t ? [t as ItemType] : [],
      ...o
    );
    if (typeof y == "string") {
      const [h, ...t] = types;
      return this.builder.question(x, y, h, ...t);
    }
    return this.builder.question(x as string, y, ...types);
  }

  info(wording: mlstring | string[], name: string): IPageItemBuilder {
    if (!this.builder) throw "builder is not fluent";
    wording = Array.isArray(wording) ? wording.join("\n\n") : wording;
    return this.builder.info(wording, name);
  }
}
