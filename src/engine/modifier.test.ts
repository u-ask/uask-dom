import test from "tape";
import { PageItem, ItemTypes, mlstring } from "../domain/index.js";
import { parseComment } from "./modifier.js";

test("Parse comment double wording", t => {
  const pageItem = new PageItem("Q1", "Q1", ItemTypes.scale(0, 5), {
    comment: "<Not ok | ok>",
  });
  const modifier = parseComment(pageItem.comment as mlstring);
  t.equal(modifier.leftWording, "Not ok");
  t.equal(modifier.rightWording, "ok");
  t.end();
});

test("Parse composample comment", t => {
  const pageItem = new PageItem("Q1", "Q1", ItemTypes.scale(0, 5), {
    comment: "<Not ok | ok>(Ceci est une scale)",
  });
  const modifier = parseComment(pageItem.comment as mlstring);
  t.equal(modifier.leftWording, "Not ok");
  t.equal(modifier.rightWording, "ok");
  t.equal(modifier.comment, "Ceci est une scale");
  t.end();
});

test("Parse simply comment with ()", t => {
  const pageItem = new PageItem("POIDS", "POIDS", ItemTypes.scale(0, 5), {
    comment: "Votre poids (en kg)",
  });
  const modifier = parseComment(pageItem.comment as mlstring);
  t.equal(modifier.comment, undefined);
  t.end();
});

test("Parse composample comment with a () in the comment", t => {
  const pageItem = new PageItem("POIDS", "POIDS", ItemTypes.scale(0, 5), {
    comment:
      "<8. Je suis plein(e) d'energie | Je n'ai pas d'energie du tout>(comment)",
  });
  const modifier = parseComment(pageItem.comment as mlstring);
  t.equal(modifier.leftWording, "8. Je suis plein(e) d'energie");
  t.equal(modifier.rightWording, "Je n'ai pas d'energie du tout");
  t.equal(modifier.comment, "comment");
  t.end();
});

test("Parse comment double wording translated", t => {
  const pageItem = new PageItem("Q1", "Q1", ItemTypes.scale(0, 5), {
    comment: { en: "<Not ok | ok>", fr: "<Pas d'accord | D'accord>" },
  });
  const modifier = parseComment(pageItem.comment as mlstring);
  t.equal((modifier.leftWording as Record<string, string>)?.en, "Not ok");
  t.equal((modifier.leftWording as Record<string, string>)?.fr, "Pas d'accord");
  t.equal((modifier.rightWording as Record<string, string>)?.en, "ok");
  t.equal((modifier.rightWording as Record<string, string>)?.fr, "D'accord");
  t.end();
});

test("Parse basic class in comment", t => {
  const pageItem = new PageItem(
    "Q1",
    "Q1",
    ItemTypes.choice("one", "1", "2", "3"),
    { comment: "(comment){.row}" }
  );
  const modifier = parseComment(pageItem.comment as mlstring);
  t.equal(modifier.comment, "comment");
  t.deepEquals(modifier.classes, ["row"]);
  t.end();
});

test("Parse class without comment", t => {
  const pageItem = new PageItem(
    "Q1",
    "Q1",
    ItemTypes.choice("one", "1", "2", "3"),
    { comment: "{.row}" }
  );
  const modifier = parseComment(pageItem.comment as mlstring);
  t.false(modifier.comment);
  t.deepEquals(modifier.classes, ["row"]);
  t.end();
});

test("Parse class on multilang comment", t => {
  const pageItem = new PageItem(
    "Q1",
    "Q1",
    ItemTypes.choice("one", "1", "2", "3"),
    { comment: { en: "(comment){.row}", fr: "(comment){.row.column}" } }
  );
  const modifier = parseComment(pageItem.comment as mlstring);
  t.deepEquals(modifier.classes, ["row", "column"]);
  t.end();
});
