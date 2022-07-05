export type Elements = ReadonlyArray<unknown>;
export type Header = ReadonlyArray<string>;

export interface IRow {
  readonly participantCode: string;
  readonly nonce: number;
  readonly elements: Elements;
}

export interface ITable {
  readonly name: string;
  readonly header: Header;
  readonly rows: ReadonlyArray<IRow>;
}

export interface ITableSet {
  readonly name: string;
  readonly locale?: string;
  readonly tables: ReadonlyArray<ITable>;
}
