import test from "tape";
import { DomainCollection, ItemTypes } from "../domain/index.js";
import { SurveyBuilder } from "../dsl/index.js";
import { KPISet } from "./kpiset.js";
import { IParticipantSummary } from "./summary.js";

test("Kpi set margin raw values #253", t => {
  const survey = buildSurvey();
  const kpiSet = new KPISet(survey, summaries);
  t.equal(kpiSet.margins.size, 2);
  t.deepEqual(kpiSet.margins.get("Q1")?.rawValues, [
    "A",
    "A",
    "B",
    "A",
    "B",
    "A",
    "B",
    "A",
  ]);
  t.deepEqual(kpiSet.margins.get("Q2")?.rawValues, [1, 3, 3, 3, 5, 5, 9, 9]);
  t.end();
});

test("Kpi set margin computed values #253", t => {
  const survey = buildSurvey();
  const kpiSet = new KPISet(survey, summaries);
  t.equal(kpiSet.margins.size, 2);
  t.deepEqual(kpiSet.margins.get("Q1")?.values, [
    "A",
    "A",
    "B",
    "A",
    "B",
    "A",
    "B",
    "A",
  ]);
  t.deepEqual(kpiSet.margins.get("Q2")?.values, [
    "Q1: [1, 3)",
    "Q2: [3, 4)",
    "Q2: [3, 4)",
    "Q2: [3, 4)",
    "Q3: [4, 6)",
    "Q3: [4, 6)",
    "Q4: [6, 9]",
    "Q4: [6, 9]",
  ]);
  t.end();
});

test("Kpi set data #253", t => {
  const survey = buildSurvey();
  const kpiSet = new KPISet(survey, summaries);
  const expectedData = [
    ["A", "Q1: [1, 3)", 1],
    ["A", "Q2: [3, 4)", 2],
    ["A", "Q3: [4, 6)", 1],
    ["A", "Q4: [6, 9]", 1],
    ["B", "Q2: [3, 4)", 1],
    ["B", "Q3: [4, 6)", 1],
    ["B", "Q4: [6, 9]", 1],
  ];
  t.deepEqual(kpiSet.data, expectedData);
  t.end();
});

test("Kpi set margin for conditional #319", t => {
  const survey = buildSurvey();
  const conditionals = summaries.map(s => ({
    ...s,
    kpis: { Q1: s.kpis.Q1, [`Q2|Q1=${s.kpis.Q1.value}`]: s.kpis.Q2 },
  }));
  const kpiSet = new KPISet(survey, conditionals);
  t.equal(kpiSet.margins.size, 3);
  t.deepEqual(kpiSet.margins.get("Q1")?.values, [
    "A",
    "A",
    "B",
    "A",
    "B",
    "A",
    "B",
    "A",
  ]);
  t.deepEqual(kpiSet.margins.get("Q2|Q1=A")?.values, [
    "Q1: [1, 3)",
    "Q3: [3, 5)",
    undefined,
    "Q3: [3, 5)",
    undefined,
    "Q4: [5, 9]",
    undefined,
    "Q4: [5, 9]",
  ]);
  t.deepEqual(kpiSet.margins.get("Q2|Q1=B")?.values, [
    undefined,
    undefined,
    "Q1: [3, 4)",
    undefined,
    "Q3: [5, 7)",
    undefined,
    "Q4: [7, 9]",
    undefined,
  ]);
  t.end();
});

test("Kpi set data for conditional #319", t => {
  const survey = buildSurvey();
  const conditionals = summaries.map(s => ({
    ...s,
    kpis: { Q1: s.kpis.Q1, [`Q2|Q1=${s.kpis.Q1.value}`]: s.kpis.Q2 },
  }));
  const kpiSet = new KPISet(survey, conditionals);
  const expectedData = [
    ["A", "Q1: [1, 3)", undefined, 1],
    ["A", "Q3: [3, 5)", undefined, 2],
    ["A", "Q4: [5, 9]", undefined, 2],
    ["B", undefined, "Q1: [3, 4)", 1],
    ["B", undefined, "Q3: [5, 7)", 1],
    ["B", undefined, "Q4: [7, 9]", 1],
  ];
  t.deepEqual(kpiSet.data, expectedData);
  t.end();
});

test("Kpi set with sample option #253", t => {
  const survey = buildSurvey();
  const kpiSet = new KPISet(survey, summaries, { sample: true });
  const expectedData = [
    ["001", "A", "Q1: [1, 3)", 1],
    ["001", "A", "Q2: [3, 4)", 2],
    ["001", "A", "Q4: [6, 9]", 1],
    ["001", "B", "Q3: [4, 6)", 1],
    ["002", "A", "Q3: [4, 6)", 1],
    ["002", "B", "Q2: [3, 4)", 1],
    ["002", "B", "Q4: [6, 9]", 1],
  ];
  t.deepEqual(kpiSet.data, expectedData);
  t.end();
});

test("Kpi set modalities #253", t => {
  const survey = buildSurvey();
  const kpiSet = new KPISet(survey, summaries, { sample: true });
  t.deepEqual(kpiSet.margins.get("@SAMPLE")?.modalities, ["001", "002"]);
  t.deepEqual(kpiSet.margins.get("Q1")?.modalities, ["A", "B", "Z"]);
  t.deepEqual(kpiSet.margins.get("Q2")?.modalities, [
    "Q1: [1, 3)",
    "Q2: [3, 4)",
    "Q3: [4, 6)",
    "Q4: [6, 9]",
  ]);
  t.end();
});

test("Kpi set projection #253", t => {
  const survey = buildSurvey();
  const kpiSet = new KPISet(survey, summaries, { sample: true });
  const projected = kpiSet.select("@SAMPLE", "Q1");
  const expectedData = [
    ["001", "A", 4],
    ["001", "B", 1],
    ["002", "A", 1],
    ["002", "B", 2],
  ];
  t.deepEqual(projected.data, expectedData);
  t.end();
});

test("Kpi set sparse projection #253", t => {
  const survey = buildSurvey();
  const kpiSet = new KPISet(survey, summaries, { sample: true });
  const projected = kpiSet.select("@SAMPLE", "Q2");
  const expectedData = [
    ["001", "Q1: [1, 3)", 1],
    ["001", "Q2: [3, 4)", 2],
    ["001", "Q3: [4, 6)", 1],
    ["001", "Q4: [6, 9]", 1],
    ["002", "Q2: [3, 4)", 1],
    ["002", "Q3: [4, 6)", 1],
    ["002", "Q4: [6, 9]", 1],
  ];
  t.deepEqual(projected.data, expectedData);
  t.end();
});

test("Kpi set projection order #253", t => {
  const survey = buildSurvey();
  const kpiSet = new KPISet(survey, summaries, { sample: true });
  const projected = kpiSet.select("Q1", "@SAMPLE");
  const expectedData = [
    ["A", "001", 4],
    ["A", "002", 1],
    ["B", "001", 1],
    ["B", "002", 2],
  ];
  t.deepEqual(projected.data, expectedData);
  t.end();
});

test("Kpi set projection for conditional #319", t => {
  const survey = buildSurvey();
  const conditionals = summaries.map(s => ({
    ...s,
    kpis: { Q1: s.kpis.Q1, [`Q2|Q1=${s.kpis.Q1.value}`]: s.kpis.Q2 },
  }));
  const kpiSet = new KPISet(survey, conditionals, { sample: true });
  const projected = kpiSet.select("@SAMPLE", "Q2|Q1=A");
  const expectedData = [
    ["001", undefined, 1],
    ["001", "Q1: [1, 3)", 1],
    ["001", "Q3: [3, 5)", 2],
    ["001", "Q4: [5, 9]", 1],
    ["002", undefined, 2],
    ["002", "Q4: [5, 9]", 1],
  ];
  t.deepEqual(projected.data, expectedData);
  t.end();
});

test("Kpi set variable names #253", t => {
  const survey = buildSurvey();
  const kpiSet = new KPISet(survey, summaries, { sample: true });
  t.deepEqual(kpiSet.variableNames, ["@SAMPLE", "Q1", "Q2"]);
  t.deepEqual(kpiSet.select("@SAMPLE", "Q2").variableNames, ["@SAMPLE", "Q2"]);
  t.end();
});

test("Kpi matrix extraction #253", t => {
  const survey = buildSurvey();
  const kpiSet = new KPISet(survey, summaries, { sample: true });
  const matrix1 = kpiSet.getMatrix("@SAMPLE", "Q1");
  t.deepEqual(matrix1.values, [
    [4, 1, 0],
    [1, 2, 0],
  ]);
  const matrix2 = kpiSet.getMatrix("@SAMPLE", "Q2");
  t.deepEqual(matrix2.values, [
    [1, 3, 3, 5, 9],
    [3, 4, 5, 7, 9],
  ]);
  t.end();
});

test("Kpi matrix metadata #253", t => {
  const survey = buildSurvey();
  const kpiSet = new KPISet(survey, summaries, { sample: true });
  const matrix1 = kpiSet.getMatrix("@SAMPLE", "Q1");
  t.deepEqual(matrix1.datasource, {
    row: {
      variableName: "@SAMPLE",
      label: { en: "sample", fr: "centre" },
      values: ["001", "002"],
      type: { name: "text", nature: "categorical" },
    },
    column: {
      variableName: "Q1",
      label: { en: "Q1", fr: "Q1" },
      values: ["A", "B", "Z"],
      type: { ...ItemTypes.choice("one", "A", "B", "Z").lang("en") },
    },
  });
  const matrix2 = kpiSet.getMatrix("@SAMPLE", "Q2");
  t.deepEqual(matrix2.datasource, {
    row: {
      variableName: "@SAMPLE",
      label: { en: "sample", fr: "centre" },
      values: ["001", "002"],
      type: { name: "text", nature: "categorical" },
    },
    column: {
      variableName: "Q2",
      label: { en: "Q2", fr: "Q2" },
      values: ["min", "Q1", "median", "Q3", "max"],
      type: { name: "real", nature: "numerical" },
    },
  });
  t.end();
});

test("Kpi matrix metadata #253", t => {
  const survey = buildSurvey();
  const kpiSet = new KPISet(survey, summaries, { sample: true });
  const matrix1 = kpiSet.getMatrix("@SAMPLE", "Q1");
  t.deepEqual(matrix1.rowSums, [[5], [3]]);
  t.deepEqual(matrix1.columnSums, [[5, 3, 0]]);
  const matrix2 = kpiSet.getMatrix("@SAMPLE", "Q2");
  t.deepEqual(matrix2.rowSums, [[3], [5]]);
  t.deepEqual(matrix2.columnSums, [[1, 3, 4, 6, 9]]);
  t.end();
});

test("Kpi matrix for conditional #319", t => {
  const survey = buildSurvey();
  const conditionals = summaries.map(s => ({
    ...s,
    kpis: { Q1: s.kpis.Q1, [`Q2|Q1=${s.kpis.Q1.value}`]: s.kpis.Q2 },
  }));
  const kpiSet = new KPISet(survey, conditionals, { sample: true });
  const matrix = kpiSet.getMatrix("@SAMPLE", "Q2|Q1=A");
  t.deepEqual(matrix.values, [
    [1, 2.5, 3, 4.5, 9],
    [5, 5, 5, 5, 5],
  ]);
  t.end();
});

const summaries: IParticipantSummary[] = [
  {
    participantCode: "000001",
    sampleCode: "001",
    inclusionDate: undefined,
    pins: {},
    alerts: DomainCollection(),
    kpis: {
      Q1: {
        value: "A",
        kpi: { en: "Q1", fr: "Q1" },
        type: "choice",
        wording: { en: "Q1", fr: "Q1" },
        specialValue: undefined,
      },
      Q2: {
        value: 1,
        kpi: { en: "Q2", fr: "Q2" },
        type: "choice",
        wording: { en: "Q2", fr: "Q2" },
        specialValue: undefined,
      },
    },
  },
  {
    participantCode: "000002",
    sampleCode: "001",
    inclusionDate: undefined,
    pins: {},
    alerts: DomainCollection(),
    kpis: {
      Q1: {
        value: "A",
        kpi: { en: "Q1", fr: "Q1" },
        type: "text",
        wording: { en: "Q1", fr: "Q1" },
        specialValue: undefined,
      },
      Q2: {
        value: 3,
        kpi: { en: "Q2", fr: "Q2" },
        type: "text",
        wording: { en: "Q2", fr: "Q2" },
        specialValue: undefined,
      },
    },
  },
  {
    participantCode: "000003",
    sampleCode: "002",
    inclusionDate: undefined,
    pins: {},
    alerts: DomainCollection(),
    kpis: {
      Q1: {
        value: "B",
        kpi: { en: "Q1", fr: "Q1" },
        type: "text",
        wording: { en: "Q1", fr: "Q1" },
        specialValue: undefined,
      },
      Q2: {
        value: 3,
        kpi: { en: "Q2", fr: "Q2" },
        type: "text",
        wording: { en: "Q2", fr: "Q2" },
        specialValue: undefined,
      },
    },
  },
  {
    participantCode: "000004",
    sampleCode: "001",
    inclusionDate: undefined,
    pins: {},
    alerts: DomainCollection(),
    kpis: {
      Q1: {
        value: "A",
        kpi: { en: "Q1", fr: "Q1" },
        type: "text",
        wording: { en: "Q1", fr: "Q1" },
        specialValue: undefined,
      },
      Q2: {
        value: 3,
        kpi: { en: "Q2", fr: "Q2" },
        type: "text",
        wording: { en: "Q2", fr: "Q2" },
        specialValue: undefined,
      },
    },
  },
  {
    participantCode: "000005",
    sampleCode: "001",
    inclusionDate: undefined,
    pins: {},
    alerts: DomainCollection(),
    kpis: {
      Q1: {
        value: "B",
        kpi: { en: "Q1", fr: "Q1" },
        type: "text",
        wording: { en: "Q1", fr: "Q1" },
        specialValue: undefined,
      },
      Q2: {
        value: 5,
        kpi: { en: "Q2", fr: "Q2" },
        type: "text",
        wording: { en: "Q2", fr: "Q2" },
        specialValue: undefined,
      },
    },
  },
  {
    participantCode: "000006",
    sampleCode: "002",
    inclusionDate: undefined,
    pins: {},
    alerts: DomainCollection(),
    kpis: {
      Q1: {
        value: "A",
        kpi: { en: "Q1", fr: "Q1" },
        type: "text",
        wording: { en: "Q1", fr: "Q1" },
        specialValue: undefined,
      },
      Q2: {
        value: 5,
        kpi: { en: "Q2", fr: "Q2" },
        type: "text",
        wording: { en: "Q2", fr: "Q2" },
        specialValue: undefined,
      },
    },
  },
  {
    participantCode: "000007",
    sampleCode: "002",
    inclusionDate: undefined,
    pins: {},
    alerts: DomainCollection(),
    kpis: {
      Q1: {
        value: "B",
        kpi: { en: "Q1", fr: "Q1" },
        type: "text",
        wording: { en: "Q1", fr: "Q1" },
        specialValue: undefined,
      },
      Q2: {
        value: 9,
        kpi: { en: "Q2", fr: "Q2" },
        type: "text",
        wording: { en: "Q2", fr: "Q2" },
        specialValue: undefined,
      },
    },
  },
  {
    participantCode: "000008",
    sampleCode: "001",
    inclusionDate: undefined,
    pins: {},
    alerts: DomainCollection(),
    kpis: {
      Q1: {
        value: "A",
        kpi: { en: "Q1", fr: "Q1" },
        type: "text",
        wording: { en: "Q1", fr: "Q1" },
        specialValue: undefined,
      },
      Q2: {
        value: 9,
        kpi: { en: "Q2", fr: "Q2" },
        type: "choice",
        wording: { en: "Q2", fr: "Q2" },
        specialValue: undefined,
      },
    },
  },
];

function buildSurvey() {
  const b = new SurveyBuilder();
  b.options({ inclusionVar: "INCL", interviewDateVar: "DATEVAR" });
  b.pageSet("PS1").pages("P1");
  b.page("P1")
    .question("Q1", "Q1", b.types.choice("one", "A", "B", "Z"))
    .required()
    .question("Q2", "Q2", b.types.real);
  return b.build();
}
