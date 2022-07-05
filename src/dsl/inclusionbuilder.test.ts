import test from "tape";
import { ItemTypes, PageItem } from "../domain/index.js";
import { LibraryBuilder } from "./inclusionbuilder.js";
import { PageBuilder } from "./pagebuilder.js";

test("Build an inclusion", t => {
  const options = { defaultLang: "en" };
  const pageBuilder = new PageBuilder("Page", options);
  const b = new LibraryBuilder("Page", undefined, options);
  const page = pageBuilder.build([]);
  const inclusion = b.build([page]);
  t.deepLooseEqual(inclusion.page, page);
  t.end();
});

test("Build an inclusion with all items selected", t => {
  const options = { defaultLang: "en" };
  const pageBuilder = new PageBuilder("Page", options);
  pageBuilder
    .question("Q1", "Q1", ItemTypes.yesno)
    .question("Q2", "Q2", ItemTypes.integer)
    .question("Q3", "Q3", ItemTypes.text);
  const b = new LibraryBuilder("Page", undefined, options).select("Q1", "Q2", "Q3");
  const page = pageBuilder.build([]);
  const inclusion = b.build([page]);
  t.false(inclusion.pageItems);
  t.end();
});

test("Build an inclusion with selected items", t => {
  const options = { defaultLang: "en" };
  const pageBuilder = new PageBuilder("Page", options);
  pageBuilder
    .question("Q1", "Q1", ItemTypes.yesno)
    .question("Q2", "Q2", ItemTypes.integer)
    .question("Q3", "Q3", ItemTypes.text);
  const b = new LibraryBuilder("Page", undefined, options).select("Q2", "Q3");
  const page = pageBuilder.build([]);
  const inclusion = b.build([page]);
  t.deepLooseEqual(
    inclusion.pageItems,
    page.includes.filter(i => i instanceof PageItem && i.variableName != "Q1")
  );
  t.end();
});

test("Build an inclusion with context", t => {
  const options = { defaultLang: "en" };
  const pageBuilder = new PageBuilder("Page", options);
  pageBuilder.question("Q1", "Q1", ItemTypes.yesno, ItemTypes.integer);
  const b = new LibraryBuilder("Page", undefined, options).context("Q1", 1);
  const page = pageBuilder.build([]);
  const inclusion = b.build([page]);
  const pageItem = page.includes.find(
    i => i instanceof PageItem && i.variableName == "Q1"
  );
  t.deepLooseEqual(inclusion.contexts, [{ pageItem, context: 1 }]);
  t.end();
});
