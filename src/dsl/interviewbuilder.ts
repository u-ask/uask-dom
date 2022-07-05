import {
  Interview,
  PageItem,
  InterviewItem,
  DomainCollection,
  IDomainCollection,
  Survey,
  PageSet,
  Item,
  getItem,
  Scope,
  execute,
  getItemContext,
  HasValue,
  hasContext,
  ItemWithContext,
} from "../domain/index.js";
import { merge } from "../domain/domain.js";
import { DNode } from "./abstracttree.js";
import { InterviewItemBuilder } from "./interviewitembuilder.js";

export class InterviewBuilder {
  interviewItems: (InterviewItem | InterviewItemBuilder)[] = [];
  pageSet: PageSet;
  nonce = 0;
  private interview: Interview | undefined;
  private lastInput = new Date();

  constructor(survey: Survey, pageSet: PageSet);
  constructor(survey: Survey, interview: Interview);
  constructor(private survey: Survey, i: PageSet | Interview) {
    if (i instanceof PageSet) this.pageSet = i;
    else {
      this.interview = i;
      this.pageSet = i.pageSet;
    }
  }

  init(nonce: number, lastInput: Date): InterviewBuilder {
    this.nonce = nonce;
    this.lastInput = lastInput;
    return this;
  }

  item(item: InterviewItem): InterviewBuilder;
  item(item: Item | (HasValue & { pageItem: Item })): InterviewItemBuilder;
  item(item: string, instance?: number): InterviewItemBuilder;
  item(
    item: Item | string | (HasValue & { pageItem: Item }),
    instance?: number
  ): InterviewItemBuilder | InterviewBuilder {
    if (item instanceof InterviewItem) {
      this.interviewItems.push(item);
      return this;
    }
    const itemBuilder = this.getItemBuilder(item, instance);
    this.addInterviewItem(itemBuilder);
    return itemBuilder;
  }

  private addInterviewItem(itemBuilder: InterviewItemBuilder) {
    const ix = this.interviewItems.findIndex(
      i =>
        i instanceof InterviewItemBuilder &&
        i.variableName == itemBuilder.variableName &&
        i.instance == itemBuilder.instance
    );
    if (ix == -1) this.interviewItems.push(itemBuilder);
    else this.interviewItems[ix] = itemBuilder;
  }

  private getItemBuilder(
    x: Item | string | (HasValue & { pageItem: Item }),
    instance?: number
  ): InterviewItemBuilder {
    const { context, pageItem } = this.pageItem(x, instance);
    const item = this.interview?.getItemForVariable(pageItem);
    const itemBuilder = new InterviewItemBuilder(
      this.survey,
      item ?? pageItem,
      this
    ).context(context);
    if (typeof x == "object") {
      this.make(x, itemBuilder);
    }
    return itemBuilder;
  }

  private make(x: Item | HasValue, itemBuilder: InterviewItemBuilder) {
    if ("value" in x) itemBuilder.value(x.value);
    if ("unit" in x) itemBuilder.unit(x.unit);
    if ("specialValue" in x) itemBuilder.specialValue(x.specialValue);
    if ("messages" in x && x.messages) itemBuilder.messages(x.messages);
    if ("context" in x && x.context) itemBuilder.context(x.context);
  }

  private pageItem(x: string | Item | { pageItem: Item }, instance?: number) {
    if (x instanceof PageItem) return { context: 0, pageItem: x };
    if (typeof x == "string") return this.getPageItemForVariable(x, instance);
    return hasContext(x.pageItem)
      ? x.pageItem
      : { context: 0, pageItem: x.pageItem };
  }

  items(items: DNode<InterviewItem>[]): this {
    for (const item of items) {
      const { context, pageItem } = this.getPageItemForVariable(
        item.variableName,
        item.instance
      );
      const itemBuilder = new InterviewItemBuilder(
        this.survey,
        pageItem,
        this
      ).context(context);
      this.make(item, itemBuilder);
      this.interviewItems.push(itemBuilder);
    }
    return this;
  }

  private getPageItemForVariable(
    variableName: string,
    instance?: number
  ): ItemWithContext {
    const item = this.pageSet.getItemForVariable(variableName);
    if (!item) throw `unknown variable ${variableName}`;
    const pageItem = PageItem.getInstance(getItem(item), instance ?? 1);
    return { context: hasContext(item) ? item.context : 0, pageItem };
  }

  build(outer: Interview[]): Interview {
    const items = this.interviewItems.map(i =>
      i instanceof InterviewItem ? i : i.build()
    );
    if (typeof this.interview == "undefined" && !this.nonce)
      this.interview = this.initializeNew(items, outer);
    else if (typeof this.interview == "undefined")
      this.interview = this.rebuildExisting(items);
    else this.interview = this.updateExisting(items, outer);
    return this.interview;
  }

  private initializeNew(items: InterviewItem[], outer: Interview[]) {
    const initialized = this.initialize(items, outer);
    return new Interview(this.pageSet, this.survey.options, {
      items: DomainCollection(...initialized),
      lastInput: this.lastInput,
    });
  }

  private rebuildExisting(items: InterviewItem[]): Interview {
    return new Interview(this.pageSet, this.survey.options, {
      items: DomainCollection(...items),
      nonce: this.nonce,
      lastInput: this.lastInput,
    });
  }

  private updateExisting(
    items: InterviewItem[],
    outer: Interview[]
  ): Interview {
    const synchronized = this.synchronize(items, outer);
    const updated = InterviewBuilder.update(
      this.interview as Interview,
      DomainCollection(...synchronized),
      this.lastInput
    );
    return updated.nonce == 0 && this.nonce
      ? updated.update({ nonce: this.nonce })
      : updated;
  }

  private initialize(items: InterviewItem[], outer: Interview[]) {
    const uninitialized = this.pageSet.items.map(
      i =>
        new InterviewItem(getItem(i), undefined, {
          context: getItemContext(i),
        })
    );
    const scope = this.getScope(uninitialized, items, outer);
    return execute(this.survey.rules, scope, ["initialization", "always"]).items;
  }

  private synchronize(items: InterviewItem[], outer: Interview[]) {
    const initialized = (this.interview as Interview).items;
    const scope = this.getScope(initialized, items, outer);
    return execute(this.survey.rules, scope, ["always"]).items;
  }

  private getScope(
    initialized: IDomainCollection<InterviewItem>,
    items: InterviewItem[],
    outer: Interview[]
  ) {
    const outerScope = { lastInput: this.lastInput, interviews: outer };
    const localScope = { items: initialized };
    return Scope.create(outerScope, localScope).with(items);
  }

  static update(
    current: Interview,
    items: IDomainCollection<InterviewItem>,
    lastInput: Date
  ): Interview {
    const mergedItems = merge(current.items, items)
      .on((a1, a2) => a1.pageItem == a2.pageItem)
      .insert(m =>
        m.map(a => new InterviewItem(a.pageItem, a.value, { ...a }))
      );
    return mergedItems == current.items
      ? current
      : current.update({
          items: mergedItems,
          lastInput,
        });
  }
}
