import test from "tape";
import "../test-extension.js";
import { PageSet } from "./pageSet.js";
import { Page } from "./page.js";
import { DomainCollection } from "./domaincollection.js";
import { ItemTypes } from "./itemtypes.js";
import { PageItem } from "./pageitem.js";
import { RequiredRule } from "./rule/unitrule.js";

test("PageSet consruction", t => {
  const pageSet = new PageSet("Follow up");
  t.equals(pageSet.type, "Follow up");
  t.end();
});

test("PageSet with multiple languages", t => {
  const pageSet = new PageSet({ en: "Follow up", fr: "Suivi" });
  if (typeof pageSet.type == "object") {
    t.equals(pageSet.type.en, "Follow up");
    t.equals(pageSet.type.fr, "Suivi");
  } else t.fail();
  t.end();
});

test("PageSet has pages", t => {
  const page1 = new Page("SAE");
  const page2 = new Page("Fertility");
  const pageSet = new PageSet("Follow up", {
    pages: DomainCollection(page1, page2),
  });
  t.arrayContains(pageSet.pages, [page1, page2]);
  t.end();
});

test("PageSet update", t => {
  const page1 = new Page("SAE");
  const pageSet = new PageSet("Follow up", { pages: DomainCollection(page1) });
  const copy = pageSet.update({});
  t.equal(copy, pageSet);
  const page2 = new Page("Fertility");
  const updated = pageSet.update({ pages: pageSet.pages.append(page2) });
  t.arrayContains(updated.pages, [page1, page2]);
  t.end();
});

test("PageSet update", t => {
  const pageSet = new PageSet("Follow up");
  const updated0 = pageSet.update({ type: "Inclusion" });
  const updated1 = pageSet.update(updated0);
  t.equal(updated1, updated0);
  t.end();
});

test("PageSet with datevar", t => {
  const pageSet = new PageSet("Follow up", { datevar: "PSDATE" });
  t.equal(pageSet.datevar, "PSDATE");
  t.end();
});

test("PageSet get all mandatory pages", t => {
  const { pageSet, page1, page3 } = buildPageSet();
  t.arrayContains(pageSet.mandatoryPages, [page1, page3]);
  t.end();
});

test("PageSet return if page is mandatory", t => {
  const { pageSet, page1, page2, page3 } = buildPageSet();
  t.true(pageSet.isMandatory(page1));
  t.false(pageSet.isMandatory(page2));
  t.true(pageSet.isMandatory(page3));
  t.end();
});

test("Get pageSet pins", t => {
  const { pageSet } = buildPageSet();
  t.deepLooseEqual(pageSet.pins, [
    pageSet.pages[0].items[0],
    pageSet.pages[2].items[0],
  ]);
  t.end();
});

test("Get pageSet kpis #184", t => {
  const { pageSet } = buildPageSet();
  t.deepLooseEqual(pageSet.kpis, [
    pageSet.pages[0].items[0],
    pageSet.pages[2].items[0],
  ]);
  t.end();
});

test("Get pages for item", t => {
  const { pageSet, page1, page2 } = buildPageSet();
  t.true(pageSet.hasamplem(page1.items[1]));
  t.end();
});

test("Get pages for item", t => {
  const { pageSet, page1, page2 } = buildPageSet();
  const pages = pageSet.getPagesForItem(page1.items[1]);
  t.deepLooseEqual(pages, [page1, page2]);
  t.end();
});

function buildPageSet() {
  const pageItem1 = new PageItem("Q1...", "Q1", ItemTypes.text, {
    rules: DomainCollection(new RequiredRule()),
    pin: "pg1",
    kpi: "kpi1",
  });
  const pageItem2 = new PageItem("Q2...", "Q2", ItemTypes.real);
  const pageItem3 = new PageItem("Q3...", "Q3", ItemTypes.yesno, {
    rules: DomainCollection(new RequiredRule()),
    pin: "pg3",
    kpi: "kpi3",
  });
  const page1 = new Page("SAE", {
    includes: DomainCollection(pageItem1, pageItem2),
  });
  const page2 = new Page("Fertility", {
    includes: DomainCollection(pageItem2),
  });
  const page3 = new Page("Fertility", {
    includes: DomainCollection(pageItem3),
  });
  const pageSet = new PageSet("Follow up", {
    pages: DomainCollection(page1, page2, page3),
    mandatoryPages: DomainCollection(page1, page3),
  });
  return { pageSet, page1, page2, page3 };
}
