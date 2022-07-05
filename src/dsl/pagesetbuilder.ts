import {
  PageSet,
  Page,
  DomainCollection,
  SurveyOptions,
  mlstring,
} from "../domain/index.js";
import { getTranslation, setTranslation } from "../domain/domain.js";
import { DNode } from "./abstracttree.js";
import { IPageSetBuilder, PageDef } from "./builders.js";
import { SurveyBuilder } from "./surveybuilder.js";

export class PageSetBuilder implements IPageSetBuilder, DNode<PageSet> {
  readonly pageDefs: PageDef[] = [];
  datevar?: string;

  constructor(
    public type: mlstring,
    private readonly config: SurveyOptions,
    private readonly builder?: SurveyBuilder
  ) {}

  get pageNames(): string[] {
    return this.pageDefs.map(p => p.name);
  }

  get mandatoryPageNames(): string[] {
    return this.pageDefs.filter(p => p.mandatory).map(p => p.name);
  }

  pageSet(type: mlstring): IPageSetBuilder {
    if (!this.builder) throw "builder is not fluent";
    return this.builder.pageSet(type);
  }

  translate(lang: string, translation: string): IPageSetBuilder {
    this.type = setTranslation(
      lang == this.config.defaultLang ? "__code__" : this.config.defaultLang
    )(this.type, lang, translation);
    return this;
  }

  pages(...pageDefs: (PageDef | string)[]): IPageSetBuilder {
    this.pageDefs.push(
      ...pageDefs.map(p => (typeof p == "string" ? { name: p } : p))
    );
    return this;
  }

  datevariable(datevariable: string): IPageSetBuilder {
    this.datevar = datevariable;
    return this;
  }

  build(pages: Page[]): PageSet {
    const currentPages = this.pageDefs.map(p => {
      return {
        page: this.mapPage(pages, p.name),
        mandatory: !!p.mandatory,
      };
    });

    return new PageSet(this.type, {
      pages: DomainCollection(...currentPages.map(p => p.page)),
      datevar: this.datevar,
      mandatoryPages: DomainCollection(
        ...currentPages.filter(p => p.mandatory).map(p => p.page)
      ),
    });
  }

  private mapPage(pages: Page[], n: string): Page {
    return pages.find(p => this.samePage(p, n)) ?? this.notFound(n);
  }

  private samePage(p: Page, n: string): boolean {
    return getTranslation(p.name, "__code__", this.config.defaultLang) == n;
  }

  private notFound(n: string): never {
    throw `page ${n} not found`;
  }
}
