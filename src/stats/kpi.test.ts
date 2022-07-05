import test from "tape";
import { DomainCollection, IDomainCollection, Sample } from "../domain/index.js";
import { SurveyBuilder } from "../dsl/index.js";
import { IParticipantSummary } from "./summary.js";
import { InclusionsBySamples } from "./kpi.js";

function buildSurvey() {
  const b = new SurveyBuilder();
  b.options({ inclusionVar: "INCL", interviewDateVar: "DATEVAR" });
  b.pageSet("PS1").pages("P1");
  b.page("P1")
    .question("Q1", "Q1", b.types.text)
    .question("Q2", "Q2", b.types.real)
    .question("Q3", "Q3", b.types.yesno)
    .question("Q4", "Q4", b.types.integer)
    .question("INCL", "INCL", b.types.acknowledge)
    .question("DATEVAR", "DATEVAR", b.types.date());
  return b.build();
}

function buildParticipants(): IDomainCollection<IParticipantSummary> {
  const ps1 = {
    inclusionDate: new Date("2021-12-11"),
    alerts: DomainCollection(
      {
        interview: undefined,
        message: "Query 1",
        item: undefined,
        type: "query",
        tags: {
          state: "closed",
        },
      },
      {
        interview: undefined,
        message: "Query 2",
        item: undefined,
        type: "query",
        tags: {
          state: "open",
        },
      },
      {
        interview: undefined,
        message: "Query 3",
        item: undefined,
        type: "query",
        tags: {
          state: "open",
        },
      },
      {
        interview: undefined,
        message: "Query 4",
        item: undefined,
        type: "query",
        tags: {
          state: "canceled",
        },
      }
    ),
    kpis: {
      Q1: {
        value: "Value 1",
        kpi: { en: "Q1", fr: "Q1" },
        type: "text",
        wording: { en: "Q1", fr: "Q1" },
        specialValue: undefined,
      },
      Q2: {
        value: 8,
        kpi: { en: "Q2", fr: "Q2" },
        type: "real",
        wording: { en: "Q2", fr: "Q2" },
        specialValue: undefined,
      },
      "Q4|Q3=0": {
        value: 3,
        kpi: { en: "Q3", fr: "Q3" },
        type: "integer",
        wording: { en: "Q3", fr: "Q3" },
        specialValue: undefined,
      },
      "Q4|Q3=1": {
        value: 5,
        kpi: { en: "Q3", fr: "Q3" },
        type: "integer",
        wording: { en: "Q3", fr: "Q3" },
        specialValue: undefined,
      },
    },
    pins: {},
    participantCode: "00001",
    sampleCode: "001",
  } as IParticipantSummary;

  const ps2 = {
    inclusionDate: new Date("2021-12-10"),
    alerts: DomainCollection(
      {
        interview: undefined,
        message: "Query 1",
        item: undefined,
        type: "query",
        tags: {
          state: "closed",
        },
      },
      {
        interview: undefined,
        message: "Query 2",
        item: undefined,
        type: "query",
        tags: {
          state: "closed",
        },
      },
      {
        interview: undefined,
        message: "Query 3",
        item: undefined,
        type: "query",
        tags: {
          state: "closed",
        },
      },
      {
        interview: undefined,
        message: "Query 4",
        item: undefined,
        type: "query",
        tags: {
          state: "open",
        },
      }
    ),
    kpis: {
      Q1: {
        value: "Value 2",
        kpi: { en: "Q1", fr: "Q1" },
        type: "text",
        wording: { en: "Q1", fr: "Q1" },
        specialValue: undefined,
      },
      Q2: {
        value: 16,
        kpi: { en: "Q2", fr: "Q2" },
        type: "text",
        wording: { en: "Q2", fr: "Q2" },
        specialValue: undefined,
      },
      "Q4|Q3=0": {
        value: 4,
        kpi: { en: "Q3", fr: "Q3" },
        type: "integer",
        wording: { en: "Q3", fr: "Q3" },
        specialValue: undefined,
      },
      "Q4|Q3=1": {
        value: 6,
        kpi: { en: "Q3", fr: "Q3" },
        type: "integer",
        wording: { en: "Q3", fr: "Q3" },
        specialValue: undefined,
      },
    },
    pins: {},
    participantCode: "00002",
    sampleCode: "002",
  } as IParticipantSummary;
  return DomainCollection(ps1, ps2);
}

test("Build inclusions KPI #182", t => {
  const survey = buildSurvey();
  const samples = DomainCollection(new Sample("001"), new Sample("002"));
  const participants = buildParticipants();
  const inclusions = new InclusionsBySamples(survey, samples, participants);
  t.deepEqual(inclusions.values, [
    [0, 1],
    [1, 0],
  ]);
  t.deepEqual(inclusions.rowSums, [[1], [1]]);
  t.deepEqual(inclusions.columnSums, [[1, 1]]);
  t.end();
});
