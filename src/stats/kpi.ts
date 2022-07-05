import {
  IDomainCollection,
  mlstring,
  Sample,
  SpecialValue,
  Survey,
  TypeArgs,
} from "../domain/index.js";
import { IParticipantSummary } from "./summary.js";

export type Value = Date | number | mlstring | undefined;

export type Json = Record<string, unknown>;

export type ItemJson = Record<
  string,
  {
    value: Value;
    kpi?: mlstring;
    pin?: mlstring;
    type: mlstring;
    wording: mlstring;
    specialValue: SpecialValue;
  }
>;

export type DataSource = {
  row: {
    variableName: string;
    label: mlstring;
    values: (Value | SpecialValue)[];
    type: TypeArgs;
  };
  column: {
    variableName: string;
    label: mlstring;
    values: (Value | SpecialValue)[];
    type: TypeArgs;
  };
};

export interface IKPI {
  readonly title: mlstring;
  readonly values: number[][];

  readonly columnSums: number[][];
  readonly rowSums: number[][];

  readonly datasource: DataSource;
}

export type KPIArgs = {
  name: KPIName;
  [name: string]: unknown;
};

export type KPIName =
  | "QueriesBySamples"
  | "UniVariateCategoricalAnalysis"
  | "UniVariateNumericalAnalysis"
  | "InclusionsBySamples";

export function getColumnSums(values: number[][]): number[][] {
  return [values.reduce((s, row) => s.map((v, i) => v + row[i]))];
}

export function getRowSums(values: number[][]): number[][] {
  return values.map(row => [row.reduce((s, v) => s + v, 0)]);
}

export class InclusionsBySamples implements IKPI {
  readonly values: number[][];
  readonly datasource: DataSource;

  constructor(
    readonly survey: Survey,
    readonly samples: IDomainCollection<Sample>,
    readonly participants: IDomainCollection<IParticipantSummary>,
    readonly title: mlstring = {
      en: "Inclusions by samples",
      fr: "Inclusions par centres",
    },
    rowLabel: mlstring = { en: "Dates", fr: "Dates" },
    columnLabel: mlstring = {
      en: "Number of inclusions by samples",
      fr: "Nombre d'inclusions par centres",
    }
  ) {
    const columnIndexes = [...this.samples.map(s => s.sampleCode)];
    const rowIndexes = this.getRowIndexes();
    this.datasource = {
      row: {
        variableName: "@INDATE",
        label: rowLabel,
        values: rowIndexes,
        type: { name: "date", nature: "numerical" },
      },
      column: {
        variableName: "@SAMPLE",
        label: columnLabel,
        values: columnIndexes,
        type: { name: "text", nature: "categorical" },
      },
    };
    this.values = this.getValues();
  }

  private getRowIndexes() {
    const rowIndexes: number[] = [];
    for (const p of this.participants) {
      const d = this.getInclusionDate(p);
      if (typeof d == "number") rowIndexes.push(d);
    }
    rowIndexes.sort((a, b) => a - b);
    return rowIndexes.filter((v, i, arr) => i == 0 || v != arr[i - 1]);
  }

  private getInclusionDate(p: IParticipantSummary) {
    return typeof p.inclusionDate == "number"
      ? p.inclusionDate
      : p.inclusionDate != undefined
      ? new Date(p.inclusionDate).getTime()
      : undefined;
  }

  private getValues() {
    return this.datasource.row.values.map(ri =>
      this.datasource.column.values.map(
        ci =>
          this.participants.filter(
            p =>
              p.sampleCode == ci &&
              new Date(p.inclusionDate as number).getTime() == ri
          ).length
      )
    );
  }

  get columnSums(): number[][] {
    return getColumnSums(this.values);
  }
  get rowSums(): number[][] {
    return getRowSums(this.values);
  }
}
