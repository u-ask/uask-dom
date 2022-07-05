import test from "tape";
import { PageBuilder } from "./pagebuilder.js";
import { getItem, groupBySection, ItemTypes } from "../domain/index.js";
import { SurveyBuilder } from "./surveybuilder.js";

test("Build a page", t => {
  const pageBuilder = new PageBuilder("Observance", {});
  const page = pageBuilder.build([]);
  t.equal(page.name, "Observance");
  t.end();
});

test("Build a page with code", t => {
  const pageBuilder = new PageBuilder("OBS", { defaultLang: "en" });
  pageBuilder.translate("en", "Observance");
  const page = pageBuilder.build([]);
  if (typeof page.name == "object") {
    t.equal(page.name.en, "Observance");
    t.equal(page.name.__code__, "OBS");
  } else t.fail();
  t.end();
});

test("Build a pae with export configuration", t => {
  const pageBuilder = new PageBuilder("Observance", {});
  pageBuilder.exportTo("Obs");
  const page = pageBuilder.build([]);
  t.equal(page.exportConfig?.fileName, "Obs");
  t.end();
});

test("Builder always return the same page", t => {
  const pageBuilder = new PageBuilder("Observance", {});
  const page1 = pageBuilder.build([]);
  const page2 = pageBuilder.build([]);
  t.equal(page2, page1);
  t.end();
});

test("Build a translated page", t => {
  const pageBuilder = new PageBuilder("Side effects", { defaultLang: "en" })
    .translate("fr", "Effets secondaires")
    .translate("martian", "[^-|#)") as PageBuilder;
  const page = pageBuilder.build([]);
  if (typeof page.name == "object") {
    t.equal(page.name.en, "Side effects");
    t.equal(page.name.martian, "[^-|#)");
    t.equal(page.name.fr, "Effets secondaires");
  } else t.fail();
  t.end();
});

test("Build page with item", t => {
  const pageBuilder = new PageBuilder("Side effects", {});
  pageBuilder.question(
    "Have side effects been experienced ?",
    "SIDEF",
    ItemTypes.yesno
  );
  const page = pageBuilder.build([]);
  const items = page.items.map(getItem);
  t.equal(page.name, "Side effects");
  t.equal(items[0].wording, "Have side effects been experienced ?");
  t.equal(items[0].variableName, "SIDEF");
  t.equal(items[0].type, ItemTypes.yesno);
  t.end();
});

test("Build page with section", t => {
  const pageBuilder = new PageBuilder("With section", {});
  pageBuilder
    .question("", "Q1", ItemTypes.yesno)
    .startSection("section")
    .question("", "Q2", ItemTypes.yesno)
    .question("", "Q3", ItemTypes.yesno)
    .endSection()
    .question("", "Q4", ItemTypes.yesno);
  const page = pageBuilder.build([]);
  const sections = groupBySection(page.items.map(i => ({ pageItem: i })));
  t.deepLooseEqual(sections[1], {
    title: "section",
    items: [{ pageItem: page.items[1] }, { pageItem: page.items[2] }],
  });
  t.end();
});

test("Build page with translated section", t => {
  const pageBuilder = new PageBuilder("This is a page", { defaultLang: "en" });
  pageBuilder
    .translate("fr", "Ceci est une page")
    .startSection("This is a section")
    .translate("fr", "Ceci est une section")
    .question("This is a question", "Q1", ItemTypes.yesno)
    .translate("fr", "Ceci est une question")
    .endSection();
  const page = pageBuilder.build([]);
  const items = page.items.map(getItem);
  t.deepEqual(page.name, { en: "This is a page", fr: "Ceci est une page" });
  t.deepEqual(items[0].section, {
    en: "This is a section",
    fr: "Ceci est une section",
  });
  t.deepEqual(items[0].wording, {
    en: "This is a question",
    fr: "Ceci est une question",
  });
  t.end();
});

test("Build page with information and translation", t => {
  const pageBuilder = new PageBuilder("This is a page", { defaultLang: "en" });
  pageBuilder
    .info("This is an information for participants", "Information")
    .translate("fr", "Ceci est une information pour les participants");
  const page = pageBuilder.build([]);
  const items = page.items.map(getItem);
  t.deepEqual(items[0].wording, {
    en: "This is an information for participants",
    fr: "Ceci est une information pour les participants",
  });
  t.end();
});

test("Build page with section activation rule", t => {
  const surveyBuilder = new SurveyBuilder();
  surveyBuilder
    .page("Page with section")
    .question("", "Q1", ItemTypes.yesno)
    .startSection("section")
    .activateWhen("Q1", true)
    .question("", "Q2", ItemTypes.yesno)
    .question("", "Q3", ItemTypes.yesno)
    .endSection()
    .question("", "Q4", ItemTypes.yesno);

  const survey = surveyBuilder.build();
  t.deepLooseEqual(survey.rules[0].pageItems, [
    [survey.pages[0].items[0], "local"],
    [survey.pages[0].items[1], "local"],
  ]);
  t.deepLooseEqual(survey.rules[1].pageItems, [
    [survey.pages[0].items[0], "local"],
    [survey.pages[0].items[2], "local"],
  ]);
  t.equal(survey.rules[0].args.behavior, "enable");
  t.equal(survey.rules[1].args.behavior, "enable");
  t.end();
});

test("Build page with section visibility rule", t => {
  const surveyBuilder = new SurveyBuilder();
  surveyBuilder
    .page("Page with section")
    .question("", "Q1", ItemTypes.yesno)
    .startSection("section")
    .visibleWhen("Q1", true)
    .question("", "Q2", ItemTypes.yesno)
    .question("", "Q3", ItemTypes.yesno)
    .endSection()
    .question("", "Q4", ItemTypes.yesno);

  const survey = surveyBuilder.build();
  t.deepLooseEqual(survey.rules[0].pageItems, [
    [survey.pages[0].items[0], "local"],
    [survey.pages[0].items[1], "local"],
  ]);
  t.deepLooseEqual(survey.rules[1].pageItems, [
    [survey.pages[0].items[0], "local"],
    [survey.pages[0].items[2], "local"],
  ]);
  t.equal(survey.rules[0].args.behavior, "show");
  t.equal(survey.rules[1].args.behavior, "show");
  t.end();
});

test("Include with activation rule", t => {
  const b = new SurveyBuilder();
  b.page("Activated")
    .info("Activated", "V")
    .question("Question", "Q", b.types.integer);
  b.page("Activator")
    .question("Activate ?", "A", ItemTypes.yesno)
    .include("Activated")
    .activateWhen("A", true);

  const survey = b.get();
  t.equal(survey.crossRules.length, 2);
  t.deepLooseEqual(survey.crossRules[0].pageItems, [
    [survey.pages[1].items[0], "local"],
    [survey.pages[0].items[0], "local"],
  ]);
  t.deepEqual(survey.crossRules[0].args, { behavior: "enable", values: [true] });
  t.deepLooseEqual(survey.crossRules[1].pageItems, [
    [survey.pages[1].items[0], "local"],
    [survey.pages[0].items[1], "local"],
  ]);
  t.deepEqual(survey.crossRules[1].args, { behavior: "enable", values: [true] });
  t.end();
});

test("Untitled section chaining", t => {
  const b = new SurveyBuilder();
  b.page("Section Chained")
    .startSection()
    .question("test", ItemTypes.text)
    .endSection()
    .startSection()
    .question("test2", ItemTypes.integer)
    .endSection();
  const survey = b.get();
  const items = survey.items?.map(pi => {
    return { pageItem: pi };
  });
  const sections = groupBySection(items);
  t.equal(sections.length, 2);
  t.end();
});

test("Section with multiple translation", t => {
  const pageBuilder = new PageBuilder({ en: "en0", fr: "fr0", es: "es0" }, {});
  pageBuilder
    .startSection("en1")
    .translate("fr", "fr1")
    .translate("es", "es1")
    .question("", "V", ItemTypes.text)
    .endSection();
  const page = pageBuilder.build([]);
  t.deepEqual(page.name, { en: "en0", fr: "fr0", es: "es0" });
  t.deepEqual(getItem(page.items[0]).section, {
    en: "en1",
    fr: "fr1",
    es: "es1",
  });
  t.end();
});

test("Section with mlstring title", t => {
  const pageBuilder = new PageBuilder({ en: "en0", fr: "fr0", es: "es0" }, {});
  pageBuilder
    .startSection({ en: "New section", fr: "Nouvelle section" })
    .question("", "V", ItemTypes.text)
    .endSection();
  const page = pageBuilder.build([]);
  t.deepEqual(getItem(page.items[0]).section, {
    en: "New section",
    fr: "Nouvelle section",
  });
  t.end();
});
