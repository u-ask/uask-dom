import { getTranslation, setTranslation, mlstring } from "./domain.js";
import { HasContext } from "./pageitem.js";

export type WithFixedLabels = {
  labels: mlstring[];
  rawValues: unknown[];
};

export function hasFixedLabels(i: ItemType): i is ItemType & WithFixedLabels {
  if (!isamplemType(i)) return false;
  const o = i as { labels?: mlstring[] };
  return Array.isArray(o.labels);
}

export interface ItemType {
  name: string;
  nature?: "categorical" | "numerical";
  label(value: unknown, lang?: string): string | undefined;
  rawValue(value: unknown): string | number | undefined;
  typedValue(value: unknown, ctx?: unknown): unknown;
}

export function isamplemType(o: unknown): o is ItemType {
  if (typeof o != "object" || o === null) return false;
  return "label" in Object.getPrototypeOf(o) && "name" in o;
}

export class TextType implements ItemType {
  readonly name = "text";

  label(value: unknown, lang?: string): string | undefined {
    return typeof value == "undefined"
      ? undefined
      : getTranslation(value as mlstring, lang);
  }

  rawValue(value: unknown): string {
    return String(value);
  }

  typedValue(value: unknown): unknown {
    return value ?? undefined;
  }
}

export class ImageType implements ItemType {
  readonly name = "image";

  label(): string {
    return "Image";
  }

  rawValue(): undefined {
    return undefined;
  }

  typedValue(value: unknown): unknown {
    return value ?? undefined;
  }
}

abstract class AbstractNumberType implements ItemType {
  abstract readonly name: string;
  readonly nature: "numerical" | "categorical" = "numerical";
  protected readonly constr = Object.getPrototypeOf(this).constructor;

  constructor() {
    Object.defineProperty(this, "constr", { enumerable: false });
  }

  label(value: unknown, lang?: string): string | undefined {
    return typeof value == "undefined"
      ? undefined
      : (value as number).toLocaleString(lang);
  }

  rawValue(value: string | number): number {
    return typeof value == "string" ? parseFloat(value) : value;
  }

  typedValue(value: unknown): unknown {
    return value == undefined ? undefined : Number(value);
  }
}

export class RealType extends AbstractNumberType {
  readonly name = "real";
}

export class IntegerType extends AbstractNumberType {
  readonly name = "integer";

  typedValue(value: unknown): unknown {
    return value ?? undefined;
  }
}

export class DateType implements ItemType {
  readonly name = "date";
  constructor(
    readonly incomplete: boolean = false,
    readonly month: boolean = false
  ) {}

  label(value: unknown): string | undefined {
    return this.incomplete
      ? (value as string | undefined)
      : value instanceof Date
      ? new Date(Math.round(value.getTime() / 86400000) * 86400000)
          .toISOString()
          .substring(0, 10)
      : typeof value == "string"
      ? this.label(new Date(value))
      : (value as string | undefined);
  }

  rawValue(value: string | number | Date): string | undefined {
    return this.label(value);
  }

  typedValue(value: unknown): unknown {
    if (value == undefined) return undefined;
    if (this.incomplete && typeof value == "string") return value;
    if (this.incomplete && typeof value == "number") return String(value);
    return new Date(value as number | string | Date);
  }
}

export class TimeType implements ItemType {
  readonly name = "time";
  constructor(readonly duration: boolean = false) {}

  label(value: unknown): string | undefined {
    return this.duration
      ? typeof value == "number"
        ? this.formatTime(value)
        : (value as string | undefined)
      : value instanceof Date
      ? value.toLocaleTimeString("fr-FR").substring(0, 5)
      : typeof value == "string" && new Date(value).toString() != "Invalid Date"
      ? new Date(value).toLocaleTimeString("fr-FR").substring(0, 5)
      : (value as string | undefined);
  }

  rawValue(value: string | Date | number): string | undefined {
    return this.label(value);
  }

  typedValue(value: unknown): unknown {
    return value ?? undefined;
  }

  formatTime(time: number): string {
    const min = time % 60;
    const h = (time - min) / 60;
    if (h > 24) {
      const hModulus = h % 24;
      const j = (h - hModulus) / 24;
      if (j > 7) {
        const jModulus = j % 7;
        const w = (j - jModulus) / 7;
        return `${w}w${jModulus}j${hModulus}h${min}min`;
      }
      return `${j}j${hModulus}h${min}min`;
    }
    return `${h}h${min}min`;
  }
}

export class YesNoType implements ItemType, WithFixedLabels {
  readonly name = "yesno";
  readonly nature = "categorical";
  readonly labels = [
    { __code__: "0", en: "No", fr: "Non" },
    { __code__: "1", en: "Yes", fr: "Oui" },
  ];
  readonly rawValues = [0, 1];

  label(
    value: boolean | number | undefined,
    lang?: string
  ): string | undefined {
    return typeof value == "undefined"
      ? undefined
      : getTranslation(this.labels[Number(value) ? 1 : 0], lang);
  }

  rawValue(value: unknown): number {
    return (typeof value == "string" ? parseInt(value) : value) ? 1 : 0;
  }

  typedValue(value: unknown): unknown {
    return value == undefined ? undefined : value ? 1 : 0;
  }
}

export class ScoreType extends AbstractNumberType implements WithFixedLabels {
  readonly name = "score";
  readonly nature = "categorical";
  readonly rawValues: unknown[];

  constructor(
    readonly scores: number[],
    readonly defaultLang?: string,
    readonly labels: mlstring[] = scores.map(s => ({
      __code__: String(s),
      [defaultLang ?? "en"]: String(s),
    }))
  ) {
    super();
    this.rawValues = scores;
  }

  lang(lang: string): this {
    return new this.constr(this.scores, lang, this.labels);
  }

  wording(...labels: string[]): this {
    return this.translate(this.defaultLang ?? "en", ...labels);
  }

  translate(lang: string, ...labels: string[]): this {
    return new this.constr(
      this.scores,
      this.defaultLang,
      this.labels?.map((l, i) =>
        setTranslation(this.defaultLang ?? "en")(l, lang, labels[i])
      )
    );
  }

  private getLabel(value: number, lang?: string): string | undefined {
    const ix = this.scores.indexOf(value);
    return getTranslation(this.labels?.[ix], lang);
  }

  label(value: number, lang?: string): string | undefined {
    return !this.scores.includes(value)
      ? undefined
      : this.getLabel(value, lang);
  }
}

function range(min: number, max: number) {
  const r: number[] = [];
  for (let i = min; i <= max; i++) {
    r.push(i);
  }
  return r;
}

export class ScaleType extends AbstractNumberType implements WithFixedLabels {
  readonly name = "scale";
  readonly rawValues: unknown[];

  constructor(
    readonly min: number,
    readonly max: number,
    readonly defaultLang?: string,
    readonly labels: mlstring[] = range(min, max).map(s => ({
      __code__: String(s),
      [defaultLang ?? "en"]: String(s),
    }))
  ) {
    super();
    this.rawValues = range(min, max);
  }

  lang(lang: string): this {
    return new this.constr(this.min, this.max, lang, this.labels);
  }

  wording(...labels: string[]): this {
    return this.translate(this.defaultLang ?? "en", ...labels);
  }

  translate(lang: string, ...labels: string[]): this {
    return new this.constr(
      this.min,
      this.max,
      this.defaultLang,
      this.labels?.map((l, i) =>
        setTranslation(this.defaultLang ?? "en")(l, lang, labels[i])
      )
    );
  }

  private getLabel(value: number, lang?: string): string | undefined {
    return getTranslation(this.labels?.[value], lang);
  }

  label(value: number, lang?: string): string | undefined {
    return value < this.min || value > this.max
      ? undefined
      : this.getLabel(value, lang);
  }
}

export class ChoiceType implements ItemType, WithFixedLabels {
  readonly name: string = "choice";
  readonly nature = "categorical";
  readonly rawValues: unknown[];

  constructor(
    readonly multiplicity: "one" | "many",
    readonly choices: string[],
    readonly defaultLang?: string,
    readonly labels: mlstring[] = choices.map(c => ({
      __code__: c,
      [defaultLang ?? "en"]: c,
    }))
  ) {
    this.rawValues = choices;
  }

  lang(lang: string): ChoiceType {
    const constr = Object.getPrototypeOf(this).constructor;
    return new constr(this.multiplicity, this.choices, lang, this.labels);
  }

  wording(...labels: string[]): ChoiceType {
    return this.translate(this.defaultLang ?? "en", ...labels);
  }

  translate(lang: string, ...labels: string[]): ChoiceType {
    const constr = Object.getPrototypeOf(this).constructor;
    return new constr(
      this.multiplicity,
      this.choices,
      this.defaultLang,
      this.labels.map((l, i) =>
        setTranslation(this.defaultLang ?? "en")(l, lang, labels[i])
      )
    );
  }

  private getLabel(value: string, lang?: string): string | undefined {
    const i = this.choices.indexOf(value);
    return i == -1 ? undefined : getTranslation(this.labels[i], lang);
  }

  label(value: unknown, lang?: string): string | undefined {
    return typeof value == "undefined"
      ? undefined
      : Array.isArray(value)
      ? value.map(v => this.getLabel(v, lang)).join(", ")
      : this.getLabel(value as string, lang);
  }

  rawValue(value: unknown): string {
    return String(value);
  }

  typedValue(value: unknown): unknown {
    return value ?? undefined;
  }
}

export class GlossaryType extends ChoiceType {
  readonly name: string = "glossary";
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CountryType extends GlossaryType {}

export class CountryType {
  constructor(multiplicity: "one" | "many", readonly defaultLang?: string) {
    return new GlossaryType(
      multiplicity,
      ["FRA", "BEL", "ESP", "ITA"],
      defaultLang,
      [
        { __code__: "FRA", en: "France", fr: "France" },
        { __code__: "BEL", en: "Belgium", fr: "Belgique" },
        { __code__: "ESP", en: "Spain", fr: "Espagne" },
        { __code__: "ITA", en: "Italy", fr: "Italie" },
      ]
    );
  }
}

export class AcknowledgeType implements ItemType, WithFixedLabels {
  readonly name = "acknowledge";
  readonly nature = "categorical";
  readonly labels = [{ __code__: "1", en: "Yes", fr: "Oui" }];
  readonly rawValues: unknown[] = [1];

  label(value: unknown, lang?: string): string | undefined {
    return typeof value == "undefined"
      ? undefined
      : getTranslation(this.labels[0], lang);
  }

  rawValue(value: unknown): number | undefined {
    return value ? 1 : undefined;
  }

  typedValue(value: unknown): unknown {
    return value ? 1 : undefined;
  }
}

export class InfoType implements ItemType {
  readonly name = "info";

  label(value: unknown): string | undefined {
    return typeof value == "undefined" ? undefined : String(value);
  }

  rawValue(): undefined {
    return undefined;
  }

  typedValue(): unknown {
    return undefined;
  }
}

export class ContextType implements HasContext<ItemType> {
  readonly name = "context";
  [context: number]: ItemType;
  constructor(types: ItemType[] | { [ctx: number]: ItemType }) {
    Object.assign(this, types);
  }

  label(value: unknown, lang?: string, ctx = 0): string | undefined {
    return typeof value == "undefined"
      ? undefined
      : this[ctx].label(value, lang);
  }

  rawValue(value: unknown, ctx = 0): number | string | undefined {
    return typeof value == "undefined" ? undefined : this[ctx].rawValue(value);
  }

  typedValue(value: unknown, ctx = 0): unknown {
    return value == undefined ? undefined : this[ctx].typedValue(value);
  }
}
