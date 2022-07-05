import {
  formatCode,
  getItem,
  getItemType,
  getItemUnits,
  getTranslation,
  Interview,
  InterviewItem,
  Item,
  Page,
  Participant,
  Survey,
  SurveyOptions,
} from "../domain/index.js";
import { IRow, Elements, ITable, ITableSet, Header } from "./dataset.js";

export class Row implements IRow {
  readonly participantCode: string;
  readonly nonce: number;
  readonly elements: Elements;

  constructor(
    readonly participant: Participant,
    readonly interview: Interview,
    source: Page | { page: Page; instance: number },
    ...prepend: unknown[]
  ) {
    this.participantCode = participant.participantCode;
    this.nonce = interview.nonce;
    const page = source instanceof Page ? source : source.page;
    const instance = source instanceof Page ? 1 : source.instance;
    this.elements = [
      ...prepend,
      interview.date,
      ...page.items
        .filter(i => isExported(i))
        .map(
          i =>
            interview.getItemForVariable(
              getItem(i).variableName,
              instance
            ) as InterviewItem
        )
        .reduce((res, i) => {
          const units = i ? getItemUnits(i) : [];
          return res.concat(
            units.length > 0
              ? [
                  Row.format(interview, page, i),
                  i?.unit ?? units.length == 1 ? units[0] : "",
                ]
              : Row.format(interview, page, i)
          );
        }, [] as (string | number | undefined)[]),
    ];
  }

  private static format(
    interview: Interview,
    page: Page,
    item: InterviewItem
  ): number | string | undefined {
    if (item?.pageItem.array && !page.array)
      return Row.formatArray(item, interview);
    return Row.formatSingle(item);
  }

  private static formatArray(item: InterviewItem, interview: Interview) {
    const result = [Row.formatSingle(item)];
    while (interview.hasNextInstance(item)) {
      item = interview.nextInstance(item) as InterviewItem;
      result.push(Row.formatSingle(item));
    }
    return JSON.stringify(result);
  }

  private static formatSingle(
    item: InterviewItem | undefined
  ): number | string | undefined {
    if (typeof item?.value == "undefined") return item?.specialValue;
    return item.type.rawValue(item.value);
  }
}

export class RowSet {
  readonly rows: ReadonlyArray<Row>;
  readonly header: Header;

  constructor(readonly participant: Participant, page: Page, options?: SurveyOptions) {
    this.rows = [
      ...participant.interviews
        .filter(i => i.pageSet.pages.includes(page))
        .flatMap((i, x) => this.getRows(participant, i, page, x, options)),
    ];
    this.header = getHeader(page, options?.unitSuffix);
  }

  private getRows(
    participant: Participant,
    interview: Interview,
    page: Page,
    x: number,
    options?: SurveyOptions
  ): Row[] {
    const code = getTranslation(
      interview.pageSet.type,
      "__code__",
      options?.defaultLang
    );
    if (!page.array)
      return [
        new Row(
          participant,
          interview,
          page,
          participant.sample.sampleCode,
          formatCode(participant, options),
          x,
          code
        ),
      ];
    const count = Math.max(
      ...interview.getItemsForPage(page).map(i => i.pageItem.instance)
    );
    const rows = new Array<Row>();
    for (let instance = 1; instance <= count; instance++)
      rows.push(
        new Row(
          participant,
          interview,
          { page, instance },
          participant.sample.sampleCode,
          formatCode(participant, options),
          x,
          code,
          instance
        )
      );
    return rows;
  }

  union(other: RowSet): RowSet {
    const header = unionHeader(this.header, other.header);
    const rows = this.mapToHeader(header).concat(
      other.mapToHeader(header, this.rows.length)
    );
    const result = Object.create(RowSet.prototype);
    return Object.assign(result, { rows, header });
  }

  private mapToHeader(header: Header, offset = 0): ReadonlyArray<Row> {
    return this.rows.map((r, x) => {
      const elements = header.map(h => {
        const i = this.header.indexOf(h);
        return i > -1 ? (i == 2 ? offset + x : r.elements[i]) : undefined;
      });
      const row = Object.create(Row.prototype);
      return Object.assign(row, { ...r, elements });
    });
  }
}

export class Table implements ITable {
  readonly rowSets: ReadonlyArray<RowSet>;
  readonly name: string;
  readonly header: Header;

  constructor(
    readonly participants: ReadonlyArray<Participant>,
    page: Page,
    options?: SurveyOptions
  ) {
    this.rowSets = (<RowSet[]>[]).concat(
      ...participants.map(p => new RowSet(p, page, options))
    );
    this.name =
      page.exportConfig?.fileName ??
      (getTranslation(page.name, "__code__", options?.defaultLang) as string);
    this.header = getHeader(page, options?.unitSuffix);
  }

  zip(other: Table): Table {
    const header = unionHeader(this.header, other.header);
    const rowSets = this.rowSets.map((s, i) => s.union(other.rowSets[i]));
    const result = Object.create(Table.prototype);
    return Object.assign(result, {
      participants: this.participants,
      rowSets,
      name: this.name,
      header,
    });
  }

  get rows(): ReadonlyArray<Row> {
    return (<Row[]>[]).concat(...this.rowSets.map(r => r.rows));
  }
}

export class SurveyTableSet implements ITableSet {
  readonly tables: ReadonlyArray<ITable>;
  readonly name: string;
  readonly locale?: string;

  constructor(
    readonly survey: Survey,
    readonly participants: ReadonlyArray<Participant>,
    lang = survey.options.defaultLang
  ) {
    this.locale = lang;
    const pages = this.getPages();
    const tables = pages.map(
      p =>
        new Table(this.participants, p, {
          ...this.survey.options,
          defaultLang: lang,
        })
    );
    this.tables = this.zipSets(tables);
    this.name = survey.name;
  }

  private getPages() {
    const sets = this.survey.pageSets.reduce(
      (s, p) => new Set([...s, ...p.pages]),
      new Set<Page>()
    );
    return [...sets];
  }

  private zipSets(tables: Table[]) {
    const sets = tables.reduce((m, t) => {
      if (m.has(t.name)) m.get(t.name)?.push(t);
      else m.set(t.name, [t]);
      return m;
    }, new Map<string, Table[]>());
    return [...sets.values()].map(a => a.reduce((b, t) => b.zip(t)));
  }
}

function getHeader(page: Page, unitSuffix?: string): Header {
  return [
    "SAMPLECODE",
    "PATCODE",
    "OCCURRENCE",
    "VTYPE",
    ...(page.array ? ["RECORD"] : []),
    "VDATE",
    ...page.items
      .filter(
        i =>
          getItemType(i).name != "info" &&
          getItem(i).variableName != "VDATE" &&
          isExported(i)
      )
      .reduce((res, i) => {
        const item = getItem(i);
        return res.concat(
          (item.units?.values.length as number) > 0
            ? [
                item.variableName,
                `${item.variableName}${unitSuffix ?? "_UNIT"}`,
              ]
            : item.variableName
        );
      }, [] as string[]),
  ];
}

function unionHeader(header0: Header, header1: Header): Header {
  return header0.concat(header1.filter(h => !header0.includes(h)));
}

export function isExported(i: Item): unknown {
  return (
    getItemType(i).name != "info" &&
    getItem(i).variableName != "VDATE" &&
    !/^__.+/.test(getItem(i).variableName)
  );
}
