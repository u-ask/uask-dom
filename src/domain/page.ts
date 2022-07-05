import { Domain, mlstring } from "./domain.js";
import { DomainCollection } from "./domaincollection.js";
import { IDomainCollection } from "./domaincollectiondef.js";
import { Item, getItem, ItemWithContext } from "./pageitem.js";
import { PageItem } from "./pageitem.js";
import { RequiredRule } from "./rule/unitrule.js";

class Library {
  constructor(
    readonly page: Page,
    readonly pageItems?: IDomainCollection<PageItem<"prototype">>,
    readonly contexts?: IDomainCollection<ItemWithContext<"prototype">>
  ) {
    Domain.extend(this);
  }

  get items(): IDomainCollection<Item<"prototype">> {
    return (
      !this.pageItems || this.pageItems.length == 0
        ? this.page.items
        : this.pageItems
    ).map(i => this.contexts?.find(c => c.pageItem == getItem(i)) ?? i);
  }
}

export type Include = Library | PageItem<"prototype">;

class Page {
  readonly name: mlstring;
  readonly includes = DomainCollection<Include>();
  readonly items: IDomainCollection<Item<"prototype">>;
  readonly array: boolean;
  readonly requiredItems: IDomainCollection<Item<"prototype">>;
  readonly pins: IDomainCollection<Item<"prototype">>;
  readonly kpis: IDomainCollection<Item<"prototype">>;
  readonly exportConfig?: { fileName?: string };

  constructor(name: mlstring, kwargs?: Partial<Page>) {
    this.name = name;
    Object.assign(this, kwargs);
    this.items = this.getItems();
    this.requiredItems = this.getRequiredItems();
    this.pins = this.getPins();
    this.kpis = this.getKpis();
    this.array = this.isArray();
    Object.defineProperty(this, "item", { enumerable: false });
    Object.defineProperty(this, "array", { enumerable: false });
    Object.defineProperty(this, "requiredItems", { enumerable: false });
    Object.defineProperty(this, "pins", { enumerable: false });
    Object.defineProperty(this, "kpis", { enumerable: false });
    Domain.extend(this);
  }

  private getItems() {
    return this.includes.reduce((result, l) => {
      return l instanceof PageItem
        ? result.append(l)
        : l.items.reduce((r, i) => (r.includes(i) ? r : r.append(i)), result);
    }, DomainCollection<Item<"prototype">>());
  }

  private getRequiredItems(): IDomainCollection<Item<"prototype">> {
    return this.items.filter(i =>
      getItem(i).rules.some(rule => rule instanceof RequiredRule)
    );
  }

  private getPins(): IDomainCollection<Item<"prototype">> {
    return this.items.filter(i => getItem(i).pin);
  }

  private getKpis(): IDomainCollection<Item<"prototype">> {
    return this.items.filter(i => getItem(i).kpi);
  }

  private isArray(): boolean {
    return this.items.length != 0 && this.items.every(i => getItem(i).array);
  }

  update(kwargs: Partial<Page>): Page {
    return Domain.update(this, kwargs, [Page, this.name]);
  }
}

export { Library, Page };
