import test from "tape";
import { ItemType } from "./itemtype.js";
import { ItemTypes } from "./itemtypes.js";

const f = (t: ItemType) => ItemTypes.create(JSON.parse(JSON.stringify(t)));

test("Factory create simple types", t => {
  t.deepEqual(f(ItemTypes.integer), ItemTypes.integer);
  t.deepEqual(f(ItemTypes.real), ItemTypes.real);
  t.deepEqual(f(ItemTypes.yesno), ItemTypes.yesno);
  t.deepEqual(f(ItemTypes.text), ItemTypes.text);
  t.deepEqual(f(ItemTypes.info), ItemTypes.info);
  t.deepEqual(f(ItemTypes.acknowledge), ItemTypes.acknowledge);
  t.end();
});

test("Factory create score type", t => {
  const expected = ItemTypes.score(1, 2, 5, 9, 16);
  const type = f(expected);
  t.deepEqual(type, expected);
  t.end();
});

test("Factory create scale type", t => {
  const expected = ItemTypes.scale(1, 5);
  const type = f(expected);
  t.deepEqual(type, expected);
  t.end();
});

test("Factory create glossary type", t => {
  const expected = ItemTypes.glossary("many", "one", "two", "three").lang("en");
  t.equal(expected.name, "glossary");
  const type = f(expected);
  t.deepEqual(type, expected);
  t.end();
});

test("Factory create choice type", t => {
  const expected = ItemTypes.choice("many", "red", "blue");
  const type = f(expected);
  t.deepEqual(type, expected);
  t.end();
});

test("Factory create context type", t => {
  const expected = ItemTypes.context({
    0: ItemTypes.yesno,
    1: ItemTypes.integer,
  });
  const type = f(expected);
  t.deepEqual(type, expected);
  t.end();
});
