import {
  hasFixedLabels,
  ItemType,
  mlstring,
  PageItem,
  Survey,
  TypeArgs,
  WithFixedLabels,
} from "../domain/index.js";
import { Metadata } from "../engine/index.js";
import { DataSource, getColumnSums, getRowSums, IKPI, Value } from "./kpi.js";
import { IParticipantSummary } from "./summary.js";
import { percentiles } from "./stats.js";

type Margin = {
  rawValues: unknown[];
  values: (string | undefined)[];
  modalities: string[];
  percentiles?: number[];
  variableName: string;
  label: mlstring;
  type: TypeArgs;
  nature: "categorical" | "numerical";
};

type Row = [...(string | undefined)[], number];

function splitRow(r: Row): { values: (string | undefined)[]; count: number } {
  return {
    values: r.slice(0, -1) as (string | undefined)[],
    count: r[r.length - 1] as number,
  };
}

export type KpiSetOptions = {
  sample?: boolean;
};

const defaultKpiSetOptions: KpiSetOptions = {
  sample: false,
};

export class KPISet {
  readonly margins: Map<string, Margin>;
  readonly data: Row[];

  constructor(
    readonly survey: Survey,
    summaries: IParticipantSummary[],
    options: KpiSetOptions = {}
  ) {
    options = Object.assign({}, defaultKpiSetOptions, options);
    this.margins = this.getMargins(summaries, options);
    this.data = this.getData(summaries);
  }

  get variableNames(): string[] {
    return [...this.margins.keys()];
  }

  select(...variableNames: string[]): KPISet {
    const { indexes, margins } = this.selectMargins(variableNames);
    const data = this.selectData(indexes);
    const projected = Object.create(KPISet.prototype);
    Object.assign(projected, { survey: this.survey, margins, data });
    return projected;
  }

  getMatrix(rowVariable: string, colVariable: string): IKPI {
    const rowMargin = this.margins.get(rowVariable) as Margin;
    const colMargin = this.margins.get(colVariable) as Margin;
    if (colMargin.nature == "categorical")
      return new CategoricalDistribution(
        rowMargin,
        colMargin,
        this.select(rowVariable, colVariable).data
      );
    return new NumericalDistribution(rowMargin, colMargin);
  }

  private getData(summaries: IParticipantSummary[]) {
    const data = new Map<string, Row>();
    for (let i = 0; i < summaries.length; i++) {
      const values = this.getValuesFromMargins(i);
      this.pushOrIncr(data, values);
    }
    return [...data.values()].sort((a, b) => this.compareRows(a, b));
  }

  private getMargins(summaries: IParticipantSummary[], options: KpiSetOptions) {
    const margins: Map<string, Margin> = new Map();
    this.setRawValues(summaries, margins, options);
    this.setValues(margins);
    return margins;
  }

  private selectData(indexes: number[]) {
    const data = new Map<string, Row>();
    for (const row of this.data) {
      const { values, count } = splitRow(row);
      const projected = indexes.map(i => values[i]);
      this.pushOrIncr(data, projected, count);
    }
    return [...data.values()].sort((a, b) => this.compareRows(a, b));
  }

  private selectMargins(variableNames: string[]) {
    const margins = new Map<string, Margin>();
    const indexes: number[] = [];
    const indexedMargins = Object.entries([...this.margins.entries()]);
    const filteredMargins = variableNames.map(
      v => indexedMargins.find(([, [m]]) => m == v) as typeof indexedMargins[0]
    );
    for (const [i, [variableName, margin]] of filteredMargins)
      if (variableNames.includes(variableName)) {
        indexes.push(Number(i));
        margins.set(variableName, margin);
      }
    return { indexes, margins };
  }

  private getValuesFromMargins(i: number) {
    const values: (string | undefined)[] = [];
    for (const margin of this.margins.values()) {
      values.push(margin.values[i]);
    }
    return values;
  }

  private pushOrIncr(
    data: Map<string, Row>,
    values: (string | undefined)[],
    count = 1
  ) {
    const key = JSON.stringify(values);
    const row = data.get(key);
    if (typeof row == "undefined") data.set(key, this.initRow(values, count));
    else data.set(key, this.incrRow(row, count));
  }

  private initRow(values: (string | undefined)[], count = 1): Row {
    return [...values, count];
  }

  private incrRow(row: Row, incr = 1): Row {
    const { values, count } = splitRow(row);
    return [...values, count + incr];
  }

  private compareRows(a: Row, b: Row): number {
    const aValues = splitRow(a).values;
    const bValues = splitRow(b).values;
    return aValues.reduce<number>(
      (r, v, i) => r || this.compareValue(v, bValues[i]),
      0
    );
  }

  private compareValue(a: string | undefined, b: string | undefined) {
    if (typeof a == "undefined") return typeof b == "undefined" ? 0 : -1;
    if (typeof b == "undefined") return 1;
    return a.localeCompare(b);
  }

  private setRawValues(
    summaries: IParticipantSummary[],
    margins: Map<string, Margin>,
    options: KpiSetOptions
  ) {
    if (options.sample) {
      for (const [i, summary] of Object.entries(summaries)) {
        this.addRawValue(
          margins,
          "@SAMPLE",
          Number(i),
          { en: "sample", fr: "centre" },
          summary.sampleCode
        );
      }
    }
    for (const [i, summary] of Object.entries(summaries)) {
      for (const variableName in summary.kpis) {
        this.addRawValue(
          margins,
          variableName,
          Number(i),
          summary.kpis[variableName].kpi as mlstring,
          summary.kpis[variableName].value ??
            summary.kpis[variableName].specialValue
        );
      }
    }
    for (const margin of margins.values()) {
      const missing = Array(summaries.length - margin.rawValues.length).fill(
        undefined
      );
      margin.rawValues.push(...missing);
    }
  }

  private addRawValue(
    margins: Map<string, Margin>,
    variableName: string,
    index: number,
    label: mlstring,
    value: Value
  ) {
    const margin = margins.get(variableName) ?? {
      rawValues: [],
      values: [],
      modalities: [],
      variableName,
      label,
      type: {} as TypeArgs,
      nature: "categorical",
    };
    const missing = Array(index - margin.rawValues.length).fill(undefined);
    margin.rawValues.push(...missing, value);
    margins.set(variableName, margin);
  }

  private setValues(margins: Map<string, Margin>) {
    for (const [variableName, margin] of margins.entries()) {
      const [mainVariable] = variableName.split("|");
      const pageItem = this.survey.getItemForVariable(mainVariable);
      margin.type = {
        ...(pageItem?.type ?? { name: "text" }),
      } as TypeArgs;
      margin.nature = pageItem?.type.nature || "categorical";
      if (margin.nature == "numerical") this.setNumericalValues(margin);
      else this.setCategoricalValues(margin, pageItem as PageItem);
    }
  }

  private setCategoricalValues(margin: Margin, pageItem: PageItem | undefined) {
    margin.values = margin.rawValues.map(v =>
      typeof v == "undefined" ? undefined : String(v)
    );
    if (pageItem && hasFixedLabels(pageItem.type))
      this.setFixedModalities(margin, pageItem);
    else this.setComputedModalities(margin);
    margin.type.nature = "categorical";
  }

  private setComputedModalities(margin: Margin) {
    margin.modalities = margin.values
      .filter((v): v is string => typeof v != "undefined")
      .sort((a, b) => a.localeCompare(b))
      .filter((v, i, arr) => i == 0 || arr[i - 1] != v);
  }

  private setFixedModalities(
    margin: Margin,
    pageItem: PageItem<"prototype" | "instance">
  ) {
    margin.modalities = (
      pageItem.type as ItemType & WithFixedLabels
    ).rawValues.map(v => String(v));
    if (!new Metadata(pageItem, this.survey.rules).required)
      margin.modalities.push("notApplicable", "notDone", "unknown");
  }

  private setNumericalValues(margin: Margin) {
    const quartiles = percentiles(
      margin.rawValues.filter((v): v is number => typeof v == "number")
    );
    margin.modalities = this.getModalities(quartiles);
    margin.values = this.getValues(
      margin.rawValues as (number | undefined)[],
      margin.modalities,
      quartiles
    );
    margin.percentiles = quartiles;
    margin.type.nature = "numerical";
  }

  private getValues(
    rawValues: (number | undefined)[],
    modalities: string[],
    quartiles: number[]
  ) {
    return rawValues.map(v => {
      if (typeof v == "undefined") return undefined;
      const index = quartiles.slice(1).findIndex(i => i > (v as number));
      return modalities[index > -1 ? index : modalities.length - 1];
    });
  }

  private getModalities(indexes: number[]) {
    return indexes
      .map((q, i, arr) => (i > 0 ? [arr[i - 1], q] : []))
      .slice(1)
      .map((limits, i) => this.getModality(limits, i, indexes.length - 2));
  }

  private getModality(
    limits: number[],
    quantile: number,
    last: number
  ): string {
    const interval = `${limits[0]}, ${limits[1]}`;
    const closing = quantile == last ? "]" : ")";
    return `Q${quantile + 1}: [${interval}${closing}`;
  }
}

class AbstractKpi implements Pick<IKPI, "title" | "datasource"> {
  title: mlstring;
  datasource: DataSource;

  constructor(protected rowMargin: Margin, protected colMargin: Margin) {
    this.title = colMargin.label;
    this.datasource = {
      row: {
        variableName: rowMargin.variableName,
        label: rowMargin.label,
        values: rowMargin.modalities,
        type: rowMargin.type,
      },
      column: {
        variableName: colMargin.variableName,
        label: colMargin.label,
        values: colMargin.modalities,
        type: colMargin.type,
      },
    };
  }
}

export class CategoricalDistribution extends AbstractKpi implements IKPI {
  values: number[][];
  columnSums: number[][];
  rowSums: number[][];

  constructor(rowMargin: Margin, colMargin: Margin, data: Row[]) {
    super(rowMargin, colMargin);
    this.values = this.rowMargin.modalities.map(r =>
      this.colMargin.modalities.map(c => {
        const row = data.find(d => d[0] == r && d[1] == c);
        return row ? splitRow(row).count : 0;
      })
    );
    this.rowSums = getRowSums(this.values);
    this.columnSums = getColumnSums(this.values);
  }
}

export class NumericalDistribution extends AbstractKpi implements IKPI {
  values: number[][];
  columnSums: number[][];
  rowSums: number[][];

  constructor(rowMargin: Margin, colMargin: Margin) {
    super(rowMargin, colMargin);
    this.values = rowMargin.modalities.map(mod => {
      const values = colMargin.rawValues.filter(
        (v, i): v is number =>
          rowMargin.rawValues[i] == mod && typeof v == "number"
      );
      return percentiles(values);
    });
    this.rowSums = this.values.map(v => [v[2]]);
    this.columnSums = [colMargin.percentiles as number[]];
    this.datasource.column.values = ["min", "Q1", "median", "Q3", "max"];
  }
}
