import { mlstring } from "./domain.js";
import {
  DateType,
  ScaleType,
  ChoiceType,
  CountryType,
  ItemType,
  ContextType,
  TextType,
  RealType,
  IntegerType,
  YesNoType,
  GlossaryType,
  InfoType,
  AcknowledgeType,
  ScoreType,
  ImageType,
  TimeType,
} from "./itemtype.js";

export type TypeName =
  | "text"
  | "real"
  | "integer"
  | "date"
  | "yesno"
  | "acknowledge"
  | "scale"
  | "score"
  | "choice"
  | "glossary"
  | "countries"
  | "context"
  | "image"
  | "time"
  | "info";

export type TypeArgs = {
  name: TypeName;
  [name: string]: unknown;
};

export class ItemTypes {
  static readonly text = ItemTypes.create({ name: "text" });
  static readonly real = ItemTypes.create({ name: "real" });
  static readonly integer = ItemTypes.create({ name: "integer" });
  static readonly yesno = ItemTypes.create({ name: "yesno" });
  static readonly info = ItemTypes.create({ name: "info" });
  static readonly acknowledge = ItemTypes.create({ name: "acknowledge" });
  static readonly image = ItemTypes.create({ name: "image" });

  static readonly date = ItemTypes._date;
  private static _date(incomplete?: false): DateType;
  private static _date(incomplete: true, month?: boolean): DateType;
  private static _date(incomplete = false, month = false): DateType {
    return ItemTypes.create({ name: "date", incomplete, month }) as DateType;
  }

  static readonly time = (duration = false): TimeType =>
    ItemTypes.create({ name: "time", duration }) as TimeType;

  static readonly scale = (min: number, max: number): ScaleType =>
    ItemTypes.create({ name: "scale", min, max }) as ScaleType;

  static readonly score = (...scores: number[]): ScoreType =>
    ItemTypes.create({ name: "score", scores }) as ScoreType;

  static readonly choice = (
    multiplicity: "one" | "many",
    ...choices: string[]
  ): ChoiceType =>
    ItemTypes.create({
      name: "choice",
      multiplicity,
      choices,
    }) as ChoiceType;

  static readonly countries = (multiplicity: "one" | "many"): CountryType =>
    ItemTypes.create({
      name: "countries",
      multiplicity,
    }) as CountryType;

  static readonly glossary = (
    multiplicity: "one" | "many",
    ...choices: string[]
  ): GlossaryType =>
    ItemTypes.create({
      name: "glossary",
      multiplicity,
      choices,
    }) as GlossaryType;

  static context(types: ItemType[] | { [ctx: number]: ItemType }): ContextType {
    return new ContextType(types);
  }

  static create({ name, ...args }: TypeArgs): ItemType {
    switch (name) {
      case "scale":
        return new ScaleType(
          args.min as number,
          args.max as number,
          args.defaultLang as string | undefined,
          args.labels as mlstring[] | undefined
        );
      case "score":
        return new ScoreType(
          args.scores as number[],
          args.defaultLang as string | undefined,
          args.labels as mlstring[] | undefined
        );
      case "text":
        return new TextType();
      case "real":
        return new RealType();
      case "integer":
        return new IntegerType();
      case "date":
        return new DateType(args.incomplete as boolean, args.month as boolean);
      case "yesno":
        return new YesNoType();
      case "acknowledge":
        return new AcknowledgeType();
      case "choice":
        return new ChoiceType(
          args.multiplicity as "one" | "many",
          args.choices as string[],
          args.defaultLang as string | undefined,
          args.labels as mlstring[] | undefined
        );
      case "countries":
        return new CountryType(
          args.multiplicity as "one" | "many",
          args.defaultLang as string | undefined
        );
      case "glossary":
        return new GlossaryType(
          args.multiplicity as "one" | "many",
          args.choices as string[],
          args.defaultLang as string | undefined,
          args.labels as mlstring[] | undefined
        );
      case "context":
        return new ContextType(
          Object.keys(args).map(t => ItemTypes.create(args[t] as TypeArgs))
        );
      case "image":
        return new ImageType();
      case "time":
        return new TimeType(args.duration as boolean);
      case "info":
        return new InfoType();
    }
  }
}
