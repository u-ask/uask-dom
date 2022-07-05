import {
  Context,
  DateType,
  HasValue,
  InterviewItem,
  Item,
  PageItem,
  RuleMessages,
  RuleName,
  SpecialValue,
  acknowledge,
  ItemMessages,
  Survey,
} from "../domain/index.js";
import { InterviewBuilder } from "./interviewbuilder.js";

export const undefinedTag = {};
Object.freeze(undefinedTag);

export class InterviewItemBuilder {
  private _item?: InterviewItem;
  private _pageItem: PageItem;
  private _value?: unknown;
  private _unit?: string | typeof undefinedTag;
  private _specialValue?: SpecialValue | typeof undefinedTag;
  private _messages: RuleMessages | ItemMessages = {};
  private _context?: Context;

  constructor(
    readonly survey: Survey,
    x: PageItem | InterviewItem,
    private builder?: InterviewBuilder
  ) {
    if (x instanceof InterviewItem) {
      this._item = x;
      this._pageItem = x.pageItem;
    } else this._pageItem = x;
  }

  get variableName(): string {
    return this._pageItem.variableName;
  }

  get instance(): number | undefined {
    return this._pageItem.instance;
  }

  value(v: unknown): this {
    if (v === undefinedTag) this._value = undefinedTag;
    else if (
      this._pageItem.type instanceof DateType &&
      !this._pageItem.type.incomplete &&
      typeof v !== "undefined"
    )
      this._value = new Date(v as number | string);
    else this._value = v ?? undefinedTag;
    return this;
  }

  unit(u: string | undefined): this {
    this._unit = u || undefinedTag;
    return this;
  }

  specialValue(s: SpecialValue): this {
    this._specialValue = s || undefinedTag;
    return this;
  }

  messages(msgs: RuleMessages | ItemMessages): this {
    this._messages = { ...this._messages, ...msgs };
    return this;
  }

  acknowledge(...ruleNames: RuleName[]): this {
    this._messages = acknowledge(this._messages, ...ruleNames);
    return this;
  }

  context(c: Context): this {
    this._context = c;
    return this;
  }

  item(item: InterviewItem): InterviewBuilder;
  item(item: Item | (HasValue & { pageItem: Item })): InterviewItemBuilder;
  item(item: string, instance?: number): InterviewItemBuilder;
  item(
    item:
      | Item
      | InterviewItem
      | string
      | (HasValue & {
          pageItem: Item;
        }),
    instance?: number
  ): InterviewItemBuilder | InterviewBuilder {
    if (!this.builder) throw "builder is not fluent";
    return typeof item == "string"
      ? this.builder.item(item, instance)
      : this.builder.item(item);
  }

  build(): InterviewItem {
    const kwargs = Object.assign(
      {},
      this._context ? { context: this._context } : {},
      this._unit ? { unit: this._unit } : {},
      this._specialValue
        ? {
            specialValue:
              this._specialValue == undefinedTag
                ? undefined
                : (this._specialValue as SpecialValue),
          }
        : {},
      this._unit
        ? {
            unit: this._unit == undefinedTag ? undefined : this._unit,
          }
        : {},
      Object.keys(this._messages).length ? { messages: this._messages } : {}
    );
    const value = this._value == undefinedTag ? undefined : this._value;
    if (!this._item)
      this._item = new InterviewItem(this._pageItem as PageItem, value, {
        ...kwargs,
      });
    else {
      this._item = this._item?.update({
        ...(typeof this._value != "undefined" ? { value } : {}),
        ...kwargs,
      });
    }
    return this._item;
  }
}
