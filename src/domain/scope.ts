import { IDomainCollection } from "./domaincollectiondef.js";
import { InterviewItem } from "./interviewitem.js";
import { ItemTypes } from "./itemtypes.js";
import { getItem, Item, PageItem } from "./pageitem.js";
import { Sample } from "./sample.js";

export const inDateItem = new PageItem(
  "Last input",
  "INDATE",
  ItemTypes.date(false)
);

export const sampleItem = new PageItem("Sample code", "SAMPLE", ItemTypes.text);

export const acknowledgeItem = new PageItem(
  "Acknowledge",
  "ACK",
  ItemTypes.acknowledge
);

export const undefinedItem = new PageItem(
  "Undefined",
  "UNDEF",
  ItemTypes.yesno
);

export const todayItem = new PageItem("Today", "TODAY", ItemTypes.date(false));

export const thisYearItem = new PageItem(
  "ThisYear",
  "THISYEAR",
  ItemTypes.integer
);

export const globalItems = [
  inDateItem,
  sampleItem,
  todayItem,
  thisYearItem,
  acknowledgeItem,
  undefinedItem,
];

export type ScopeLevel = "global" | "outer" | "local";

function isScopeLevel(x: unknown): x is ScopeLevel {
  return x == <const>"global" || x == <const>"outer" || x == <const>"local";
}

export type ScopedItem = readonly [PageItem, ScopeLevel];

export function isScopedItem(x: unknown): x is ScopedItem {
  return (
    Array.isArray(x) &&
    x.length == 2 &&
    x[0] instanceof PageItem &&
    isScopeLevel(x[1])
  );
}

export type Missing = { missing: true };

const missing: Missing = { missing: <const>true };

export function isMissing(o: Partial<Missing>): o is Missing {
  return !!o.missing;
}

export function getScopedItem(x: PageItem | ScopedItem): PageItem {
  return isScopedItem(x) ? x[0] : x;
}

export function getScope(x: PageItem | ScopedItem): ScopeLevel {
  return isScopedItem(x) ? x[1] : "local";
}

interface IScope {
  readonly items: InterviewItem[];
  get(
    pageItem: PageItem,
    level: ScopeLevel
  ): InterviewItem | Missing | undefined;
}

abstract class AbstractScope {
  constructor(
    readonly items: InterviewItem[],
    readonly pageItems: Coll<Item>
  ) {}

  protected getItem(pageItem: PageItem): InterviewItem | Missing | undefined {
    const item = this.items.find(i => i.pageItem == pageItem);
    return item ?? (this.shouldExist(pageItem) ? missing : undefined);
  }

  private shouldExist(pageItem: PageItem) {
    return this.pageItems.findIndex(i => getItem(i) == pageItem) > -1;
  }
}

export class GlobalScope extends AbstractScope implements IScope {
  constructor(readonly participant?: { lastInput: Date; sample?: Sample }) {
    super(
      [
        ...(participant?.lastInput
          ? [new InterviewItem(inDateItem, participant.lastInput)]
          : []),
        ...(participant?.sample
          ? [new InterviewItem(sampleItem, participant.sample.sampleCode)]
          : []),
        new InterviewItem(todayItem, today()),
        new InterviewItem(thisYearItem, new Date().getFullYear()),
        new InterviewItem(acknowledgeItem, true),
        new InterviewItem(undefinedItem, undefined),
      ],
      [
        ...(participant?.lastInput ? [inDateItem] : []),
        todayItem,
        acknowledgeItem,
        undefinedItem,
      ]
    );
  }

  get(
    pageItem: PageItem,
    level: ScopeLevel
  ): InterviewItem | Missing | undefined {
    if (level != "global") return undefined;
    return super.getItem(pageItem);
  }
}

type Coll<T> = IDomainCollection<T> | ReadonlyArray<T>;
type Hasamplems = { items: Coll<InterviewItem>; pageSet?: { items: Coll<Item> } };
type Scopable =
  | Coll<Hasamplems>
  | { lastInput: Date; interviews: Coll<Hasamplems> };

export class Scope extends AbstractScope implements IScope {
  private constructor(
    readonly parentScope: IScope,
    readonly items: InterviewItem[],
    readonly pageItems: Coll<Item>
  ) {
    super(items, pageItems);
  }

  get(pageItem: PageItem | ScopedItem): InterviewItem | undefined;
  get(pageItem: PageItem, level: ScopeLevel): InterviewItem | undefined;
  get(
    x: PageItem | [PageItem, ScopeLevel],
    y: ScopeLevel = "local"
  ): InterviewItem | Missing | undefined {
    const pageItem = x instanceof PageItem ? x : x[0];
    const level = x instanceof PageItem ? y : x[1];
    switch (level) {
      case "global":
        return this.parentScope.get(pageItem, "global");
      case "outer":
        return this.parentScope.get(pageItem, "local");
      case "local":
        return super.getItem(pageItem);
    }
  }

  with(transients: InterviewItem[]): Scope {
    if (transients.length == 0) return this;
    const items = Scope.merge(this.items, transients);
    return new Scope(this.parentScope, items, this.pageItems);
  }

  static create(outer: Scopable, local?: Hasamplems): Scope {
    const { participant, outerItems, localItems } = Scope.getItemsByScopes(
      outer,
      local
    );
    const globalScope = new GlobalScope(participant);
    const [outerHead, ...outerTail] = outerItems;
    const outerScope = outerHead
      ? outerTail.reduce(
          (scope: Scope, i: Hasamplems) => scope.with([...i.items]),
          new Scope(globalScope, [...outerHead.items], [])
        )
      : globalScope;
    const pageItems = local?.pageSet
      ? local.pageSet.items
      : localItems.map(i => i.pageItem);
    return new Scope(outerScope, localItems, pageItems);
  }

  private static getItemsByScopes(outer: Scopable, local?: Hasamplems) {
    const participant = "lastInput" in outer ? outer : undefined;
    const outerItems =
      "interviews" in outer ? [...Scope.takeOuter(outer, local)] : outer;
    const localItems = local ? [...local.items] : [];
    return { participant, outerItems, localItems };
  }

  private static takeOuter(
    outer: { interviews: Coll<Hasamplems> },
    local?: Hasamplems
  ) {
    const x = local ? outer.interviews.indexOf(local) : -1;
    return outer.interviews.slice(0, x >= 0 ? x : outer.interviews.length);
  }

  private static merge(
    items: InterviewItem[],
    transients: InterviewItem[]
  ): InterviewItem[] {
    const result = [...items];
    for (const item of transients) {
      const i = result.findIndex(r => r.pageItem == item.pageItem);
      if (i == -1) result.push(item);
      else result[i] = item;
    }
    return result;
  }
}

function today(): unknown {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
