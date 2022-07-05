import {
  CrossItemRule,
  DomainCollection,
  getItem,
  getScope,
  getScopedItem,
  IDomainCollection,
  Include,
  Item,
  ItemWithContext,
  Library,
  Page,
  PageItem,
  PageSet,
  RuleName,
  Rules,
  ScopedItem,
  Survey,
  SurveyOptions,
  Workflow,
} from "../domain/index.js";
import { DomainProxy, IDomainProxy } from "./proxy.js";

export interface MutableSurvey extends Survey, IDomainProxy<Survey> {}

export class MutableSurvey {
  constructor(public value: Survey) {
    return DomainProxy(this, value);
  }

  update(kwargs: Partial<Survey>): this {
    this.value = this.value.update(kwargs);
    return this;
  }

  updateItem(
    pageIndex: number,
    index: number,
    item: PageItem,
    rules: CrossItemRule[]
  ): this {
    const page = this.value.pages[pageIndex];
    const targetItem = getItem(page.items[index]);
    const updatedRules = updateItemInCrossRules(
      DomainCollection(...rules),
      targetItem,
      item
    );
    const { targetPage, updatedPage, crossRules } = updateItemInSurvey(
      this.value,
      targetItem,
      item,
      updatedRules
    );
    const { pageSets, pages, workflows } = updatePageInSurvey(
      this.value,
      targetPage,
      updatedPage
    );
    return this.update({ pageSets, pages, crossRules, workflows });
  }

  deleteItem(pageIndex: number, index: number): this {
    const page = this.pages[pageIndex];
    const targetItem = getItem(page.items[index]);
    const { targetPage, updatedPage, crossRules } = deleteItemInSurvey(
      this.value,
      targetItem
    );
    const { pageSets, pages, workflows } = updatePageInSurvey(
      this.value,
      targetPage,
      updatedPage
    );
    return this.update({ pageSets, pages, crossRules, workflows });
  }

  insertItem(
    pageIndex: number,
    index: number,
    item: PageItem,
    rules: CrossItemRule[]
  ): this {
    return this.insertItems(pageIndex, index, [item], rules);
  }

  insertItems(
    pageIndex: number,
    index: number,
    items: PageItem[],
    rules: CrossItemRule[]
  ): this {
    const page = this.value.pages[pageIndex];
    const { targetPage, updatedPage, crossRules } = insertItemInSurvey(
      this.value,
      page,
      index,
      items,
      DomainCollection(...rules)
    );
    const { pageSets, pages, workflows } = updatePageInSurvey(
      this.value,
      targetPage,
      updatedPage
    );
    return this.update({ pageSets, pages, crossRules, workflows });
  }

  updatePage(pageIndex: number, page: Page): this {
    const targetPage = this.value.pages[pageIndex];
    const { pageSets, pages, workflows } = updatePageInSurvey(
      this.value,
      targetPage,
      page
    );
    return this.update({ pageSets, pages, workflows });
  }

  insertPage(pageSetIndex: number, index: number, page: Page): this {
    const pages = insertPageInPages(this.value, page);
    const pageSet = this.value.pageSets[pageSetIndex];
    const { pageSets, workflows } = insertPageSetInSurvey(
      this.value,
      pageSet,
      index,
      page
    );
    return this.update({ pages, pageSets, workflows });
  }

  deletePage(pageSetIndex: number, index: number): this {
    const targetPageSet = this.value.pageSets[pageSetIndex];
    const targetPage = targetPageSet.pages[index];
    const { pageSets, workflows } = deletePageInOnePageSet(
      this.value,
      targetPageSet,
      targetPage
    );
    return this.update({ pageSets, workflows });
  }

  updateInclude(pageIndex: number, index: number, include: Include): this {
    const targetPage = this.value.pages[pageIndex];
    const targetInclude = targetPage.includes[index];
    const updatedPage = updateIncludeInPage(targetPage, targetInclude, include);
    const { pageSets, pages, workflows } = updatePageInSurvey(
      this.value,
      targetPage,
      updatedPage
    );
    return this.update({ pageSets, pages, workflows });
  }

  insertInclude(pageIndex: number, index: number, include: Include): this {
    const targetPage = this.value.pages[pageIndex];
    const { updatedPage } = insertIncludeInPage(targetPage, index, include);
    const { pageSets, pages, workflows } = updatePageInSurvey(
      this.value,
      targetPage,
      updatedPage
    );
    return this.update({ pageSets, pages, workflows });
  }

  deleteInclude(pageIndex: number, index: number): this {
    const targetPage = this.value.pages[pageIndex];
    const targetInclude = targetPage.includes[index];
    const updatedPage = deleteIncludeInPage(targetPage, targetInclude);
    const { pageSets, pages, workflows } = updatePageInSurvey(
      this.value,
      targetPage,
      updatedPage
    );
    return this.update({ pageSets, pages, workflows });
  }

  updatePageSet(pageSetIndex: number, pageSet: PageSet): this {
    const targetPageSet = this.value.pageSets[pageSetIndex];
    const { pageSets, workflows } = updatePageSetInSurvey(
      this.value,
      targetPageSet,
      pageSet
    );
    return this.update({ pageSets, workflows });
  }

  insertPageSet(pageSet: PageSet): this {
    const { pageSets, workflows } = addPageSetInSurvey(this.value, pageSet);
    return this.update({ pageSets, workflows });
  }

  deletePageSet(pageSetIndex: number): this {
    const targetPageSet = this.value.pageSets[pageSetIndex];
    const { pageSets, workflows } = removePageSetInSurvey(
      this.value,
      targetPageSet
    );
    return this.update({ pageSets, workflows });
  }

  updateWorkflow(workflowIndex: number, workflow: Workflow): this {
    const targetWorkflow = this.value.workflows[workflowIndex];
    const { workflows } = updateWorkflowInSurvey(
      this.value,
      targetWorkflow,
      workflow
    );
    return this.update({ workflows });
  }

  insertWorkflow(workflow: Workflow): this {
    const { workflows } = insertWorkflowInSurvey(this.value, workflow);
    return this.update({ workflows });
  }

  deleteWorkflow(workflowIndex: number): this {
    const targetWorkflow = this.value.workflows[workflowIndex];
    if (targetWorkflow.name == this.value.mainWorkflow.name)
      throw "Main workflow can't be deleted.";
    const { workflows } = deleteWorkflowInSurvey(this.value, targetWorkflow);
    return this.update({ workflows });
  }

  updateOptions(surveyOptions: SurveyOptions): this {
    return this.update({ options: surveyOptions });
  }
}

function insertWorkflowInSurvey(survey: Survey, workflow: Workflow) {
  const workflows = survey.workflows.concat([workflow]);
  return { workflows };
}

function updateWorkflowInSurvey(
  survey: Survey,
  targetWorkflow: Workflow,
  updatedWorkflow: Workflow
) {
  const workflows = survey.workflows.update(w => {
    return w == targetWorkflow ? updatedWorkflow : w;
  });
  return { workflows };
}

function deleteWorkflowInSurvey(survey: Survey, targetWorkflow: Workflow) {
  return { workflows: survey.workflows.delete(w => w == targetWorkflow) };
}

function updatePageSetInSurvey(
  survey: Survey,
  targetPageSet: PageSet,
  updatedPageSet: PageSet
) {
  const pageSets = survey.pageSets.update(ps => {
    if (ps == targetPageSet) return updatedPageSet;
    else return ps;
  });
  const workflows = updatePageSetsInWorkflows(
    survey.workflows,
    survey.pageSets,
    pageSets
  );
  return { pageSets, workflows };
}

function removePageSetInSurvey(survey: Survey, targetPageSet: PageSet) {
  const pageSets = removePageSetInPageSets(survey.pageSets, targetPageSet);
  const workflows = removePageSetInWorkflows(survey.workflows, targetPageSet);
  return { pageSets, workflows };
}

function addPageSetInSurvey(survey: Survey, insertedPageSet: PageSet) {
  const pageSets = survey.pageSets.concat([insertedPageSet]);
  const many = survey.mainWorkflow.many.concat([insertedPageSet]);
  const updatedMainWorkflow = survey.mainWorkflow.update({ many });
  const workflows = survey.workflows.map(w =>
    w == survey.mainWorkflow ? updatedMainWorkflow : w
  );
  return { pageSets, workflows };
}

function insertItemInSurvey(
  survey: Survey,
  page: Page,
  index: number,
  insertedItems: PageItem[],
  insertedRules: IDomainCollection<CrossItemRule>
) {
  const { targetPage, updatedPage } = insertItemInPage(
    page,
    index,
    insertedItems
  );
  const crossRules = mergeCrossRules(
    survey.crossRules,
    insertedItems,
    insertedRules
  );
  return { targetPage, updatedPage, crossRules };
}

function insertItemInPage(
  page: Page,
  index: number,
  insertedItems: PageItem[]
): { targetPage: Page; updatedPage: Page } {
  const { includeAfter, includeAt } = getIncludeIndices(page, index);
  if (includeAfter < includeAt) {
    return includeItemInPage(page, includeAt, insertedItems);
  }
  const { nestedPage, nestedIndex } = getNestedIndices(page, index, includeAt);
  return insertItemInPage(nestedPage, nestedIndex, insertedItems);
}

function getIncludeIndices(page: Page, index: number) {
  const includeAt =
    index == page.items.length
      ? page.items.length
      : getIncludeForItem(page, page.items[index]);
  const includeAfter =
    index == 0 ? -1 : getIncludeForItem(page, page.items[index - 1]);
  return { includeAfter, includeAt };
}

function includeItemInPage(page: Page, includeAt: number, items: PageItem[]) {
  const targetPage = page;
  const updatedPage = page.update({
    includes: DomainCollection(
      ...page.includes.slice(0, includeAt),
      ...items,
      ...page.includes.slice(includeAt)
    ),
  });
  return { targetPage, updatedPage };
}

function insertIncludeInPage(page: Page, includeAt: number, include: Include) {
  const targetPage = page;
  const updatedPage = page.update({
    includes: DomainCollection(
      ...page.includes.slice(0, includeAt),
      include,
      ...page.includes.slice(includeAt)
    ),
  });
  return { targetPage, updatedPage };
}

function getNestedIndices(page: Page, index: number, includeAt: number) {
  const nestedPage = (page.includes[includeAt] as Library).page;
  const nestedIndex = nestedPage.items.findIndex(
    i => getItem(i) == getItem(page.items[index])
  );
  return { nestedPage, nestedIndex };
}

function getIncludeForItem(page: Page, item: Item) {
  return page.includes.findIndex(i =>
    i instanceof PageItem ? i == getItem(item) : i.items.includes(item)
  );
}

function updateItemInSurvey(
  survey: Survey,
  targetItem: PageItem,
  updatedItem: PageItem,
  updatedRules: IDomainCollection<CrossItemRule>
) {
  const targetPage = survey.pages.find(p =>
    p.includes.includes(targetItem)
  ) as Page;
  const updatedPage = updateItemInPage(targetPage, targetItem, updatedItem);
  const crossRules = updateItemInCrossRules(
    mergeCrossRules(survey.crossRules, [targetItem], updatedRules),
    targetItem,
    updatedItem
  );
  return { targetPage, updatedPage, crossRules };
}

function deleteItemInSurvey(survey: Survey, targetItem: PageItem) {
  const targetPage = survey.pages.find(p =>
    p.includes.includes(targetItem)
  ) as Page;
  const updatedPage = excludeItemInPage(targetPage, targetItem);
  const crossRules = deleteItemInCrossRules(survey.crossRules, targetItem);
  return { targetPage, updatedPage, crossRules };
}

function excludeItemInPage(page: Page, targetItem: PageItem) {
  return page.update({
    includes: page.includes.delete(pi => pi == targetItem),
  });
}

function deleteIncludeInPage(page: Page, targetInclude: Include) {
  return page.update({
    includes: page.includes.delete(pi => pi == targetInclude),
  });
}

function mergeCrossRules(
  crossRules: IDomainCollection<CrossItemRule>,
  targetItems: PageItem[],
  updatedRules: IDomainCollection<CrossItemRule>
): IDomainCollection<CrossItemRule> {
  return crossRules
    .delete(r => targetItems.includes(r.target))
    .append(...updatedRules);
}

function updatePageInSurvey(
  survey: Survey,
  targetPage: Page,
  updatedPage: Page
) {
  const pages = updatePageInPages(survey.pages, targetPage, updatedPage);
  const pageSets = updatePagesInPageSets(survey.pageSets, survey.pages, pages);
  const workflows = updatePageSetsInWorkflows(
    survey.workflows,
    survey.pageSets,
    pageSets
  );
  return { pageSets, pages, workflows };
}

function updatePagesInPageSets(
  pageSets: IDomainCollection<PageSet>,
  targetPages: IDomainCollection<Page>,
  updatedPages: IDomainCollection<Page>
) {
  return pageSets.update(s =>
    updatePagesInPageSet(s, targetPages, updatedPages)
  );
}

function updatePagesInPageSet(
  pageSet: PageSet,
  targetPages: IDomainCollection<Page>,
  updatedPages: IDomainCollection<Page>
): PageSet {
  return pageSet.update({
    pages: pageSet.pages.update(p => updatedPages[targetPages.indexOf(p)]),
  });
}

function updateItemInPage(
  page: Page,
  targetItem: PageItem,
  updatedItem: PageItem
) {
  return page.update({
    includes: page.includes.update(i => (i == targetItem ? updatedItem : i)),
  });
}

function updateIncludeInPage(
  page: Page,
  targetInclude: Include,
  updatedInclude: Include
) {
  return page.update({
    includes: page.includes.update(i =>
      i == targetInclude ? updatedInclude : i
    ),
  });
}

function updatePageInPages(
  pages: IDomainCollection<Page>,
  targetPage: Page,
  updatedPage: Page
) {
  return pages.update(p => {
    if (p == targetPage) return updatedPage;
    return p.update({
      includes: p.includes.update(i =>
        i instanceof Library && i.page == targetPage
          ? updatePageInLibrary(i, targetPage, updatedPage)
          : i
      ),
    });
  });
}

function updatePageInLibrary(
  library: Library,
  targetPage: Page,
  updatedPage: Page
): Library {
  const pageItems =
    library.items.length == library.page.items.length
      ? updatedPage.items.map(getItem)
      : updatedPage.items
          .map(i => library.pageItems?.find(t => t == getItem(i)))
          .filter((i): i is PageItem => typeof i != "undefined");
  const contexts =
    targetPage.items.length == updatedPage.items.length
      ? updateContextInLibrary(library, targetPage, updatedPage)
      : updatedPage.items
          .map(i => library.contexts?.find(c => c.pageItem == getItem(i)))
          .filter((c): c is ItemWithContext => typeof c != "undefined");
  return new Library(updatedPage, pageItems, contexts);
}

function updateContextInLibrary(
  library: Library,
  targetPage: Page,
  updatedPage: Page
) {
  return updatedPage.items
    .map((i, x) => {
      const ctx = library.contexts?.find(
        c => c.pageItem == getItem(targetPage.items[x])
      );
      return ctx ? { pageItem: i, context: ctx.context } : undefined;
    })
    .filter((c): c is ItemWithContext => typeof c != "undefined");
}

function updateItemInCrossRules(
  crossRules: IDomainCollection<CrossItemRule>,
  targetItem: PageItem,
  updatedItem: PageItem
) {
  return crossRules.update(r =>
    isamplemInRule(r, targetItem)
      ? updateItemInRule(r, targetItem, updatedItem)
      : r
  );
}

function deleteItemInCrossRules(
  crossRules: IDomainCollection<CrossItemRule>,
  targetItem: PageItem
) {
  return crossRules.delete(cr =>
    cr.pageItems.some(pi => getScopedItem(pi) == targetItem)
  );
}

function isamplemInRule(rule: CrossItemRule, targetItem: PageItem) {
  return rule.pageItems.map(getScopedItem).includes(targetItem);
}

function updateItemInRule(
  rule: CrossItemRule,
  targetItem: PageItem,
  updatedItem: PageItem
): CrossItemRule {
  return new CrossItemRule(
    rule.pageItems.update(i => updateItemInScope(i, targetItem, updatedItem)),
    Rules.create({ name: rule.name as RuleName, ...rule.args }),
    rule.when
  );
}

function updateItemInScope(
  item: PageItem | ScopedItem,
  targetItem: PageItem,
  updatedItem: PageItem
) {
  return item == targetItem
    ? updatedItem
    : getScopedItem(item) == targetItem
    ? <const>[updatedItem, getScope(item)]
    : item;
}

function updatePageSetsInWorkflows(
  workflows: IDomainCollection<Workflow>,
  targetPageSets: IDomainCollection<PageSet>,
  updatedPageSets: IDomainCollection<PageSet>
) {
  return workflows.update(w =>
    updatePageSetsInWorkflow(w, targetPageSets, updatedPageSets)
  );
}

function removePageSetInWorkflows(
  workflows: IDomainCollection<Workflow>,
  targetPageSet: PageSet
) {
  return workflows.update(w => removePageSetInWorkflow(w, targetPageSet));
}

function removePageSetInWorkflow(w: Workflow, targetPageSet: PageSet) {
  const info =
    w.info && w.info == targetPageSet ? { info: undefined } : { info: w.info };
  const many = removePageSetInPageSets(w.many, targetPageSet);
  const single = removePageSetInPageSets(w.single, targetPageSet);
  const sequence = removePageSetInPageSets(w.sequence, targetPageSet);
  const stop = removePageSetInPageSets(w.stop, targetPageSet);
  return w.update({
    ...info,
    many,
    single,
    sequence,
    stop,
  });
}

function removePageSetInPageSets(
  pageSets: IDomainCollection<PageSet>,
  targetPageSet: PageSet
) {
  return pageSets.reduce(
    (acc, ps) => (ps != targetPageSet ? acc.concat(ps) : acc),
    DomainCollection<PageSet>()
  );
}

function updatePageSetsInWorkflow(
  w: Workflow,
  targetPageSets: IDomainCollection<PageSet>,
  updatedPageSets: IDomainCollection<PageSet>
): Workflow {
  const info = w.info
    ? { info: updatePageSet(w.info, targetPageSets, updatedPageSets) }
    : {};
  const many = updatePageSetInPageSets(w.many, targetPageSets, updatedPageSets);
  const one = updatePageSetInPageSets(
    w.single,
    targetPageSets,
    updatedPageSets
  );
  const startsWith = updatePageSetInPageSets(
    w.sequence,
    targetPageSets,
    updatedPageSets
  );
  const endsWith = updatePageSetInPageSets(
    w.stop,
    targetPageSets,
    updatedPageSets
  );
  return w.update({
    ...info,
    many,
    single: one,
    sequence: startsWith,
    stop: endsWith,
  });
}

function updatePageSetInPageSets(
  pageSets: IDomainCollection<PageSet>,
  targetPageSets: IDomainCollection<PageSet>,
  updatedPageSets: IDomainCollection<PageSet>
): IDomainCollection<PageSet> {
  return pageSets.map(s => updatePageSet(s, targetPageSets, updatedPageSets));
}

function updatePageSet(
  pageSet: PageSet,
  targetPageSets: IDomainCollection<PageSet>,
  updatedPageSets: IDomainCollection<PageSet>
): PageSet {
  return updatedPageSets[targetPageSets.indexOf(pageSet)];
}

function insertPageSetInSurvey(
  survey: Survey,
  targetPageSet: PageSet,
  index: number,
  page: Page
) {
  const updatedPageSet = insertPageInPageSet(targetPageSet, index, page);
  const pageSets = survey.pageSets.update(s =>
    s == targetPageSet ? updatedPageSet : s
  );
  const workflows = updatePageSetsInWorkflows(
    survey.workflows,
    survey.pageSets,
    pageSets
  );
  return { pageSets, workflows };
}

function insertPageInPages(survey: Survey, page: Page) {
  return survey.pages.append(page);
}

function insertPageInPageSet(
  targetPageSet: PageSet,
  index: number,
  page: Page
) {
  return targetPageSet.update({
    pages: DomainCollection(
      ...targetPageSet.pages.slice(0, index),
      page,
      ...targetPageSet.pages.slice(index)
    ),
  });
}

function deletePageInOnePageSet(
  survey: Survey,
  targetPageSet: PageSet,
  targetPage: Page
) {
  const pageSet = deletePageInPageSet(targetPageSet, targetPage);
  const { pageSets, workflows } = updatePageSetInSurvey(
    survey,
    targetPageSet,
    pageSet
  );
  return { pageSets, workflows };
}

function deletePageInPageSet(targetPageSet: PageSet, targetPage: Page) {
  return targetPageSet.update({
    pages: targetPageSet.pages.delete(page => page == targetPage),
  });
}
