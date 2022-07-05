import { InterviewItem } from "./interviewitem.js";
import { DomainCollection } from "./domaincollection.js";
import { HideableVarDef, SurveyOptions } from "./survey.js";
import { PageSet } from "./pageSet.js";
import { Page } from "./page.js";
import { Domain } from "./domain.js";
import { IDomainCollection } from "./domaincollectiondef.js";
import { Item, PageItem, hasContext, hasPivot } from "./pageitem.js";
import { ItemTypes } from "./itemtypes.js";
import { getItem, getItemType } from "./pageitem.js";
import { Status } from "./status.js";
import { RuleAlert } from "./alert.js";
import { Difference, Differentiable } from "./diff.js";

export type ZippedInterview = [
  Partial<Interview>,
  {
    items: Partial<InterviewItem>[];
  }
];

function isZippedInterview(
  o: Partial<Interview> | ZippedInterview
): o is ZippedInterview {
  return Array.isArray(o);
}

export class Interview implements Differentiable {
  readonly nonce: number = 0;
  readonly pageSet: PageSet;
  readonly options: SurveyOptions;
  readonly items = DomainCollection<InterviewItem>();
  readonly lastInput = new Date();
  private readonly _itemsForPages = new Map<
    Page,
    IDomainCollection<InterviewItem>
  >();
  private readonly _statusForPages = new Map<Page, Status>();
  private readonly _itemForVariables = new Map<string, InterviewItem>();

  constructor(
    pageSet: PageSet,
    options: SurveyOptions,
    kwargs?: Partial<Interview>
  ) {
    this.pageSet = pageSet;
    this.options = options;
    Object.assign(this, kwargs);
    Object.defineProperty(this, "_itemsForPages", { enumerable: false });
    Object.defineProperty(this, "_statusForPages", { enumerable: false });
    Object.defineProperty(this, "_itemForVariables", { enumerable: false });
    Object.defineProperty(this, "_processesForVariables", {
      enumerable: false,
    });
    Object.defineProperty(this, "_knownActions", { enumerable: false });
    Object.defineProperty(this, "_instances", { enumerable: false });
    Domain.extend(this);
  }

  private get itemForVariables() {
    if (this._itemForVariables.size == 0) {
      this.getItemForVariables(this._itemForVariables);
    }
    return this._itemForVariables;
  }

  private get itemsForPages() {
    if (this._itemsForPages.size == 0) {
      this.getItemsForPages(this._itemsForPages);
    }
    return this._itemsForPages;
  }

  private get statusForPages() {
    if (this._statusForPages.size == 0) {
      this.getStatusForPages(this._statusForPages);
    }
    return this._statusForPages;
  }

  private getItemForVariables(
    itemForVariables: Map<string, InterviewItem>
  ): Map<string, InterviewItem> {
    return this.items.reduce((r, item) => {
      const itemKey = this.getItemKey(item.pageItem, item.pageItem.instance);
      r.set(itemKey, item);
      return r;
    }, itemForVariables);
  }

  private getItemKey(item: string | PageItem, instance: number) {
    if (item instanceof PageItem) {
      instance = item.instance;
      item = item.variableName;
    }
    return `${item}@${instance}`;
  }

  private getItemsForPages(
    itemsForPages: Map<Page, IDomainCollection<InterviewItem>>
  ): Map<Page, IDomainCollection<InterviewItem>> {
    this.pageSet.pages.forEach(page => {
      itemsForPages.set(page, DomainCollection<InterviewItem>());
    });
    return this.items.reduce((acc, item) => {
      const pages = this.pageSet.getPagesForItem(item);
      this.setItemForPages(acc, item, pages);
      return acc;
    }, itemsForPages);
  }

  private setItemForPages(
    acc: Map<Page, IDomainCollection<InterviewItem>>,
    item: InterviewItem,
    pages: IDomainCollection<Page>
  ) {
    return pages.reduce((acc, page) => {
      const items = acc.get(page) as IDomainCollection<InterviewItem>;
      acc.set(page, items.append(item));
      return acc;
    }, acc);
  }

  private getStatusForPages(
    statusForPages: Map<Page, Status>
  ): Map<Page, Status> {
    for (const [p, i] of this.itemsForPages) {
      statusForPages.set(p, this.getPageToStatus(p, i));
    }
    return statusForPages;
  }

  private getPageToStatus(
    page: Page,
    items: IDomainCollection<InterviewItem>
  ): Status {
    if (this.isPageEmpty(page, items)) return this.emptyStatus(page);
    return this.nonEmptyStatus(page, items);
  }

  private emptyStatus(page: Page): Status {
    return this.pageSet.isMandatory(page) && page.requiredItems.length > 0
      ? "insufficient"
      : "empty";
  }

  private nonEmptyStatus(
    page: Page,
    items: IDomainCollection<InterviewItem>
  ): Status {
    const fulfilled = this.getFulfilledItems(items);
    return this.itemsNeedAnswer(page, fulfilled)
      ? this.pageSet.isMandatory(page)
        ? this.requiredItemsNeedAnswer(page, fulfilled)
          ? "insufficient"
          : "incomplete"
        : "incomplete"
      : "fulfilled";
  }

  private itemsNeedAnswer(page: Page, fulfilled: Set<PageItem>) {
    return page.items.find(q => this.itemNeedsAnswer(q, fulfilled));
  }

  private requiredItemsNeedAnswer(page: Page, fulfilled: Set<PageItem>) {
    return page.requiredItems.some(i => this.itemNeedsAnswer(i, fulfilled));
  }

  private itemNeedsAnswer(q: Item, fulfilled: Set<PageItem>): unknown {
    return (
      getItemType(q).name != ItemTypes.info.name && !fulfilled.has(getItem(q))
    );
  }

  private getFulfilledItems(items: IDomainCollection<InterviewItem>) {
    const missing = items.filter(i => i.status == "missing");
    const fulfilled = items.filter(
      i =>
        i.status == "fulfilled" &&
        !missing.some(t => t.pageItem.samePrototype(i.pageItem))
    );
    return new Set(fulfilled.map(i => i.pageItem));
  }

  private isPageEmpty(page: Page, items: IDomainCollection<InterviewItem>) {
    let allValuesEmpty = true;
    let someSpecialValueEmpty =
      items.length <
      page.items.filter(i => getItemType(i).name != "info").length;
    for (const i of items.filter(i => getItemType(i).name != "info")) {
      allValuesEmpty = this.isEmptySoFar(allValuesEmpty, i);
      someSpecialValueEmpty = this.isEmptyNow(someSpecialValueEmpty, i);
    }
    return allValuesEmpty && someSpecialValueEmpty;
  }

  private isEmptySoFar(empty: boolean, i: InterviewItem): boolean {
    return empty && i.value == undefined;
  }

  private isEmptyNow(empty: boolean, i: InterviewItem): boolean {
    return empty || i.specialValue == undefined;
  }

  get status(): Status {
    let status: Status = "fulfilled";
    for (const pageStatus of this.statusForPages.values()) {
      status = this.changeStatus(status, pageStatus);
    }
    return status;
  }

  private changeStatus(status: Status, pageStatus: Status): Status {
    return this.isInsufficientSoFar(status, pageStatus)
      ? "insufficient"
      : this.isIncompleteSoFar(status, pageStatus)
      ? "incomplete"
      : status;
  }

  private isInsufficientSoFar(status: string, pageStatus: string) {
    return status == "insufficient" || pageStatus == "insufficient";
  }

  private isIncompleteSoFar(status: string, pageStatus: string) {
    return (
      status == "incomplete" ||
      pageStatus == "incomplete" ||
      pageStatus == "empty"
    );
  }

  get date(): Date | undefined {
    return this.getItemForVariable(
      this.pageSet.datevar ?? this.options.interviewDateVar ?? "VDATE"
    )?.value as Date | undefined;
  }

  get workflow(): string | undefined {
    return this.getString(this.options.workflowVar);
  }

  get included(): boolean | undefined {
    return this.getBool(this.options.inclusionVar);
  }

  get events(): IDomainCollection<string> {
    return this.items
      .filter(i => i.event)
      .map(i => i.event?.event as string)
      .sort()
      .filter((event, x, arr) => x == 0 || arr[x - 1] != event);
  }

  get pendingEvents(): IDomainCollection<string> {
    return this.items
      .filter(i => i.event && !i.event.acknowledged)
      .map(i => i.event?.event as string)
      .sort()
      .filter((event, x, arr) => x == 0 || arr[x - 1] != event);
  }

  get acknowledgedEvents(): IDomainCollection<string> {
    const pendings = this.pendingEvents;
    return this.events.filter(e => !pendings.includes(e));
  }

  private getString(v?: HideableVarDef): string | undefined {
    return this.getItem(v)?.value as string;
  }

  private getBool(v?: HideableVarDef): boolean | undefined {
    const item = this.getItem(v);
    if (typeof item == "undefined") return undefined;
    return !!item?.value;
  }

  getItem(v?: HideableVarDef): InterviewItem | undefined {
    const varName = typeof v == "string" ? v : (v?.name as string);
    return this.getItemForVariable(varName, 1);
  }

  get fillRate(): number {
    const [sum, count] = this.pageSet.items
      .filter(i => getItemType(i).name != ItemTypes.info.name)
      .map(i =>
        this.items.some(
          t => t.pageItem.isInstanceOf(getItem(i)) && t.status == "fulfilled"
        )
          ? 1
          : 0
      )
      .reduce(
        ([sum, count], i) => {
          sum += i;
          count += 1;
          return [sum, count];
        },
        [0, 0]
      );
    const rate = sum / count;
    return Number.isInteger(rate) ? rate : Number(rate.toFixed(2));
  }

  get currentPage(): Page {
    const status = this.getStatusEntries();
    return status.reduce((current: readonly [Page, Status], s) =>
      isInsufficient(current) || (!isInsufficient(s) && isIncomplete(current))
        ? current
        : s
    )[0];
  }

  private getStatusEntries() {
    return this.pageSet.pages.map(p => <const>[p, this.getStatusForPage(p)]);
  }

  pageOf(item: InterviewItem): Page | undefined {
    return this.pageSet.pages.find(p => p.items.includes(item.pageItem));
  }

  get alerts(): IDomainCollection<RuleAlert> {
    return this.items.reduce(
      (r, i) => r.append(...i.alerts.map(a => new RuleAlert(a, i, this))),
      DomainCollection<RuleAlert>()
    );
  }

  get pins(): IDomainCollection<InterviewItem | undefined> {
    return this.pageSet.pins.map(pin => this.getItemForPin(pin));
  }

  get kpis(): IDomainCollection<
    InterviewItem | [InterviewItem, InterviewItem]
  > {
    return this.pageSet.kpis.flatMap(kpi => this.getItemForKpi(kpi));
  }

  private getItemForPin(pin: Item): InterviewItem | undefined {
    return this.items.find(item =>
      hasContext(pin)
        ? item.pageItem == pin.pageItem && item.context == pin.context
        : item.pageItem == pin
    );
  }

  private getItemForKpi(
    kpi: Item
  ): IDomainCollection<InterviewItem | [InterviewItem, InterviewItem]> {
    return this.items
      .filter(item => this.isKpi(kpi, item))
      .map(item => this.getKpi(item));
  }

  private isKpi(
    kpi: Item<"prototype" | "instance">,
    item: InterviewItem
  ): unknown {
    return hasContext(kpi)
      ? item.pageItem.isInstanceOf(kpi.pageItem) && item.context == kpi.context
      : item.pageItem.isInstanceOf(kpi);
  }

  private getKpi(
    item: InterviewItem
  ): InterviewItem | [InterviewItem, InterviewItem] {
    const kpi = item.pageItem.kpi;
    if (hasPivot(kpi)) {
      const pivotItem = this.getItemForVariable(
        kpi.pivot.variableName,
        item.pageItem.instance
      ) as InterviewItem;
      return [item, pivotItem];
    }
    return item;
  }

  update(kwargs: Partial<Interview> | ZippedInterview): Interview {
    if (isZippedInterview(kwargs)) return this.zip(kwargs);
    return Domain.update(this, kwargs, [Interview, this.pageSet, this.options]);
  }

  private zip([kwargs, nkwargs]: ZippedInterview): Interview {
    const updated = this.update(kwargs);
    if (nkwargs == undefined) return updated;
    const items = updated.zipItems(nkwargs);
    return updated.update({ items });
  }

  private zipItems(nkwargs: {
    items?: readonly Partial<InterviewItem>[] | undefined;
  }) {
    return typeof nkwargs.items != "undefined"
      ? this.zipArray(this.items, nkwargs.items)
      : this.items;
  }

  private zipArray<T extends { update(k: Partial<T>): T }>(
    source: IDomainCollection<T>,
    items: readonly Partial<T>[]
  ) {
    return source
      .map((i, n) => this.zipNthElem(i, n, items))
      .append(...(items.slice(source.length) as T[]));
  }

  private zipNthElem<T extends { update(k: Partial<T>): T }>(
    e: T,
    n: number,
    elems: readonly Partial<T>[]
  ) {
    const p = elems[n];
    return p ? e.update(p) : e;
  }

  getStatusForPage(page: Page): Status {
    const status = this.statusForPages.get(page);
    return status ?? "incomplete";
  }

  getItemsForPage(page: Page): IDomainCollection<InterviewItem> {
    const items = this.itemsForPages.get(page);
    return items ?? DomainCollection();
  }

  getItemForVariable(
    varItem: PageItem | string,
    instance = 1
  ): InterviewItem | undefined {
    const itemKey = this.getItemKey(varItem, instance);
    return this.itemForVariables.get(itemKey);
  }

  getItemsForPrototype(
    prototype: PageItem<"prototype">
  ): IDomainCollection<InterviewItem> {
    const items: InterviewItem[] = [];
    for (const instance of PageItem.getInstances(prototype)) {
      const item = this.getItemForVariable(instance);
      if (item) items.push(item);
    }
    return DomainCollection(...items);
  }

  nextInstance(item: InterviewItem): InterviewItem | undefined {
    return this.getItemForVariable(item.pageItem.nextInstance());
  }

  hasNextInstance(item: InterviewItem): boolean {
    return (
      item.pageItem.hasNextInstance() && this.nextInstance(item) != undefined
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  diff(previous: this | undefined): Difference<this> {
    return {};
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isInsufficient([_, status]: readonly [Page, Status]) {
  return status == "insufficient";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isIncomplete([_, status]: readonly [Page, Status]): boolean {
  return status == "empty" || status == "incomplete";
}

export function getLastItems(
  interviews: IDomainCollection<Interview>,
  pageItems: IDomainCollection<PageItem<"prototype"> | string>
): IDomainCollection<InterviewItem | undefined> {
  return pageItems.map(p =>
    interviews.reduce(
      (item, i) =>
        i.items.find(it =>
          typeof p == "string"
            ? it.pageItem.variableName == p
            : it.pageItem == p
        ) ?? item,
      <InterviewItem | undefined>undefined
    )
  );
}
