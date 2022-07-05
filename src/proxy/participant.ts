import {
  DomainCollection,
  getItem,
  getTranslation,
  IDomainCollection,
  Interview,
  InterviewItem,
  Item,
  PageSet,
  Participant,
  SurveyOptions,
} from "../domain/index.js";
import { DomainProxy, IDomainProxy } from "./proxy.js";

export interface MutableParticipant
  extends Participant,
    IDomainProxy<Participant> {}

export class MutableParticipant {
  constructor(public value: Participant) {
    return DomainProxy(this, value);
  }

  update(kwargs: Partial<Participant>): this {
    this.value = this.value.update(kwargs);
    return this;
  }

  updateItem(item: Item): this {
    return this.updateItems(DomainCollection(item));
  }

  updateItems(items: IDomainCollection<Item>): this {
    const interviews = this.interviews.update(i =>
      this.updateItemsInInterview(i, items)
    );
    return this.update({ interviews });
  }

  updatePageSet(pageSet: PageSet): this {
    return this.updatePageSets(DomainCollection(pageSet));
  }

  updatePageSets(pageSets: IDomainCollection<PageSet>): this {
    const interviews = this.interviews.update(i => {
      const pageSet = pageSets.find(p =>
        this.samePageSet(i.pageSet, p, i.options)
      );
      return pageSet ? i.update({ pageSet }) : i;
    });
    return this.update({ interviews });
  }

  insertItem(item: Item): this {
    return this.insertItems(DomainCollection(item));
  }

  insertItems(items: IDomainCollection<Item>): this {
    const interviewItems = items.map(i =>
      i instanceof InterviewItem ? i : new InterviewItem(getItem(i), undefined)
    );
    const interviews = this.interviews.update(i =>
      this.insertItemsInInterview(
        i,
        interviewItems.filter(t => this.interviewHasamplem(i, t))
      )
    );
    return this.update({ interviews });
  }

  insertPageSet(pageSet: PageSet, options: SurveyOptions): this {
    return this.insertPageSets(DomainCollection(pageSet), options);
  }

  insertPageSets(
    pageSets: IDomainCollection<PageSet>,
    options: SurveyOptions
  ): this {
    const interviews = this.interviews.append(
      ...this.insertInterviews(pageSets, options)
    );
    return this.update({ interviews });
  }

  deleteItem(item: Item): this {
    return this.deleteItems(DomainCollection(item));
  }

  deleteItems(items: IDomainCollection<Item>): this {
    const interviews = this.interviews.update(i =>
      this.deleteItemsInInterview(i, items)
    );
    return this.update({ interviews });
  }

  deletePageSet(pageSet: PageSet): this {
    return this.deletePageSets(DomainCollection(pageSet));
  }

  deletePageSets(pageSets: IDomainCollection<PageSet>): this {
    const interviews = this.interviews.delete(i =>
      pageSets.some(p => this.samePageSet(i.pageSet, p, i.options))
    );
    return this.update({ interviews });
  }

  private updateItemsInInterview(
    interview: Interview,
    items: IDomainCollection<Item>
  ): Interview {
    return interview.update({
      items: interview.items.update(t => {
        const item = items.find(i => this.sameItem(t, i));
        return item ? this.updateItemInInterviewItem(t, item) : t;
      }),
    });
  }

  private updateItemInInterviewItem(
    interviewItem: InterviewItem,
    item: Item
  ): InterviewItem {
    return item instanceof InterviewItem
      ? item
      : interviewItem.update({ pageItem: getItem(item) });
  }

  private insertItemsInInterview(
    interview: Interview,
    interviewItems: IDomainCollection<InterviewItem>
  ): Interview {
    return interview.update({
      items: interview.items.concat(interviewItems),
    });
  }

  private insertInterviews(
    pageSets: IDomainCollection<PageSet>,
    options: SurveyOptions
  ) {
    return pageSets.map(pageSet => this.insertInterview(pageSet, options));
  }

  private insertInterview(pageSet: PageSet, options: SurveyOptions): Interview {
    return new Interview(pageSet, options, {
      items: pageSet.items.map(i => new InterviewItem(getItem(i), undefined)),
    });
  }

  private deleteItemsInInterview(
    i: Interview,
    items: IDomainCollection<Item>
  ): Interview {
    return items.reduce((i, t) => this.deleteItemInInterview(i, t), i);
  }

  private deleteItemInInterview(interview: Interview, item: Item): Interview {
    return interview.update({
      items: interview.items.delete(t => this.sameItem(t, item)),
    });
  }

  private sameItem(i1: Item, i2: Item): boolean {
    return getItem(i1).variableName == getItem(i2).variableName;
  }

  private samePageSet(
    ps1: PageSet,
    ps2: PageSet,
    options: SurveyOptions
  ): boolean {
    return (
      getTranslation(ps1.type, "__code__", options.defaultLang) ==
      getTranslation(ps2.type, "__code__", options.defaultLang)
    );
  }

  private interviewHasamplem(
    interview: Interview,
    item: InterviewItem
  ): unknown {
    return (
      !interview.items.some(tt => this.sameItem(tt, item)) &&
      interview.pageSet.items.some(tt => this.sameItem(tt, item))
    );
  }
}
