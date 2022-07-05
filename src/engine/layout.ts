import { Table } from "../data/surveydataset";
import {
  getItem,
  getTranslation,
  mlstring,
  DomainCollection,
  IDomainCollection,
  Item,
  getItemWording,
  isMLstring,
  PageItem,
} from "../domain/index.js";
import { Modifier, parseComment } from "./modifier.js";

type LayoutType = "main" | "nested";

type LayoutSymbol = {
  symbol:
    | "item"
    | "section"
    | "table"
    | "tableItem"
    | "richItem"
    | "recordset"
    | "recordItem";
  [symbol: string]: mlstring | string[] | undefined;
};

export type MayHaveRecordset<T extends Item, U extends LayoutType> =
  U extends "main" ? RecordsetContent<T> : never;

export type LayoutSection<T extends Item, U extends LayoutType = "main"> = {
  title?: mlstring;
  content: (
    | ItemContent<T>
    | TableContent<T>
    | RichItemContent<T>
    | MayHaveRecordset<T, U>
  )[];
};

export interface Layout<T extends Item, U extends LayoutType = LayoutType> {
  sections: IDomainCollection<LayoutSection<T, U>>;
  getSymbols(layout: Layout<T, U>, item: Item): LayoutSymbol[];
}

type HasClasses = Required<Pick<Modifier, "classes">>;

export type ItemContent<T extends Item> = {
  behavior: "item";
  labels: Pick<Modifier, "comment"> & {
    wording: mlstring;
  };
  modifiers: HasClasses;
  item: T;
};

export type TableContent<T extends Item> = {
  behavior: "table";
  columns: mlstring[];
  items: RowContent<T>[];
};

type RowContent<T extends Item> = {
  wording: mlstring;
  row: CellContent<T>[];
};

type CellContent<T extends Item> = {
  item: T | null;
  modifiers: HasClasses;
} | null;

export type RichItemContent<T extends Item> = {
  behavior: "richItem";
  labels: Pick<Modifier, "comment" | "leftWording" | "rightWording"> & {
    wording: mlstring;
  };
  modifiers: HasClasses;
  item: T;
};

type RecordHeader = {
  wording: mlstring;
  modifiers: HasClasses;
};

export type RecordContent<T extends Item> = (
  | TableContent<T>
  | ItemContent<T>
  | RichItemContent<T>
)[];

export type RecordsetContent<T extends Item> = {
  behavior: "recordset";
  columns: RecordHeader[];
  items: RecordContent<T>[];
};

export function matchRecordsetItem(
  wording: mlstring,
  lang?: string
): LayoutSymbol | undefined {
  if (typeof wording == "string") {
    return matchStringRecordItem(wording, lang);
  } else {
    return matchMLStringRecordItem(wording);
  }
}

function matchStringRecordItem(wording: string, lang: string | undefined) {
  const matches = /^\s*(->) (.+)$/.exec(wording);
  if (matches && matches.length > 1) {
    return {
      symbol: <const>"recordItem",
      column: lang ? { [lang]: matches[2] } : matches[2],
    };
  }
}

function matchMLStringRecordItem(wording: mlstring) {
  const matches = Object.entries(wording)
    .map(([lang, label]) => matchRecordsetItem(label, lang))
    .filter((m): m is LayoutSymbol => !!m);
  if (matches.length > 0) return reduceMLStringRecordItem(matches);
}

function reduceMLStringRecordItem(
  matches: LayoutSymbol[]
): LayoutSymbol | undefined {
  return matches.reduce((result, s) => {
    result.column = {
      ...(result.column as Record<string, string>),
      ...(s.column as Record<string, string>),
    };
    return result;
  });
}

export function matchTableItem(
  wording: mlstring,
  lang?: string
): LayoutSymbol | undefined {
  if (typeof wording == "string") {
    return matchStringTableItem(wording, lang);
  } else {
    return matchMLStringTableItem(wording);
  }
}

function matchStringTableItem(wording: string, lang: string | undefined) {
  const matches = /(\w.+) -> (.+)$/.exec(wording);
  if (matches && matches.length > 2) {
    return {
      symbol: <const>"tableItem",
      wording: lang ? { [lang]: matches[1] } : matches[1],
      column: lang ? { [lang]: matches[2] } : matches[2],
    };
  }
}

function matchMLStringTableItem(wording: mlstring) {
  const matches = Object.entries(wording)
    .map(([lang, label]) => matchTableItem(label, lang))
    .filter((m): m is LayoutSymbol => !!m);
  if (matches.length > 0) return reduceMLStringTableItem(matches);
}

function reduceMLStringTableItem(
  matches: LayoutSymbol[]
): LayoutSymbol | undefined {
  return matches.reduce((result, s) => {
    result.wording = {
      ...(result.wording as Record<string, string>),
      ...(s.wording as Record<string, string>),
    };
    result.column = {
      ...(result.column as Record<string, string>),
      ...(s.column as Record<string, string>),
    };
    return result;
  });
}

export function getMainSymbols<T extends Item>(
  layout: Layout<T, "main">,
  item: Item
): LayoutSymbol[] {
  const symbols: LayoutSymbol[] = [];

  const isSectionStart = addSectionSymbol(layout, item, symbols);
  const isRecordSet = addRecordsetItemSymbol(
    item,
    layout,
    symbols,
    isSectionStart
  );
  if (!isRecordSet) {
    addInnerSymbol(item, layout, symbols, isSectionStart);
  }
  return symbols;
}

function getNestedSymbols<T extends Item>(wording: mlstring) {
  return (layout: Layout<T, "nested">, item: Item) => {
    const symbols: LayoutSymbol[] = [];

    const isSectionStart = addSectionSymbol(layout, item, symbols);
    addInnerSymbol(item, layout, symbols, isSectionStart);

    return symbols.map(s => (s.wording ? Object.assign(s, { wording }) : s));
  };
}

function addInnerSymbol<T extends Item, U extends LayoutType>(
  item: Item,
  layout: Layout<T, U>,
  symbols: LayoutSymbol[],
  isSectionStart: boolean
) {
  const isTable = addTableItemSymbol(item, layout, symbols, isSectionStart);
  if (!isTable) {
    const isRich = addRichItemSymbol(item, symbols);
    if (!isRich) addSingleItem(item, symbols);
  }
}

function addSectionSymbol<T extends Item>(
  layout: Layout<T>,
  item: Item,
  symbols: LayoutSymbol[]
) {
  const lastSectionTitle = getTranslation(layout.sections.last?.title);
  const currentSectionTitle = getTranslation(getItem(item).section) ?? "";
  const startSection =
    layout.sections.length == 0 || lastSectionTitle != currentSectionTitle;
  if (startSection)
    symbols.push({
      symbol: "section",
      title: getItem(item).section ?? "",
    });
  return startSection;
}

function addTableItemSymbol<T extends Item>(
  item: Item,
  layout: Layout<T>,
  symbols: LayoutSymbol[],
  startSection: boolean
) {
  const modifiers = getModifier(getItem(item).comment);
  const contentSymbols = matchTableItem(getItemWording(item));
  if (contentSymbols) {
    addTableSymbol(layout, symbols, startSection);
    symbols.push({ ...(contentSymbols ?? {}), ...(modifiers ?? {}) });
  }
  return !!contentSymbols;
}

function addTableSymbol<T extends Item>(
  layout: Layout<T>,
  symbols: LayoutSymbol[],
  startSection: boolean
) {
  if (startSection) symbols.push({ symbol: "table" });
  else if (!lastContentIsTable(layout))
    symbols.push({ symbol: "table" } as LayoutSymbol);
}

function lastContentIsTable<T extends Item>(layout: Layout<T>) {
  const lastContent = layout.sections.last?.content;
  return lastContent && lastContent[lastContent.length - 1].behavior == "table";
}

function addRecordsetItemSymbol<T extends Item>(
  item: Item,
  layout: Layout<T, "main">,
  symbols: LayoutSymbol[],
  startSection: boolean
) {
  const modifiers = getModifier(getItem(item).comment);
  const contentSymbols = matchRecordsetItem(getItemWording(item));
  if (typeof contentSymbols != "undefined") {
    addRecordSymbol(layout, symbols, startSection);
    symbols.push({ ...contentSymbols, ...(modifiers ?? {}) });
  }
  return !!contentSymbols;
}

function addRecordSymbol<T extends Item>(
  layout: Layout<T, "main">,
  symbols: LayoutSymbol[],
  startSection: boolean
) {
  if (startSection) symbols.push({ symbol: "recordset" });
  else if (!lastContentIsRecord(layout))
    symbols.push({ symbol: "recordset" } as LayoutSymbol);
}

function lastContentIsRecord<T extends Item>(layout: Layout<T, "main">) {
  const lastContent = layout.sections.last?.content;
  return (
    lastContent && lastContent[lastContent.length - 1].behavior == "recordset"
  );
}

function addRichItemSymbol(item: Item, symbols: LayoutSymbol[]) {
  const modifiers = getModifier(getItem(item).comment);
  const isRich = isRichItem(modifiers);
  if (isRich) {
    symbols.push({
      symbol: "richItem",
      ...(modifiers ?? {}),
      wording: getItemWording(item),
    });
  }
  return isRich;
}

function isRichItem(modifiers: Modifier | undefined) {
  return modifiers && (modifiers.leftWording || modifiers.rightWording);
}

function addSingleItem(item: Item, symbols: LayoutSymbol[]) {
  const comment = getItem(item).comment;
  const modifiers = getModifier(comment);
  symbols.push({
    symbol: "item",
    ...(modifiers ?? {}),
    wording: getItemWording(item) ?? "",
  });
}

function getModifier(comment: mlstring | undefined): Modifier | undefined {
  if (typeof comment == "undefined") return undefined;
  return parseComment(comment);
}

export function parseLayout<T extends Item>(
  pageItems: IDomainCollection<T>
): IDomainCollection<LayoutSection<T, "main">> {
  const layout: Layout<T> = {
    sections: DomainCollection<LayoutSection<T>>(),
    getSymbols: getMainSymbols,
  };
  return pageItems.reduce((result, q) => parse<T>(result, q), layout).sections;
}

function parse<T extends Item, U extends LayoutType = "main">(
  result: Layout<T, U>,
  q: Item
) {
  const symbols = result.getSymbols(result, q);
  return symbols.reduce((result, s) => parseSymbol(result, q as T, s), result);
}

function parseSymbol<T extends Item>(result: Layout<T>, q: T, s: LayoutSymbol) {
  const { symbol, ...others } = s;
  switch (symbol) {
    case "section":
      return parseSection(result, others.title as mlstring);
    case "item":
      return parseSingleItem(
        result,
        q,
        others.wording as mlstring,
        others.comment as mlstring,
        others.classes as string[]
      );
    case "richItem":
      return parseRichItem(
        result,
        q,
        others.wording as mlstring,
        others.leftWording as mlstring,
        others.rightWording as mlstring,
        others.comment as mlstring,
        others.classes as string[]
      );
    case "table":
      return parseTable(result);
    case "tableItem":
      return parseTableItem(
        result,
        q,
        others.wording as mlstring,
        others.column as mlstring,
        others.classes as string[]
      );
    case "recordset":
      return parseRecordset(result);
    case "recordItem":
      return parseRecordsetItem(
        result,
        q,
        others.column as mlstring,
        others.classes as string[]
      );
  }
}

export function parseSection<T extends Item>(
  { sections, getSymbols }: Layout<T>,
  title: mlstring
): Layout<T> {
  return {
    sections: sections.append({ title, content: [] }),
    getSymbols,
  };
}

export function parseSingleItem<T extends Item>(
  { sections, getSymbols }: Layout<T>,
  item: T,
  wording: mlstring,
  comment: mlstring,
  classes: string[]
): Layout<T> {
  return {
    sections: sections.update(r => {
      if (r != sections.last) return r;
      r.content.push(singleItem<T>(item, wording, comment, classes));
      return r;
    }),
    getSymbols,
  };
}

function singleItem<T extends Item>(
  item: T,
  wording: mlstring,
  comment: mlstring,
  classes: string[]
): ItemContent<T> {
  return {
    behavior: "item",
    item,
    labels: { comment, wording },
    modifiers: { classes },
  };
}

export function parseTable<T extends Item>({
  sections,
  getSymbols,
}: Layout<T>): Layout<T> {
  return {
    sections: sections.update(r => {
      if (r != sections.last) return r;
      r.content.push({
        behavior: "table",
        columns: [],
        items: [],
      });
      return r;
    }),
    getSymbols,
  };
}

export function parseRecordset<T extends Item>({
  sections,
  getSymbols,
}: Layout<T, "main">): Layout<T, "main"> {
  return {
    sections: sections.update(r => {
      if (r != sections.last) return r;
      r.content.push({
        behavior: "recordset",
        columns: [],
        items: [],
      });
      return r;
    }),
    getSymbols,
  };
}

export function parseTableItem<T extends Item>(
  { sections, getSymbols }: Layout<T>,
  q: T,
  wording: mlstring,
  column: mlstring,
  classes: string[]
): Layout<T> {
  return {
    sections: sections.update(r => {
      if (r != sections.last) return r;
      const { array, lastRow, colIndex } = getArray<T, "table">(r, column);
      if (isNewRow<T>(lastRow, wording))
        parseRow<T>(array, wording, colIndex, q, classes);
      else parseCell<T>(lastRow, colIndex, q, classes);
      return r;
    }),
    getSymbols,
  };
}

export function parseRecordsetItem<T extends Item>(
  { sections, getSymbols }: Layout<T, "main">,
  q: T,
  column: mlstring,
  classes: string[]
): Layout<T, "main"> {
  return {
    sections: sections.update(r => {
      if (r != sections.last) return r;
      const header = { wording: column, modifiers: { classes } };
      const { array, colIndex } = getArray<T, "recordset">(r, header);
      if (isNewRecord<T>(array.items, q))
        parseRecord<T>(array, column, colIndex, q);
      else parseMember<T>(array, column, colIndex, q);
      return r;
    }),
    getSymbols,
  };
}

type A<T extends Item, U extends "table" | "recordset"> = {
  array: U extends "table" ? TableContent<T> : RecordsetContent<T>;
  lastRow: U extends "table" ? RowContent<T> : RecordContent<T>;
  colIndex: number;
};

function getArray<T extends Item, U extends "table" | "recordset">(
  r: LayoutSection<T>,
  column: U extends "table" ? mlstring : RecordHeader
): A<T, U> {
  const array = r.content[r.content.length - 1] as A<T, U>["array"];
  const lastRow = array.items[array.items.length - 1] as A<T, U>["lastRow"];
  const colIndex = findColumn(array.columns, column);
  return { array, lastRow, colIndex };
}

function findColumn(
  columns: mlstring[] | RecordHeader[],
  column: mlstring | RecordHeader
): number {
  const col = columns.findIndex(
    (c: mlstring | RecordHeader) =>
      getTranslation(isMLstring(c) ? c : c.wording) ==
      getTranslation(isMLstring(column) ? column : column.wording)
  );
  if (col > -1) return col;
  (columns as typeof column[]).push(column);
  return columns.length - 1;
}

export function parseRichItem<T extends Item>(
  { sections, getSymbols }: Layout<T>,
  item: T,
  wording: mlstring,
  leftWording: mlstring,
  rightWording: mlstring,
  comment: mlstring,
  classes: string[]
): Layout<T> {
  return {
    sections: sections.update(r => {
      if (r != sections.last) return r;
      r.content.push(
        richItem(item, leftWording, rightWording, comment, wording, classes)
      );
      return r;
    }),
    getSymbols,
  };
}

function richItem<T extends Item>(
  item: T,
  leftWording: mlstring,
  rightWording: mlstring,
  comment: mlstring,
  wording: mlstring,
  classes: string[]
): RichItemContent<T> {
  return {
    behavior: "richItem",
    item,
    labels: {
      leftWording,
      rightWording,
      comment,
      wording,
    },
    modifiers: { classes },
  };
}

function isNewRow<T extends Item>(
  lastContent: RowContent<T>,
  wording: mlstring
) {
  return (
    !lastContent ||
    getTranslation(lastContent.wording) != getTranslation(wording)
  );
}

function isNewRecord<T extends Item>(items: RecordContent<T>[], item: T) {
  return getItem(item).instance > items.length;
}

function parseRow<T extends Item>(
  table: TableContent<T>,
  wording: mlstring,
  colIndex: number,
  q: T,
  classes: string[]
) {
  const row = { wording, row: new Array(table.columns.length).fill(null) };
  row.row[colIndex] = {
    item: q,
    modifiers: { classes },
  };
  table.items.push(row);
}

function parseRecord<T extends Item>(
  table: RecordsetContent<T>,
  wording: mlstring,
  colIndex: number,
  q: T
) {
  const item = getItem(q);
  while (table.items.length < item.instance) {
    const row = new Array(table.columns.length).fill(null);
    table.items.push(row);
  }
  parseMember(table, wording, colIndex, q);
}

function parseCell<T extends Item>(
  lastContent: RowContent<T>,
  colIndex: number,
  q: T,
  classes: string[]
) {
  while (colIndex >= lastContent.row.length) lastContent.row.push(null);
  lastContent.row[colIndex] = {
    item: q,
    modifiers: { classes },
  };
}

function parseMember<T extends Item>(
  array: RecordsetContent<T>,
  wording: mlstring,
  colIndex: number,
  q: T
) {
  const item = getItem(q);
  const sections = getNestedSections<T>(array, colIndex, item);
  const nestedLayout = getNestedLayout<T>(sections, wording);
  const result = parse(nestedLayout, q);
  const section = result.sections[0];
  array.items[item.instance - 1][colIndex] = section.content[0];
}

function getNestedSections<T extends Item>(
  array: RecordsetContent<T>,
  colIndex: number,
  item: PageItem
): IDomainCollection<LayoutSection<T, "nested">> {
  return colIndex > 0 &&
    array.items[item.instance - 1][colIndex - 1]?.behavior == "table"
    ? DomainCollection({
        title: item.section ?? "",
        content: [array.items[item.instance - 1][colIndex - 1]],
      })
    : DomainCollection();
}

function getNestedLayout<T extends Item>(
  sections: IDomainCollection<LayoutSection<T, "nested">>,
  wording: mlstring
): Layout<T, "nested"> {
  const word = (matchTableItem(wording)?.wording as mlstring) ?? wording;
  return {
    sections,
    getSymbols: getNestedSymbols(word),
  };
}
