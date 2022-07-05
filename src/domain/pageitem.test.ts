import test from "tape";
import {
  PageItem,
  isamplem,
  getItem,
  getItemWording,
  hasMemento,
  getItemContext,
  getItemMemento,
} from "./pageitem.js";
import { ItemTypes } from "./itemtypes.js";
import { DomainCollection } from "./domaincollection.js";
import {
  ConstantRule,
  InRangeRule,
  RequiredRule,
  UnitRule,
} from "./rule/unitrule.js";
import { getItemType } from "./pageitem.js";

test("Page item construction", t => {
  const item = new PageItem(
    "Was the participant included?",
    "ISPATV1",
    ItemTypes.text
  );
  t.equal(item.wording, "Was the participant included?");
  t.equal(item.variableName, "ISPATV1");
  t.deepEqual(item.type, ItemTypes.text);
  t.end();
});

test("Page item update", t => {
  const item = new PageItem(
    "Was the participant included?",
    "ISPATV1",
    ItemTypes.text
  );
  const copy = item.update({});
  t.equal(copy, item);
  const updated = item.update({ variableName: "ISPAT" });
  t.equal(updated.variableName, "ISPAT");
  t.end();
});

test("Page item fully update", t => {
  const item = new PageItem(
    "Was the participant included?",
    "ISPATV1",
    ItemTypes.text
  );
  const updated0 = item.update({ variableName: "ISPAT" });
  const updated1 = item.update(updated0);
  t.equal(updated1, updated0);
  t.end();
});

test("Page item with rule", t => {
  const item = new PageItem("test item", "vv", ItemTypes.integer, {
    rules: DomainCollection<UnitRule>(
      new RequiredRule(),
      new InRangeRule(1, 4)
    ),
  });
  t.equal(item.rules.length, 2);
  t.end();
});

test("Page item with section", t => {
  const item = new PageItem("test item", "vv", ItemTypes.integer, {
    section: "section",
  });
  t.equal(item.section, "section");
  t.end();
});

test("Page item with units", t => {
  const item = new PageItem("DLCO", "DLCO", ItemTypes.real, {
    units: { values: ["ml", "mmHg", "mn"], isExtendable: false },
  });
  t.deepLooseEqual(item.units, {
    values: ["ml", "mmHg", "mn"],
    isExtendable: false,
  });
  t.end();
});

test("Page item win pin", t => {
  const item = new PageItem("Say hello", "HI", ItemTypes.text, {
    pin: "Hello",
  });
  t.deepEqual(item.pin, "Hello");
  t.end();
});

test("Page item with kpi #184", t => {
  const item = new PageItem("New PI", "PI", ItemTypes.integer, {
    kpi: "PI KPI",
  });
  t.deepEqual(item.kpi, "PI KPI");
  t.end();
});

test("Page item with dynamic kpi #319", t => {
  const pivot = new PageItem("Mod", "MOD", ItemTypes.yesno);
  const item = new PageItem("New PI", "PI", ItemTypes.integer, {
    kpi: { title: "PI KPI", pivot },
  });
  t.deepEqual(item.kpi, { title: "PI KPI", pivot });
  t.end();
});

test("Get item", t => {
  const pageItem = new PageItem("W", "V", ItemTypes.yesno);
  t.true(isamplem(pageItem));
  t.equal(getItem(pageItem), pageItem);
  t.end();
});

test("Get item with context", t => {
  const pageItem = new PageItem(
    "W",
    "V",
    ItemTypes.context([ItemTypes.yesno, ItemTypes.info])
  );
  t.true(isamplem(pageItem));
  t.equal(getItem({ pageItem, context: 0 }), pageItem);
  t.equal(getItem({ pageItem, context: 1 }), pageItem);
  t.end();
});

test("Get item type", t => {
  const pageItem = new PageItem("W", "V", ItemTypes.yesno);
  t.equal(getItemType(pageItem), ItemTypes.yesno);
  t.equal(getItemType({ pageItem, context: 0 }), ItemTypes.yesno);
  t.end();
});

test("Get item type with context", t => {
  const type = ItemTypes.context([ItemTypes.yesno, ItemTypes.info]);
  t.equal(getItemType({ type }), ItemTypes.yesno);
  t.equal(getItemType({ type, context: 0 }), ItemTypes.yesno);
  t.equal(getItemType({ type, context: 1 }), ItemTypes.info);
  const pageItem = new PageItem("W", "V", type);
  t.equal(getItemType(pageItem), ItemTypes.yesno);
  t.equal(getItemType({ pageItem, context: 0 }), ItemTypes.yesno);
  t.equal(getItemType({ pageItem, context: 1 }), ItemTypes.info);
  t.end();
});

test("Get item wording with context", t => {
  const wording = ["W1", "W2"];
  t.equal(getItemWording({ wording }), "W1");
  t.equal(getItemWording({ wording, context: 0 }), "W1");
  t.equal(getItemWording({ wording, context: 1 }), "W2");
  const pageItem = new PageItem(wording, "V", ItemTypes.yesno);
  t.equal(getItemWording(pageItem), "W1");
  t.equal(getItemWording({ pageItem, context: 0 }), "W1");
  t.equal(getItemWording({ pageItem, context: 1 }), "W2");
  t.end();
});

test("Page item with default values", t => {
  const pageItem = new PageItem("Question", "VAR", ItemTypes.text, {
    defaultValue: new ConstantRule("The answer"),
  });
  t.equal(pageItem.defaultValue?.value, "The answer");
  t.end();
});

test("Page item with contextual wording", t => {
  const pageItem = new PageItem(["Q1", "Q2"], "VAR", ItemTypes.text);
  t.deepEqual(pageItem.wording, ["Q1", "Q2"]);
  t.end();
});

test("Context has memento", t => {
  t.ok(hasMemento([1, "3"]));
  t.end();
});

test("Context get memento", t => {
  t.equal(getItemMemento({ context: [1, "3"] }), 3);
  t.equal(
    getItemMemento({ context: [1, new Date("2022-08-01").toISOString()] }),
    new Date("2022-08-01").getTime()
  );
  t.equal(getItemMemento({ context: [1, "A"] }), "A");
  t.end();
});

test("Item context when memento", t => {
  const pageItem = new PageItem(["Q1", "Q2"], "VAR", ItemTypes.text);
  const context = getItemContext({ pageItem, context: [1, "3"] });
  t.equal(context, 1);
  t.end();
});

test("Item context when memento and contextual wording", t => {
  const pageItem = new PageItem(["Q1", "Q2"], "VAR", ItemTypes.text);
  const wording = getItemWording({ pageItem, context: [1, "3"] });
  const type = getItemType({ pageItem, context: [1, "3"] });
  t.equal(wording, "Q2");
  t.equal(type, ItemTypes.text);
  t.end();
});

test("Item context when memento and contextual type", t => {
  const pageItem = new PageItem(
    "Q1",
    "VAR",
    ItemTypes.context([ItemTypes.text, ItemTypes.yesno])
  );
  const wording = getItemWording({ pageItem, context: [1, "3"] });
  const type = getItemType({ pageItem, context: [1, "3"] });
  t.equal(wording, "Q1");
  t.equal(type, ItemTypes.yesno);
  t.end();
});

test("Page item instances #168", t => {
  const pageItem1 = new PageItem("Q", "VAR", ItemTypes.text, {
    array: true,
  });
  t.equal(pageItem1.instance, 1);
  const pageItem2 = pageItem1.nextInstance();
  t.equal(pageItem2.instance, 2);
  const pageItem3 = pageItem2.nextInstance();
  t.equal(pageItem3.instance, 3);
  t.end();
});

test("Page item has next instance #168", t => {
  const pageItem1 = new PageItem("Q", "VAR", ItemTypes.text, {
    array: true,
  });
  t.false(pageItem1.hasNextInstance());
  pageItem1.nextInstance();
  t.true(pageItem1.hasNextInstance());
  t.end();
});

test("Allow multiple instances #168", t => {
  const pageItem = new PageItem("Q", "VAR", ItemTypes.text);
  t.throws(() => pageItem.nextInstance());
  const pageItem1 = pageItem.update({ array: true });
  t.equal(pageItem1.nextInstance().instance, 2);
  t.end();
});

test("Get a given instance #190#227", t => {
  const pageItem = new PageItem("Q", "VAR", ItemTypes.text, { array: true });
  const instance = PageItem.getInstance(pageItem, 4);
  t.equal(instance.instance, 4);
  t.end();
});

test("Get all instances #190#227", t => {
  const pageItem = new PageItem("Q", "VAR", ItemTypes.text, { array: true });
  PageItem.getInstance(pageItem, 4);
  const instances = PageItem.getInstances(pageItem);
  t.true(instances.every(i => i.variableName == "VAR"));
  t.deepEqual(
    instances.map(i => i.instance),
    [1, 2, 3, 4]
  );
  t.end();
});

test("Test instance prototype #227", t => {
  const pageItem = new PageItem("Q", "VAR", ItemTypes.text, { array: true });
  const instance = PageItem.getInstance(pageItem, 4);
  t.true(instance.isInstanceOf(pageItem));
  t.true(instance.samePrototype(pageItem.nextInstance()));
  t.end();
});
