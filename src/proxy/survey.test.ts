import test from "tape";
import {
  DomainCollection,
  getItem,
  getScopedItem,
  getTranslation,
  ItemTypes,
  Library,
  Page,
  PageItem,
  ScopedItem,
  Survey,
} from "../domain/index.js";
import {
  PageBuilder,
  PageSetBuilder,
  SurveyBuilder,
  WorkflowBuilder,
} from "../dsl/index.js";
import { exampleSurvey } from "../example.js";
import { MutableSurvey } from "./survey.js";

test("Mutable survey is of type Survey", t => {
  const mutable = new MutableSurvey(exampleSurvey);
  t.true(mutable instanceof Survey);
  t.end();
});

test("Mutable survey update", t => {
  const mutable = new MutableSurvey(exampleSurvey);
  const updated = mutable.update({ name: "P11_06" });
  t.equal(updated, mutable);
  t.equal(mutable.name, "P11_06");
  t.end();
});

test("Mutable survey update item", t => {
  const mutable = new MutableSurvey(exampleSurvey);
  const { px, ix, updatedItem, updatedRules } = buildUpdatedItem(mutable);
  const updated = mutable.updateItem(px, ix, updatedItem, updatedRules);
  t.equal(updated, mutable);
  const page = mutable.pages[px];
  const item = getItem(page.items[ix]);
  t.equal(item.type, ItemTypes.text);
  t.equal(item.section, "for test purpose");
  t.true(
    mutable.crossRules.some(r => r.pageItems.map(getScopedItem).includes(item))
  );
  t.true(mutable.pageSets.some(s => s.pages.includes(page)));
  t.true(
    mutable.workflows.some(w => w.pageSets.some(s => s.pages.includes(page)))
  );
  t.end();
});

test("Mutable survey update pageSet", t => {
  const mutable = new MutableSurvey(exampleSurvey);
  const target = mutable.value.pageSets[0];
  const updatedPageSet = target.update({
    type: { en: "Updated Visit", fr: "Visample mise à jour" },
  });
  mutable.updatePageSet(0, updatedPageSet);
  t.deepLooseEqual(mutable.pageSets[0].type, {
    en: "Updated Visit",
    fr: "Visample mise à jour",
  });
  t.equal(mutable.workflows[0].info, updatedPageSet);
  t.end();
});

test("Mutable survey update cross rule item", t => {
  const mutable = new MutableSurvey(exampleSurvey);
  const { px, ix, updatedItem, updatedRules } = buildUpdatedItem(mutable);
  mutable.updateItem(px, ix, updatedItem, updatedRules);
  const page = mutable.pages[px];
  const item = getItem(page.items[ix]);
  const [crossRule, ...others] = mutable.crossRules.filter(
    r => r.target == item
  );
  t.equal(others.length, 0);
  t.equal(crossRule.name, "computed");
  t.equal(crossRule.args.formula, "$2 / $1 / $1");
  t.true(
    crossRule.pageItems.map(getScopedItem).every(i => mutable.items.includes(i))
  );
  t.end();
});

test("Mutable survey update item implied in rule", t => {
  const mutable = new MutableSurvey(exampleSurvey);
  const target = mutable.getItemForVariable("WEIGHT") as PageItem;
  const xx = mutable.pages.map(p => p.includes.findIndex(i => i == target));
  const px = xx.findIndex(x => x > -1);
  const ix = xx[px];
  const updatedItem = target.update({ wording: "for test purpose" });
  mutable.updateItem(px, ix, updatedItem, []);
  const computedItem = mutable.getItemForVariable("BMI") as PageItem;
  const [crossRule] = mutable.crossRules.filter(r => r.target == computedItem);
  t.equal(getScopedItem(crossRule.pageItems[1]), updatedItem);
  t.end();
});

test("Mutable survey insert item", t => {
  const mutable = new MutableSurvey(exampleSurvey);
  const { px, ix, insertedItem, insertedRules } = buildInsertedItem(mutable);
  const updated = mutable.insertItem(px, ix, insertedItem, insertedRules);
  const page = mutable.pages[px];
  const item = getItem(page.items[ix]);
  t.equal(updated, mutable);
  t.equal(page.items.indexOf(item), ix);
  t.true(mutable.pages.some(p => p.includes.includes(item)));
  t.true(mutable.pageSets.some(s => s.pages.includes(page)));
  t.end();
});

test("Mutable survey insert item at position 0", t => {
  const mutable = new MutableSurvey(exampleSurvey);
  const { px, insertedItem, insertedRules } = buildInsertedItem(mutable);
  try {
    mutable.insertItem(px, 0, insertedItem, insertedRules);
    const page = mutable.pages[px];
    t.equal(page.items[0], insertedItem);
  } catch {
    t.fail();
  }
  t.end();
});

test("Mutable survey insert item at last position", t => {
  const mutable = new MutableSurvey(exampleSurvey);
  const { px, insertedItem, insertedRules } = buildInsertedItem(mutable);
  try {
    mutable.insertItem(
      px,
      mutable.pages[px].items.length,
      insertedItem,
      insertedRules
    );
    const page = mutable.pages[px];
    t.equal(page.items[page.items.length - 1], insertedItem);
  } catch {
    t.fail();
  }
  t.end();
});

test("Mutable survey insert item rules", t => {
  const mutable = new MutableSurvey(exampleSurvey);
  const { px, ix, insertedItem, insertedRules } = buildInsertedItem(mutable);
  mutable.insertItem(px, ix, insertedItem, insertedRules);
  const page = mutable.pages[px];
  const item = getItem(page.items[ix]);
  const [crossRule] = mutable.crossRules.filter(r => r.target == item);
  t.equal(crossRule.name, "activation");
  t.deepEqual(crossRule.args.values, [1]);
  t.equal(getScopedItem(crossRule.pageItems[0]).variableName, "V11");
  t.true(
    crossRule.pageItems.map(getScopedItem).every(i => mutable.items.includes(i))
  );
  t.end();
});

test("Mutable survey insert multiple items", t => {
  const mutable = new MutableSurvey(exampleSurvey);
  const px = mutable.pages.findIndex(p => p.name == "Table example");
  const items = [
    new PageItem("row3 -> col1", "V31", ItemTypes.text),
    new PageItem("row3 -> col2", "V32", ItemTypes.text),
  ];
  mutable.insertItems(px, 3, items, []);
  t.equal(
    mutable.pages[px].items.length,
    exampleSurvey.pages[px].items.length + 2
  );
  t.end();
});

test("Mutable survey update page", t => {
  const mutable = new MutableSurvey(exampleSurvey);
  const { px, updatedPage } = buildUpdatedPage(mutable);
  const updated = mutable.updatePage(px, updatedPage);
  t.equal(updated, mutable);
  const page = mutable.pages[px];
  t.equal(page?.name, "SAE");
  t.end();
});

test("Mutable survey insert page", t => {
  const mutable = new MutableSurvey(exampleSurvey);
  const { pSx, px, insertedPage } = buildInsertedPage(mutable);
  const updated = mutable.insertPage(pSx, px, insertedPage);
  const pageSet = mutable.pageSets[px];
  const page = pageSet.pages[px];
  t.equal(updated, mutable);
  t.equal(pageSet.pages.indexOf(page), px);
  t.end();
});

test("Mutable survey include library #386", t => {
  const mutable = new MutableSurvey(exampleSurvey);
  const libPage = mutable.pages.find(
    p => getTranslation(p.name, "en") == "Side effects"
  ) as Page;
  const px = mutable.pages.findIndex(
    p => getTranslation(p.name, "en") == "Symptoms"
  );
  const library = new Library(
    libPage,
    libPage.items.slice(0, 1).map(i => getItem(i)),
    DomainCollection()
  );
  mutable.insertInclude(px, 0, library);
  t.equal(mutable.pages[px].includes[0], library);
  t.end();
});

test("Mutable survey update library #386", t => {
  const mutable = new MutableSurvey(exampleSurvey);
  const libPage = mutable.pages.find(
    p => getTranslation(p.name, "en") == "Side effects"
  ) as Page;
  const px = mutable.pages.findIndex(
    p => getTranslation(p.name, "en") == "Status"
  );
  const library = new Library(
    libPage,
    libPage.items.slice(0, 1).map(i => getItem(i)),
    DomainCollection()
  );
  mutable.updateInclude(px, 4, library);
  t.equal(mutable.pages[px].includes.length, 5);
  t.equal(mutable.pages[px].includes[4], library);
  t.end();
});

test("Mutable survey exclude library #386", t => {
  const mutable = new MutableSurvey(exampleSurvey);
  const px = mutable.pages.findIndex(
    p => getTranslation(p.name, "en") == "Status"
  );
  const library = mutable.pages[px].includes[4];
  mutable.deleteInclude(px, 4);
  t.equal(mutable.pages[px].includes.length, 4);
  t.false(mutable.pages[px].includes.includes(library));
  t.end();
});

test("Mutable survey delete page in a specific pageSet #331", t => {
  const mutable = new MutableSurvey(exampleSurvey);
  const pageDeleted = mutable.pageSets[1].pages[1];
  const updated = mutable.deletePage(1, 1);
  t.ok(!updated.pageSets[1].pages.find(p => p == pageDeleted));
  t.ok(
    updated.pageSets[1].pages.length ==
      exampleSurvey.pageSets[1].pages.length - 1
  );
  t.ok(updated.pages.find(p => p == pageDeleted));
  t.end();
});

test("Mutable survey update workflow", t => {
  const mutable = new MutableSurvey(exampleSurvey);
  const { updatedWorkflow } = buildUpdatedWorkflow(mutable);
  const updated = mutable.updateWorkflow(0, updatedWorkflow);
  t.equal(updated.workflows[0], updatedWorkflow);
  t.end();
});

test("Mutable survey insert page set #249", t => {
  const mutable = new MutableSurvey(exampleSurvey);
  const insertedPageSet = buildInsertedPageSet(mutable);
  const updated = mutable.insertPageSet(insertedPageSet);
  t.ok(!!updated.pageSets.find(ps => ps == insertedPageSet));
  t.ok(!!updated.mainWorkflow.many.find(ps => ps == insertedPageSet));
  t.end();
});

test("Mutable survey insert workflow #300", t => {
  const mutable = new MutableSurvey(exampleSurvey);
  const insertedWorkflow = buildInsertedWorkflow(mutable);
  const updated = mutable.insertWorkflow(insertedWorkflow);
  t.equal(updated.workflows.last?.name, "surveycoordinator");
  t.end();
});

test("Mutable survey delete pageSet #332", t => {
  const mutable = new MutableSurvey(exampleSurvey);
  const pageSet = mutable.pageSets[2];
  const updated = mutable.deletePageSet(2);
  t.notOk(updated.pageSets.find(ps => ps == pageSet));
  t.notOk(updated.workflows[0].pageSets.find(ps => ps == pageSet));
  t.end();
});

test("Mutable survey delete workflow #333", t => {
  const mutable = new MutableSurvey(exampleSurvey);
  const workflowDeleted = mutable.workflows[1];
  const updated = mutable.deleteWorkflow(1);
  t.ok(!updated.workflows.find(w => w == workflowDeleted));
  t.ok(updated.workflows.length == exampleSurvey.workflows.length - 1);
  t.end();
});

test("Mutable survey shouldn't delete main workflow #333", t => {
  const mutable = new MutableSurvey(exampleSurvey);
  t.throws(() => mutable.deleteWorkflow(0));
  t.end();
});

test("Mutable survey delete item #330", t => {
  const mutable = new MutableSurvey(exampleSurvey);
  const targetItem = mutable.pages[3].items[1];
  const updated = mutable.deleteItem(3, 1);
  t.notOk(updated.items.find(i => i == targetItem));
  t.notOk(updated.pages[1].items.find(i => i == targetItem));
  t.notOk(
    updated.crossRules.find(
      cr =>
        !!cr.pageItems.find(
          pi =>
            (pi as ScopedItem)[0].variableName ==
            (targetItem as PageItem).variableName
        )
    )
  );
  t.end();
});

test("Mutable survey update survey options #368", t => {
  const mutable = new MutableSurvey(exampleSurvey);
  const surveyOptions = {
    languages: ["en", "fr"],
    defaultLang: "fr",
    visitDateVar: "VDATE",
    phoneVar: "__PHONE2",
    emailVar: "__EMAIL2",
    showFillRate: true,
    epro: true,
    inclusionVar: {
      name: "__INCLUDED2",
      hidden: true,
    },
    unitSuffix: "_UNIT2",
    workflowVar: "__WORKFLOW2",
    participantCodeStrategy: {
      length: 5,
      bySample: true,
    },
  };
  const updated = mutable.updateOptions(surveyOptions);
  t.deepEqual(updated.options, surveyOptions);
  t.end();
});

function buildInsertedWorkflow(mutable: MutableSurvey) {
  const b = new SurveyBuilder();
  b.options(mutable.options);
  const workflowBuilder = b
    .workflow()
    .home("Synthesis")
    .initial("Inclusion")
    .followUp("Follow Up") as WorkflowBuilder;
  const workflow = workflowBuilder.build([...mutable.pageSets]);
  return workflow.update({ name: "surveycoordinator" });
}

function buildInsertedPageSet(mutable: MutableSurvey) {
  const surveyBuilder = new SurveyBuilder();
  surveyBuilder.options(mutable.options);
  const pageSetBuilder = surveyBuilder
    .pageSet("NEWPS")
    .translate("en", "New Visit")
    .translate("fr", "Nouvelle Visample") as PageSetBuilder;
  return pageSetBuilder.build([]);
}

function buildUpdatedWorkflow(mutable: MutableSurvey) {
  const b = new SurveyBuilder();
  const workflowBuilder = b
    .workflow()
    .home("Inclusion")
    .initial("Synthesis")
    .followUp("Follow Up") as WorkflowBuilder;
  const updatedWorkflow = workflowBuilder.build([...mutable.pageSets]);
  return { updatedWorkflow };
}

function buildUpdatedItem(mutable: MutableSurvey) {
  const target = mutable.getItemForVariable("BMI") as PageItem;
  const xx = mutable.pages.map(p => p.includes.findIndex(i => i == target));
  const px = xx.findIndex(x => x > -1);
  const ix = xx[px];

  const surveyBuilder = new SurveyBuilder();
  surveyBuilder.options(mutable.options);
  const pageItemBuilder = surveyBuilder.question(
    "BMI",
    "BMI",
    ItemTypes.text,
    "for test purpose"
  );
  pageItemBuilder.computed("WEIGHT / HEIGHT / HEIGHT");

  const updatedItem = pageItemBuilder.build([]);
  const updatedRules = surveyBuilder.crossRules.map(b =>
    b.build([updatedItem, ...mutable.items])
  );

  return { px, ix, updatedItem, updatedRules };
}

function buildInsertedItem(mutable: MutableSurvey) {
  const px = mutable.pages.findIndex(p => p.name == "Table example");
  const ix = 2;
  const surveyBuilder = new SurveyBuilder();
  surveyBuilder.options(mutable.options);
  const pageItemBuilder = surveyBuilder.question(
    "One more question ?",
    "MORE",
    ItemTypes.yesno
  );
  pageItemBuilder.activateWhen("V11", 1);
  const insertedItem = pageItemBuilder.build([]);
  const insertedRules = surveyBuilder.crossRules.map(b =>
    b.build([insertedItem, ...mutable.items])
  );
  return { px, ix, insertedItem, insertedRules };
}

function buildUpdatedPage(mutable: MutableSurvey) {
  const px = mutable.pages.findIndex(p => p.name == "EL");
  const updatedPage = mutable.value.pages[px].update({ name: "SAE" });
  return { px, updatedPage };
}

function buildInsertedPage(mutable: MutableSurvey) {
  const lang = mutable.value.options.defaultLang;
  const typeName = getTranslation(
    mutable.value.pageSets[1].type,
    "__code__",
    lang
  );
  const pSx = mutable.pageSets.findIndex(
    p => getTranslation(p.type, "__code__", lang) == typeName
  );
  const px = 2;
  const surveyBuilder = new SurveyBuilder();
  surveyBuilder.options(mutable.options);
  const pageBuilder = surveyBuilder.page("NewPage") as PageBuilder;
  const insertedPage = pageBuilder.build([]);
  return { pSx, px, insertedPage };
}
