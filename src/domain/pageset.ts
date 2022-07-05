import { Domain, mlstring } from "./domain.js";
import { DomainCollection } from "./domaincollection.js";
import { IDomainCollection } from "./domaincollectiondef.js";
import { Page } from "./page.js";
import { getItem, Item } from "./pageitem.js";

class PageSet {
  readonly type: mlstring;
  readonly pages = DomainCollection<Page>();
  readonly datevar: string | undefined;
  readonly items: IDomainCollection<Item<"prototype">>;
  readonly mandatoryPages? = DomainCollection<Page>();
  private readonly itemForVariables: Map<string, Item<"prototype">>;
  private readonly pagesForItems: Map<string, IDomainCollection<Page>>;

  constructor(type: mlstring, kwargs?: Partial<PageSet>) {
    this.type = type;
    Object.assign(this, kwargs);
    this.items = this.getItems();
    this.itemForVariables = this.getItemForVariables();
    this.pagesForItems = this.getPagesForItems();
    Object.defineProperty(this, "items", { enumerable: false });
    Object.defineProperty(this, "itemForVariables", { enumerable: false });
    Object.defineProperty(this, "pagesForItems", { enumerable: false });
    Domain.extend(this);
  }

  private getItemForVariables() {
    return this.items.reduce((result, item) => {
      result.set(getItem(item).variableName, item);
      return result;
    }, new Map<string, Item>());
  }

  private getPagesForItems(): Map<string, IDomainCollection<Page>> {
    return this.pages.reduce(
      (acc, page) => this.addItemsForPage(acc, page),
      new Map<string, IDomainCollection<Page>>()
    );
  }

  private addItemsForPage(
    acc: Map<string, IDomainCollection<Page>>,
    page: Page
  ) {
    return page.items.reduce(
      (acc, item) => this.addItemForPage(acc, page, item),
      acc
    );
  }

  private addItemForPage(
    acc: Map<string, IDomainCollection<Page>>,
    page: Page,
    item: Item<"prototype">
  ) {
    const rawItem = getItem(item).variableName;
    const pages = acc.get(rawItem);
    if (pages) acc.set(rawItem, pages.append(page));
    else acc.set(rawItem, DomainCollection(page));
    return acc;
  }

  private getItems(): IDomainCollection<Item<"prototype">> {
    return this.pages.reduce(
      (result, p) =>
        p.items.reduce(
          (r, i) =>
            r.findIndex(t => getItem(t) == getItem(i)) > -1 ? r : r.append(i),
          result
        ),
      DomainCollection()
    );
  }

  update(kwargs: Partial<PageSet>): PageSet {
    return Domain.update(this, kwargs, [PageSet, this.type]);
  }

  getPagesForItem(item: Item): IDomainCollection<Page> {
    return (
      this.pagesForItems.get(getItem(item).variableName) ?? DomainCollection()
    );
  }

  getItemForVariable(variableName: string): Item<"prototype"> | undefined {
    return this.itemForVariables.get(variableName);
  }

  hasamplem(item: Item<"prototype">): boolean {
    return this.pagesForItems.has(getItem(item).variableName);
  }

  public isMandatory(page: Page): boolean {
    return (
      !!this.mandatoryPages?.includes(page) && page.requiredItems.length != 0
    );
  }

  get pins(): IDomainCollection<Item<"prototype">> {
    return this.items.filter(i => getItem(i).pin);
  }

  get kpis(): IDomainCollection<Item<"prototype">> {
    return this.items.filter(i => getItem(i).kpi);
  }
}

export { PageSet };
