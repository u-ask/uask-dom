import test from "tape";
import "../test-extension.js";
import { DomainCollection } from "./domaincollection.js";
import { Library, Page } from "./page.js";
import { PageItem } from "./pageitem.js";
import { ItemTypes } from "./itemtypes.js";
import { getItemType } from "./pageitem.js";
import { RequiredRule } from "./rule/unitrule.js";

test("Page construction", t => {
  const page = new Page("General");
  t.equal(page.name, "General");
  t.end();
});

test("Page translation", t => {
  const page = new Page({ en: "Side effects", fr: "Effets secondaires" });
  if (typeof page.name == "object") {
    t.equal(page.name.en, "Side effects");
    t.equal(page.name.fr, "Effets secondaires");
  } else t.fail();
  t.end();
});

test("Page has items", t => {
  const pageItem1 = new PageItem(
    "Was the participant included ?",
    "ISPATV1",
    ItemTypes.yesno
  );
  const pageItem2 = new PageItem(
    "Date of your last administration",
    "HUSDT",
    ItemTypes.date(true)
  );
  const page = new Page("General", {
    includes: DomainCollection(pageItem1, pageItem2),
  });
  t.arrayContains(page.items, [pageItem1, pageItem2]);
  t.equal(getItemType(pageItem1), ItemTypes.yesno);
  t.end();
});

test("Page update", t => {
  const pageItem1 = new PageItem(
    "Was the participant included ?",
    "ISPATV1",
    ItemTypes.yesno
  );
  const page = new Page("General", {
    includes: DomainCollection(pageItem1),
  });
  const copy = page.update({});
  t.equal(copy, page);
  const pageItem2 = new PageItem(
    "Date of your last administration",
    "HUSDT",
    ItemTypes.date(true)
  );
  const updated = page.update({ includes: page.includes.append(pageItem2) });
  t.arrayContains(updated.items, [pageItem1, pageItem2]);
  t.end();
});

test("Page fully update", t => {
  const pageItem1 = new PageItem(
    "Was the participant included ?",
    "ISPATV1",
    ItemTypes.yesno
  );
  const page = new Page("General", {
    includes: DomainCollection(pageItem1),
  });
  const page0 = page.update({ name: "Général" });
  const page1 = page.update(page0);
  t.equal(page1, page0);
  t.end();
});

test("Composample page", t => {
  const pageItem1 = new PageItem(
    "Was the participant included ?",
    "ISPATV1",
    ItemTypes.yesno
  );
  const page1 = new Page("General", {
    includes: DomainCollection(pageItem1),
  });
  const pageItem2 = new PageItem(
    "Date of your last administration",
    "HUSDT",
    ItemTypes.date(true)
  );
  const page2 = new Page("Observance", {
    includes: DomainCollection(pageItem2),
  });
  const composample: Page = new Page("Composample", {
    includes: DomainCollection(new Library(page1), new Library(page2)),
  });
  t.equal(composample.items.length, 2);
  t.end();
});

test("Composample page with context", t => {
  const type0 = ItemTypes.yesno;
  const type1 = ItemTypes.choice("one", "1", "2", "3");
  const pageItem = new PageItem(
    "Symptom ?",
    "SYM",
    ItemTypes.context([type0, type1])
  );
  const page1 = new Page("Included", { includes: DomainCollection(pageItem) });
  const page2 = new Page("Composample", {
    includes: DomainCollection(
      new Library(page1, undefined, DomainCollection({ pageItem, context: 1 }))
    ),
  });
  t.deepLooseEqual(page2.items, [{ pageItem, context: 1 }]);
  t.equal(getItemType(page1.items[0]), type0);
  t.equal(getItemType(page2.items[0]), type1);
  t.end();
});

test("Page get all items which are required", t => {
  const { page1, pageItem1, pageItem2, page2, page3 } = buildPages();
  t.arrayContains(page1.requiredItems, [pageItem1, pageItem2]);
  t.arrayContains(page2.requiredItems, [pageItem1, pageItem2]);
  t.arrayContains(page3.requiredItems, []);
  t.end();
});

test("Get page pins", t => {
  const { page1, pageItem1, pageItem2, page2, page3 } = buildPages();
  t.deepLooseEqual(page1.pins, [pageItem1, pageItem2]);
  t.deepLooseEqual(page2.pins, [pageItem1, pageItem2]);
  t.deepLooseEqual(page3.pins, []);
  t.end();
});

test("Get page kpis #184", t => {
  const { page1, pageItem1, page2, page3 } = buildPages();
  t.deepLooseEqual(page1.kpis, [pageItem1]);
  t.deepLooseEqual(page2.kpis, [pageItem1]);
  t.deepLooseEqual(page3.kpis, []);
  t.end();
});

test("Array pages #168", t => {
  const page = new Page("P", {
    includes: DomainCollection(
      new PageItem("", "A", ItemTypes.text, { array: true }),
      new PageItem("", "B", ItemTypes.text, { array: true }),
      new PageItem("", "C", ItemTypes.text, { array: true })
    ),
  });
  t.true(page.array);
  const pageEmpty = new Page("PE");
  t.false(pageEmpty.array);
  t.end();
});

function buildPages() {
  const pageItem1 = new PageItem(
    "Was the participant included ?",
    "ISPATV1",
    ItemTypes.yesno,
    { rules: DomainCollection(new RequiredRule()), pin: "pg1", kpi: "kpi1" }
  );
  const pageItem2 = new PageItem(
    "Date of your last administration",
    "HUSDT",
    ItemTypes.date(true),
    { rules: DomainCollection(new RequiredRule()), pin: "pg2" }
  );
  const pageItem3 = new PageItem("etc...", "Q3", ItemTypes.text);
  const page1 = new Page("General", {
    includes: DomainCollection(pageItem1, pageItem2),
  });
  const page2 = new Page("Composample", {
    includes: DomainCollection(new Library(page1)),
  });
  const page3 = new Page("PageSansRequired", {
    includes: DomainCollection(pageItem3),
  });
  return { page1, pageItem1, pageItem2, page2, page3 };
}
