import test from "tape";
import { InterviewItem, ItemTypes, PageItem } from "../domain/index.js";
import { exampleSurvey, exampleParticipants } from "../example.js";
import { Row, RowSet, Table, SurveyTableSet } from "./surveydataset.js";

test("Row construction", t => {
  const survey = exampleSurvey;
  const page = survey.pageSets[1].pages[1];
  const participant = exampleParticipants[0];
  const row = new Row(participant, participant.interviews[1], page);
  t.equal(row.elements.length, 6);
  t.equal(row.elements[5], "P1");
  t.end();
});

test("Export special value #327", t => {
  const survey = exampleSurvey;
  const page = survey.pageSets[1].pages[1];
  const participant = exampleParticipants[1];
  const row = new Row(participant, participant.interviews[1], page);
  t.equal(row.elements[5], "notApplicable");
  t.end();
});

test("Not export transient variables", t => {
  const survey = exampleSurvey;
  const page = survey.pageSets[1].pages[0];
  const participant = exampleParticipants[1];
  const row = new Row(participant, participant.interviews[1], page);
  t.equal(row.elements.length, 2);
  t.end();
});

test("Not export Visit date twice", t => {
  const survey = exampleSurvey;
  const page = survey.pageSets[1].pages[1];
  const participant = exampleParticipants[1];
  const row = new Row(participant, participant.interviews[1], page);
  t.notDeepEqual(row.elements[0], new Date(row.elements[1] as string));
  t.equal(row.elements.length, 6);
  t.end();
});

test("Export unit #327", t => {
  const survey = exampleSurvey;
  const page = survey.pageSets[1].pages[2];
  const participant = exampleParticipants[1];
  const row = new Row(participant, participant.interviews[1], page);
  t.equal(row.elements[6], "ml");
  t.end();
});

test("Export unit if unique unit", t => {
  const survey = exampleSurvey;
  const participant = exampleParticipants[1];
  const page = survey.pageSets[1].pages[2];
  const pageItem = new PageItem("VARUNIT2", "VARUNIT2", ItemTypes.real, {
    units: { values: ["mn"], isExtendable: false },
  });
  const answer = new InterviewItem(pageItem, 10);
  const updatedPage = page.update({ includes: page.includes.append(pageItem) });
  const updatedInterview = participant.interviews[1].update({
    items: participant.interviews[1].items.append(answer),
  });
  const row = new Row(participant, updatedInterview, updatedPage);
  t.equal(row.elements[6], "ml");
  t.equal(row.elements[7], 10);
  t.equal(row.elements[8], "mn");
  t.end();
});

test("Export complete date value #327", t => {
  const survey = exampleSurvey;
  const participant = exampleParticipants[1];
  const page0 = survey.pageSets[0].pages[0];
  const row0 = new Row(participant, participant.interviews[0], page0);
  t.equal(row0.elements[1], "2020-01-12");
  const page1 = survey.pageSets[1].pages[2];
  const row1 = new Row(participant, participant.interviews[1], page1);
  t.equal(row1.elements[3], "2007-10-25");
  t.end();
});

test("Export incomplete date value #327", t => {
  const survey = exampleSurvey;
  const participant0 = exampleParticipants[2];
  const page = survey.pageSets[1].pages[2];
  const row0 = new Row(participant0, participant0.interviews[1], page);
  t.equal(row0.elements[3], "2007");
  const participant1 = exampleParticipants[4];
  const row1 = new Row(participant1, participant1.interviews[1], page);
  t.equal(row1.elements[3], "2007-08");
  t.end();
});

test("Row set construction", t => {
  const survey = exampleSurvey;
  const page = survey.pageSets[1].pages[1];
  const participant = exampleParticipants[0];
  const rowSet = new RowSet(participant, page, { defaultLang: "en" });
  t.equal(rowSet.rows.length, 2);
  assertHeader(t, rowSet.header);
  rowSet.rows.forEach((r, x) => {
    t.equal(r.elements.length, 10);
    t.equal(r.elements[0], "001");
    t.equal(r.elements[1], "00001");
    t.equal(r.elements[2], x);
    t.equal(r.elements[3], x == 0 ? "Inclusion" : "Follow Up");
  });
  t.end();
});

test("Row set locale option", t => {
  const survey = exampleSurvey;
  const page = survey.pageSets[1].pages[1];
  const participant = exampleParticipants[0];
  const rowSet = new RowSet(participant, page, { defaultLang: "fr" });
  t.equal(rowSet.rows[1].elements[3], "Suivi");
  t.end();
});

test("Rowset union", t => {
  const survey = exampleSurvey;
  const rowSet0 = new RowSet(exampleParticipants[0], survey.pages[4]);
  const rowSet1 = new RowSet(exampleParticipants[0], survey.pages[5]);
  const rowSet = rowSet0.union(rowSet1);
  t.deepEqual(rowSet.header, [
    "SAMPLECODE",
    "PATCODE",
    "OCCURRENCE",
    "VTYPE",
    "VDATE",
    "DYSP",
    "COUGH",
    "MALSTATUS",
    "LEGSTATUS",
    "LEGLOC",
    "LEGLOCOTHER",
  ]);
  t.equal(rowSet.rows.length, rowSet0.rows.length + rowSet1.rows.length);
  t.equal(rowSet.rows[2].elements[2], 2);
  t.end();
});

test("Table construction", t => {
  const survey = exampleSurvey;
  const page = survey.pageSets[1].pages[1];
  const table = new Table(exampleParticipants, page, survey.options);
  assertHeader(t, table.header);
  t.equal(table.rows.length, 11);
  t.equal(table.rowSets.filter(s => s.rows.length > 0).length, 7);
  table.rows.forEach(r => t.equal(r.elements.length, 10));
  t.equal(table.name, "General");
  t.end();
});

test("Table header construction when unit", t => {
  const survey = exampleSurvey;
  const page = survey.pageSets[1].pages[2];
  const table = new Table(exampleParticipants, page, survey.options);
  assertHeader(t, table.header, 1);
  t.equal(table.header[10], "DLCO_UNIT");
  t.end();
});

test("Table header without transient variables", t => {
  const survey = exampleSurvey;
  const page = survey.pageSets[1].pages[0];
  const table = new Table(exampleParticipants, page, survey.options);
  t.false(table.header.includes("__INCLUDED"));
  t.end();
});

test("Table header without info variables", t => {
  const survey = exampleSurvey;
  const page = survey.pageSets[1].pages[1];
  const table = new Table(exampleParticipants, page, survey.options);
  t.false(table.header.includes("WDEMO"));
  t.end();
});

test("Table header with only one column visit date", t => {
  const survey = exampleSurvey;
  const page = survey.pageSets[1].pages[1];
  const surveyOptions = survey.options;
  const table = new Table(exampleParticipants, page, surveyOptions);
  const occVdate = table.header.filter(
    a => a == surveyOptions.interviewDateVar
  ).length;
  t.equal(occVdate, 1);
  t.end();
});

test("Table construction when export is configured", t => {
  const survey = exampleSurvey;
  const page = survey.pages[5];
  const table = new Table(exampleParticipants, page, survey.options);
  t.equal(table.name, "Symptoms");
  t.end();
});

test("Table local", t => {
  const survey = exampleSurvey;
  const page = survey.pageSets[1].pages[1];
  const table = new Table(exampleParticipants, page, { defaultLang: "fr" });
  t.equal(table.name, "Général");
  t.end();
});

test("Table zipped", t => {
  const survey = exampleSurvey;
  const table0 = new Table(exampleParticipants, survey.pages[4]);
  const table1 = new Table(exampleParticipants, survey.pages[5]);
  const table = table0.zip(table1);
  t.deepEqual(table.header, [
    "SAMPLECODE",
    "PATCODE",
    "OCCURRENCE",
    "VTYPE",
    "VDATE",
    "DYSP",
    "COUGH",
    "MALSTATUS",
    "LEGSTATUS",
    "LEGLOC",
    "LEGLOCOTHER",
  ]);
  t.equal(table.rows.length, table0.rows.length + table1.rows.length);
  t.end();
});

test("Table set construction", t => {
  const tableSet = new SurveyTableSet(exampleSurvey, exampleParticipants);
  t.deepEqual(
    tableSet.tables.map(t => t.name),
    [
      "Home",
      "INCL",
      "General",
      "Risks",
      "Symptoms",
      "Side effects",
      "Table example",
      "Heap example",
      "Page array example",
      "Array example",
    ]
  );
  t.equal(tableSet.name, exampleSurvey.name);
  t.equal(tableSet.tables[4].rows[9].elements[9], "Suspended");
  t.equal(tableSet.tables[4].rows[9].elements[10], "notApplicable");
  t.end();
});

test("Table set locale", t => {
  const tableSet = new SurveyTableSet(exampleSurvey, exampleParticipants, "fr");
  t.equal(tableSet.locale, "fr");
  t.equal(tableSet.tables[0].name, "Synthèse");
  t.equal(tableSet.tables[2].rows[1].elements[3], "Suivi");
  t.end();
});

test("Row set for a multiple instance page #168", t => {
  const survey = exampleSurvey;
  const page = survey.pages[10];
  const participant = exampleParticipants[0];
  const rowset = new RowSet(participant, page);
  t.equal(rowset.rows.length, 2);
  t.equal(rowset.rows[0].elements[4], 1);
  t.equal(rowset.rows[1].elements[4], 2);
  t.deepEqual(rowset.rows[0].elements[6], "Cuisinier");
  t.deepEqual(rowset.rows[0].elements[7], 1996);
  t.deepEqual(rowset.rows[1].elements[6], "Secrétaire");
  t.deepEqual(rowset.rows[1].elements[7], 2002);
  t.equal(rowset.header[4], "RECORD");
  t.end();
});

test("Row set for a multiple instance section #168", t => {
  const survey = exampleSurvey;
  const page = survey.pages[11];
  const participant = exampleParticipants[0];
  const rowset = new RowSet(participant, page);
  t.equal(rowset.rows.length, 1);
  t.deepEqual(rowset.rows[0].elements[6], '["Cuisinier","Secrétaire"]');
  t.deepEqual(rowset.rows[0].elements[7], "[1996,2002]");
  t.end();
});

function assertHeader(
  t: test.Test,
  header: readonly string[],
  nbOptionalHeaders?: number
) {
  const headerLengthExpected = nbOptionalHeaders ? 10 + nbOptionalHeaders : 10;
  t.equal(header.length, headerLengthExpected);
  t.equal(header[0], "SAMPLECODE");
  t.equal(header[1], "PATCODE");
  t.equal(header[2], "OCCURRENCE");
  t.equal(header[3], "VTYPE");
  t.equal(header[4], "VDATE");
}
