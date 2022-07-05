import { Domain, mlstring } from "./domain.js";
import { DomainCollection } from "./domaincollection.js";
import { IDomainCollection } from "./domaincollectiondef.js";
import { ContextType, ItemType } from "./itemtype.js";
import { ConstantRule, UnitRule } from "./rule/unitrule.js";

type InstanceNumber<T extends "prototype" | "instance"> = T extends "prototype"
  ? 1
  : number;

export class PageItem<
  T extends "prototype" | "instance" = "prototype" | "instance"
> {
  readonly wording: mlstring | HasContext<mlstring>;
  readonly variableName: string;
  readonly type: ItemType | HasContext<ItemType>;
  readonly rules = DomainCollection<UnitRule>();
  readonly units?: { values: string[]; isExtendable: boolean } | string[];
  readonly comment?: mlstring;
  readonly section?: mlstring = undefined;
  readonly pin?: mlstring;
  readonly kpi?: mlstring | PivotKpi;
  readonly defaultValue?: ConstantRule;
  readonly array: boolean = false;
  readonly instance: InstanceNumber<T> = <InstanceNumber<T>>1;

  constructor(
    wording: mlstring | HasContext<mlstring>,
    variableName: string,
    type: ItemType | HasContext<ItemType>,
    kwargs?: Partial<PageItem<T>>
  ) {
    this.wording = wording;
    this.variableName = variableName;
    this.type = type;
    Object.assign(this, kwargs);
    Domain.extend(this);
  }

  private static instanceMap = new WeakMap<PageItem, PageItem>();

  nextInstance(): PageItem {
    if (!this.array) throw "page item does not accept multiple instances";
    if (PageItem.instanceMap.has(this)) {
      return PageItem.instanceMap.get(this) as PageItem;
    }
    const instance = (<PageItem>this).update({
      instance: this.instance + 1,
    });
    PageItem.instanceMap.set(this, instance);
    return instance;
  }

  hasNextInstance(): boolean {
    return PageItem.instanceMap.has(this);
  }

  isInstanceOf(prototype: PageItem<"prototype">, instance?: number): boolean {
    if (prototype.instance != 1) throw "not a prototype";
    return (
      this.samePrototype(prototype) && (!instance || this.instance == instance)
    );
  }

  samePrototype(instance: PageItem): boolean {
    return this.variableName == instance.variableName;
  }

  update(kwargs: Partial<PageItem<T>>): PageItem<T> {
    return Domain.update(this, kwargs, [
      PageItem,
      this.wording,
      this.variableName,
      this.type,
    ]);
  }

  static getInstance(
    prototype: PageItem<"prototype">,
    instance: number
  ): PageItem<"instance"> {
    if (prototype.instance != 1) throw "not a prototype";
    return PageItem.getSibling(prototype, instance);
  }

  private static getSibling(
    pageItem: PageItem<"prototype" | "instance">,
    instance: number
  ): PageItem<"instance"> {
    if (pageItem.instance == instance) return pageItem;
    return PageItem.getSibling(pageItem.nextInstance(), instance);
  }

  static getInstances(prototype: PageItem<"prototype">): PageItem[] {
    if (prototype.instance != 1) throw "not a prototype";
    const result = [prototype];

    let r: PageItem<"prototype" | "instance"> = prototype;
    while (r.hasNextInstance()) {
      r = r.nextInstance();
      result.push(r);
    }

    return result;
  }
}

export type SingleContext = number;
export type Memento = number | string;
export type ContextWithMemento = [SingleContext, Memento];
export type Context = SingleContext | ContextWithMemento;

export function hasMemento(
  context: Context | undefined
): context is ContextWithMemento {
  return Array.isArray(context) && context.length > 1;
}

export interface ItemWithContext<
  T extends "prototype" | "instance" = "prototype" | "instance"
> {
  pageItem: PageItem<T>;
  context: Context;
}

export type HasContext<T extends mlstring | ItemType> = T extends ItemType
  ? { [context: number]: T } & T
  : mlstring[];

export type Item<
  T extends "prototype" | "instance" = "prototype" | "instance"
> = PageItem<T> | ItemWithContext<T>;

export function isamplem(item: unknown): item is Item {
  return (
    item instanceof PageItem ||
    ((<ItemWithContext>item)?.pageItem instanceof PageItem &&
      !!(<ItemWithContext>item)?.context)
  );
}

export function isContextual(
  o: mlstring | HasContext<mlstring>
): o is HasContext<mlstring>;
export function isContextual(
  o: ItemType | HasContext<ItemType>
): o is HasContext<ItemType>;
export function isContextual(
  o: mlstring | ItemType | HasContext<mlstring> | HasContext<ItemType>
): o is HasContext<mlstring> | HasContext<ItemType> {
  if (typeof o == "string") return false;
  if (Array.isArray(o)) return true;
  return 0 in (o as ItemType);
}

export function getItem(item: Item): PageItem {
  if (item instanceof PageItem) return item;
  return item.pageItem;
}

export function getItemContext(
  item: Item | { context?: Context }
): SingleContext {
  return hasContext(item)
    ? hasMemento(item.context)
      ? item.context[0]
      : item.context
    : 0;
}

export function hasContext(
  item: Item | { context?: Context }
): item is ItemWithContext {
  return "context" in item;
}

export function getItemWording(
  item: Item | { wording: mlstring | mlstring[]; context?: Context }
): mlstring {
  const wording = "pageItem" in item ? item.pageItem.wording : item.wording;
  const context = getItemContext(item);
  return Array.isArray(wording) ? wording[context] : wording;
}

export function getItemType(
  item: Item | { type: ItemType; context?: Context }
): ItemType {
  const type = "pageItem" in item ? item.pageItem.type : item.type;
  const context = getItemContext(item);
  return type instanceof ContextType ? type[context] : type;
}

export function getItemUnits(item: Item): string[] {
  const units = getItem(item).units;
  if (units == undefined) return [];
  if (Array.isArray(units)) return units;
  return units.values;
}

export function getItemMemento(
  item: Item | { context?: Context }
): Memento | undefined {
  return hasContext(item) && hasMemento(item.context)
    ? tryNumber(item.context[1])
    : undefined;
}

function tryNumber(o: Memento): Memento {
  const t1 = Number(o);
  if (!isNaN(t1)) return t1;
  const t2 = new Date(o).getTime();
  if (!isNaN(t2)) return t2;
  return o;
}

export function groupBySection<T extends { pageItem: Item }>(
  pageItems: IDomainCollection<T>
): IDomainCollection<{
  title?: mlstring;
  items: IDomainCollection<T>;
}> {
  return pageItems.reduce((result, q) => {
    const item = getItem(q.pageItem);
    if (result.length == 0 || result[result.length - 1].title != item.section)
      return result.append({ title: item.section, items: DomainCollection(q) });

    return result.update(r =>
      r == result.last ? { title: r.title, items: r.items.append(q) } : r
    );
  }, DomainCollection());
}

export type PivotKpi = {
  title: mlstring;
  pivot: PageItem;
};

export function hasPivot(
  kpi: undefined | mlstring | PivotKpi
): kpi is PivotKpi {
  return typeof kpi == "object" && typeof kpi.pivot == "object";
}
