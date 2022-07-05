import { SurveyBuilder } from "./surveybuilder.js";
import test from "tape";
import { PageSetBuilder } from "./pagesetbuilder.js";
import { PageBuilder } from "./pagebuilder.js";
import { ItemTypes } from "../domain/index.js";

test("Build a pageSet", t => {
  const pageSetBuilder = new PageSetBuilder("Inclusion", {});
  const pageSet = pageSetBuilder.build([]);
  t.equal(pageSet.type, "Inclusion");
  t.end();
});

test("Build a pageSet with code", t => {
  const pageSetBuilder = new PageSetBuilder("INCL", { defaultLang: "en" });
  pageSetBuilder.translate("en", "Inclusion");
  const pageSet = pageSetBuilder.build([]);
  if (typeof pageSet.type == "object") {
    t.equal(pageSet.type.en, "Inclusion");
    t.equal(pageSet.type.__code__, "INCL");
  } else t.fail();
  t.end();
});

test("Build a pageSet with translation", t => {
  const pageSetBuilder = new PageSetBuilder("Exam", { defaultLang: "en" })
    .translate("fr", "Examen")
    .translate("martian", "[^-|#)") as PageSetBuilder;
  const pageSet = pageSetBuilder.build([]);

  if (typeof pageSet.type == "object") {
    t.equal(pageSet.type.en, "Exam");
    t.equal(pageSet.type.martian, "[^-|#)");
    t.equal(pageSet.type.fr, "Examen");
  } else t.fail();
  t.end();
});

test("Build a pageSet with a page", t => {
  const pageSetBuilder = new PageSetBuilder("Inclusion", {}).pages(
    "Observance"
  ) as PageSetBuilder;
  const pageSet = pageSetBuilder.build([
    new PageBuilder("Observance", {}).build([]),
  ]);
  t.equal(pageSet.pages[0].name, "Observance");
  t.end();
});

test("PageSet builder is fluent", t => {
  const pageSetBuilder = new PageSetBuilder(
    "Inclusion",
    {},
    new SurveyBuilder()
  ).pageSet("Follow Up") as PageSetBuilder;
  const pageSet = pageSetBuilder;
  pageSetBuilder.build([]);
  t.equal(pageSet.type, "Follow Up");
  t.end();
});

test("PageSet builder is not fluent", t => {
  const pageSetBuilder = new PageSetBuilder("Inclusion", {});
  t.throws(() => pageSetBuilder.pageSet("Follow Up"));
  t.end();
});

test("Unknown page", t => {
  const pageSetBuilder = new PageSetBuilder("Inclusion", {}).pages(
    "Observance"
  ) as PageSetBuilder;
  t.throws(() => pageSetBuilder.build([]));
  t.end();
});

test("Build a pageset with redifined date variable", t => {
  const pageSetBuilder = new PageSetBuilder("Follow Up", {});
  pageSetBuilder.datevariable("PSDATE");
  const pageBuilder = new PageBuilder("Consultation", {});
  pageBuilder.question("A first date", "VDATE", ItemTypes.date(false));
  pageBuilder.question("Target date", "PSDATE", ItemTypes.date(false));
  const pageSet = pageSetBuilder.build([pageBuilder.build([])]);
  t.equal(pageSet.datevar, "PSDATE");
  t.end();
});

test("Build a pageSet with mandatory page", t => {
  const pageSetBuilder = new PageSetBuilder("Inclusion", {}).pages(
    "Observance",
    { name: "Général", mandatory: true }
  ) as PageSetBuilder;
  const page1 = new PageBuilder("Observance", {}).build([]);
  const page2 = new PageBuilder("Général", {}).build([]);
  const pageSet = pageSetBuilder.build([page1, page2]);
  t.deepLooseEqual(pageSet.pages, [page1, page2]);
  t.deepLooseEqual(pageSet.mandatoryPages, [page2]);
  t.end();
});
