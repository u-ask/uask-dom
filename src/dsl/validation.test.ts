import { builder } from "./surveybuilder.js";
import test from "tape";

test("Valid survey must have question for date pageSet", t => {
  const b = builder();
  t.deepEqual(b.validate(), [
    "question with pageSet date variable 'VDATE' is missing",
  ]);
  t.end();
});

test("Valid survey must have date pageSet page for each pageSet", t => {
  const b = builder();
  b.page("page1").question("PageSet date", "VDATE", b.types.date(false));
  b.page("page2");
  b.pageSet("Inclusion").pages("page1", "page2");
  b.pageSet("Follow Up").pages("page2");
  t.deepEqual(b.validate(), [
    "pageSet 'Follow Up' must have first page with pageSet date",
  ]);
  t.end();
});

test("Valid survey", t => {
  const b = builder();
  b.page("page1")
    .translate("fr", "page_1")
    .question("PageSet date", "VDATE", b.types.date(false));
  b.page("page2");
  b.pageSet("Inclusion").pages("page1", "page2");
  b.pageSet("Follow Up").pages("page1", "page2");
  t.deepEqual(b.validate(), []);
  t.end();
});
