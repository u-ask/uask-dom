import test from "tape";
import { ItemTypes } from "./itemtypes.js";

test("Page item text type construction", t => {
  const text = ItemTypes.text;
  t.equal(text.name, "text");
  t.end();
});

test("Page item choice type construction", t => {
  const choice = ItemTypes.choice("one", "red", "green", "blue");
  t.equal(choice.multiplicity, "one");
  t.equal(choice.choices[0], "red");
  t.deepEqual(choice.labels[0], { __code__: "red", en: "red" });
  t.end();
});

test("Page item choice type with labels", t => {
  const choice = ItemTypes.choice("one", "R", "G", "B").wording(
    "red",
    "green",
    "blue"
  );
  t.equal(choice.choices[0], "R");
  t.deepEqual(choice.labels[0], { __code__: "R", en: "red" });
  t.end();
});

test("Page item choice type with translation", t => {
  const choice = ItemTypes.choice("one", "R", "G", "B")
    .lang("en")
    .wording("red", "green", "blue")
    .translate("fr", "rouge", "vert", "bleu")
    .translate("martian", "[^-|#)", "{@'~|~", "~&#]|@");
  t.deepEqual(choice.label("R", "en"), "red");
  t.deepEqual(choice.label("R", "fr"), "rouge");
  t.deepEqual(choice.label("R", "martian"), "[^-|#)");
  t.end();
});

test("Page item choice type with translation", t => {
  const choice = ItemTypes.choice("one", "R", "G", "B")
    .lang("en")
    .wording("red", "green", "blue");
  t.equal(choice.defaultLang, "en");
  const translation = choice
    .translate("fr", "rouge", "vert", "bleu")
    .translate("martian", "[^-|#)", "{@'~|~", "~&#]|@");
  t.deepEqual(translation.labels[0], {
    __code__: "R",
    en: "red",
    fr: "rouge",
    martian: "[^-|#)",
  });
  t.end();
});

test("Page item country choice type construction", t => {
  const choice = ItemTypes.countries("one");
  t.equal(choice.multiplicity, "one");
  t.equal(choice.choices[0], "FRA");
  t.end();
});

test("Page item scale type construction", t => {
  const scale = ItemTypes.scale(0, 5);
  t.equal(scale.min, 0);
  t.equal(scale.max, 5);
  t.end();
});

test("Page item scale type with labels", t => {
  const scale = ItemTypes.scale(0, 2).wording("No", "Little", "A lot");
  t.deepEqual(scale.labels?.[0], { __code__: "0", en: "No" });
  t.deepEqual(scale.labels?.[1], { __code__: "1", en: "Little" });
  t.deepEqual(scale.labels?.[2], { __code__: "2", en: "A lot" });
  t.end();
});

test("Page item scale type with translation", t => {
  const scale = ItemTypes.scale(0, 2)
    .wording("No", "Little", "A lot")
    .translate("fr", "Non", "Un peu", "Beaucoup")
    .translate("martian", "[^-|#)", "{@'~|~", "~&#]|@");
  t.deepEqual(scale.label(0, "en"), "No");
  t.deepEqual(scale.label(0, "fr"), "Non");
  t.deepEqual(scale.label(0, "martian"), "[^-|#)");
  t.end();
});

test("Page item scale type with translation", t => {
  const scale = ItemTypes.scale(0, 2)
    .lang("en")
    .wording("No", "Little", "A lot");
  const translation = scale
    .translate("fr", "Non", "Un peu", "Beaucoup")
    .translate("martian", "[^-|#)", "{@'~|~", "~&#]|@");
  t.deepEqual(translation.labels?.[1], {
    __code__: "1",
    en: "Little",
    fr: "Un peu",
    martian: "{@'~|~",
  });
  t.end();
});

test("Page item date type construction", t => {
  const date = ItemTypes.date(true);
  t.equal(date.incomplete, true);
  t.end();
});

test("Page item acknowledge type construction", t => {
  const acknowledge = ItemTypes.acknowledge;
  t.equal(acknowledge.name, "acknowledge");
  t.end();
});

test("Page item info type construction", t => {
  const info = ItemTypes.info;
  t.equal(info.name, "info");
  t.end();
});

test("Page item context type construction", t => {
  const type0 = ItemTypes.yesno;
  const type1 = ItemTypes.choice("one", "first", "second", "third");
  const context = ItemTypes.context([type0, type1]);
  t.equal(context[0], type0);
  t.equal(context[1], type1);
  t.end();
});

test("Label for type", t => {
  t.equal(ItemTypes.date(false).label(new Date(2020, 11, 31)), "2020-12-31");
  const incompleteDate = ItemTypes.date(true).label("2020-12") as string;
  t.equal(incompleteDate, "2020-12");
  t.equal(ItemTypes.yesno.label(1), "Yes");
  t.equal(ItemTypes.choice("one", "R").wording("red").label("R"), "red");
  t.equal(ItemTypes.integer.label(1), "1");
  t.false(ItemTypes.integer.label(undefined));
  t.equal(ItemTypes.acknowledge.label(true), "Yes");
  t.equal(ItemTypes.acknowledge.label(undefined), undefined);
  t.end();
});

test("Label for date type #296", t => {
  const dateType = ItemTypes.date(false);
  const label = dateType.label.bind(dateType);
  t.equal(label(new Date("2020-12-31T12:00:00Z")), "2021-01-01");
  t.equal(label(new Date("2020-12-31T22:00:00Z")), "2021-01-01");
  t.equal(label(new Date("2021-01-01T11:59:59Z")), "2021-01-01");
  t.end();
});

test("Label for context type", t => {
  const type = ItemTypes.context([
    ItemTypes.yesno,
    ItemTypes.choice("one", "R", "G", "B")
      .lang("en")
      .wording("red", "green", "blue"),
  ]);
  t.equal(type.label(1), "Yes");
  t.equal(type.label("R", "en", 1), "red");
  t.end();
});

test("Label for score type", t => {
  const type = ItemTypes.score(0, 1)
    .wording("No", "Yes")
    .translate("fr", "Non", "Oui");
  t.equal(type.label(0), "No");
  t.equal(type.label(1), "Yes");
  t.equal(type.label(0, "fr"), "Non");
  t.equal(type.label(1, "fr"), "Oui");
  t.end();
});

test("Page item score type construction", t => {
  const score = ItemTypes.score(0, 1, 2, 5, 9);
  t.deepEqual(score.scores, [0, 1, 2, 5, 9]);
  t.end();
});

test("Page item score type with labels", t => {
  const score = ItemTypes.score(0, 2, 5).wording("No", "Little", "A lot");
  t.equal(score.label(0), "No");
  t.equal(score.label(2), "Little");
  t.equal(score.label(5), "A lot");
  t.end();
});

test("Page item score type with translation", t => {
  const scale = ItemTypes.score(0, 2, 5)
    .wording("No", "Little", "A lot")
    .translate("fr", "Non", "Un peu", "Beaucoup")
    .translate("martian", "[^-|#)", "{@'~|~", "~&#]|@");
  t.deepEqual(scale.label(0, "en"), "No");
  t.deepEqual(scale.label(0, "fr"), "Non");
  t.deepEqual(scale.label(5, "martian"), "~&#]|@");
  t.end();
});

test("Incomplete date wiht year month only", t => {
  const date = ItemTypes.date(true, true);
  t.true(date.month);
  t.end();
});

test("Page item image type #254", t => {
  const image = ItemTypes.image;
  t.equal(image.name, "image");
  t.end();
});

test("Page item time type #256", t => {
  const time = ItemTypes.time();
  t.equal(time.name, "time");
  t.equal(time.duration, false);
  t.equal(time.label(new Date(0, 0, 0, 15, 30, 0)), "15:30");
  t.equal(time.label(new Date(0, 0, 0, 15, 30, 0).toString()), "15:30");
  t.end();
});

test("Page item time duration type #256", t => {
  const time = ItemTypes.time(true);
  t.equal(time.name, "time");
  t.equal(time.duration, true);
  t.equal(time.label(930), "15h30min");
  t.end();
});

test("Null values are casted to undefined", t => {
  t.equal(ItemTypes.text.typedValue(null), undefined);
  t.equal(ItemTypes.integer.typedValue(null), undefined);
  t.equal(ItemTypes.real.typedValue(null), undefined);
  t.equal(ItemTypes.date().typedValue(null), undefined);
  t.equal(ItemTypes.time().typedValue(null), undefined);
  t.equal(ItemTypes.yesno.typedValue(null), undefined);
  t.equal(ItemTypes.acknowledge.typedValue(null), undefined);
  t.equal(ItemTypes.score().typedValue(null), undefined);
  t.equal(ItemTypes.scale(1, 4).typedValue(null), undefined);
  t.equal(ItemTypes.choice("one").typedValue(null), undefined);
  t.end();
});
