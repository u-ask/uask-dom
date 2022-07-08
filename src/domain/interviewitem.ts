import { Domain, mlstring } from "./domain.js";
import {
  Context,
  Item,
  ItemWithContext,
  getItemType,
  getItemWording,
} from "./pageitem.js";
import { ItemTypes } from "./itemtypes.js";
import { PageItem } from "./pageitem.js";
import { ItemType } from "./itemtype.js";
import {
  ItemMessages,
  isamplemMessages,
  messageNames,
  areMessagesEqual,
  alerts,
  acknowledgements,
  acknowledge,
  reiterate,
  isAcknowledged,
} from "./rule/messages.js";
import { Difference, Differentiable } from "./diff.js";
import { RuleMessages } from "./rule/rule.js";
import { RuleName } from "./rule/rules.js";

export type SpecialValue = "unknown" | "notApplicable" | "notDone" | undefined;

const emptyMessages = {};

type InterviewItemLike = Pick<
  InterviewItem,
  "value" | "pageItem" | "context" | "unit" | "specialValue" | "messages"
>;

export function status(
  item: InterviewItemLike
): "missing" | "fulfilled" | "info" {
  if (item.pageItem.type.name == ItemTypes.info.name) return "info";
  if (
    item.value != undefined &&
    item.value !== "" &&
    !Array.isArray(item.value)
  )
    return unitStatus(item);
  if (Array.isArray(item.value))
    return item.value.length > 0 ? "fulfilled" : "missing";
  if (item.specialValue != undefined) return "fulfilled";
  return "missing";
}

function unitStatus(item: InterviewItemLike) {
  if (item.pageItem.units?.values)
    return item.unit != undefined || item.pageItem.units.values.length < 2
      ? "fulfilled"
      : "missing";
  else return "fulfilled";
}

export class InterviewItem implements ItemWithContext, Differentiable {
  readonly value: unknown;
  readonly pageItem: PageItem;
  readonly context: Context = 0;
  readonly unit?: string;
  readonly specialValue: SpecialValue = undefined;
  readonly messages: RuleMessages | ItemMessages = emptyMessages;

  constructor(pageItem: Item, value: unknown, kwargs?: Partial<InterviewItem>) {
    this.value = value;
    if (pageItem instanceof PageItem) this.pageItem = pageItem;
    else {
      this.pageItem = pageItem.pageItem;
      this.context = pageItem.context;
    }
    Object.assign(this, kwargs);
    this.value = this.pageItem.type.typedValue(
      isNull(this.value) ? undefined : this.value,
      this.context
    );
    Object.freeze(this.messages);
    if (isamplemMessages(this.messages))
      Object.freeze(this.messages.__acknowledged);
    Domain.extend(this);
  }

  update(kwargs: Partial<InterviewItem>): InterviewItem {
    if (!(kwargs instanceof InterviewItem)) {
      if (
        typeof kwargs.messages != "undefined" &&
        this.messagesEqual(kwargs.messages)
      ) {
        kwargs = { ...kwargs, messages: this.messages };
      }
      if ("value" in kwargs) {
        kwargs = {
          ...kwargs,
          value: this.pageItem.type.typedValue(kwargs.value),
        };
      }
    }
    return Domain.update(this, kwargs, [
      InterviewItem,
      this.pageItem,
      this.value,
    ]);
  }

  private messagesEqual(messages: RuleMessages | ItemMessages) {
    const names = messageNames(messages);
    const thisNames = messageNames(this.messages);
    if (names.length != thisNames.length) return false;
    for (const name of names) {
      if (!areMessagesEqual(messages, this.messages, name)) return false;
    }
    return true;
  }

  get status(): "missing" | "fulfilled" | "info" {
    return status(this);
  }

  get wording(): mlstring {
    return getItemWording(this);
  }

  get type(): ItemType {
    return getItemType(this);
  }

  get alerts(): string[] {
    return alerts(this.messages);
  }

  get acknowledgements(): string[] {
    return acknowledgements(this.messages);
  }

  get event(): { event: string; acknowledged: boolean } | undefined {
    return this.messages.critical
      ? {
          event: this.messages.critical,
          acknowledged: isAcknowledged(this.messages, "critical"),
        }
      : undefined;
  }

  acknowledge(...ruleNames: RuleName[]): InterviewItem {
    return this.update({ messages: acknowledge(this.messages, ...ruleNames) });
  }

  reiterate(...ruleNames: RuleName[]): InterviewItem {
    return this.update({ messages: reiterate(this.messages, ...ruleNames) });
  }

  acknowledgeEvent(): InterviewItem {
    return this.update({
      messages: acknowledge(this.messages, "critical"),
    });
  }

  label(lang?: string): string | undefined {
    const value = this.type.label(this.value, lang);
    return value && this.unit
      ? `${value} ${this.unit}`
      : value ?? this.specialValue;
  }

  diff(previous: this | undefined): Difference<this> {
    const diff =
      this.type.name == "image"
        ? ({ value: undefined } as Difference<this>)
        : ({} as Difference<this>);
    const acknowledge = this.acknowledgements.find(
      m => !previous?.acknowledgements.includes(m)
    );
    if (acknowledge)
      return {
        ...diff,
        operation: `acknowledge (${acknowledge})`,
      };
    const reiterate = previous?.acknowledgements.find(
      m => !this.acknowledgements.includes(m)
    );
    if (reiterate)
      return {
        ...diff,
        operation: `reiterate (${reiterate})`,
      };
    return diff;
  }
}

function isNull(value: unknown) {
  return value === "";
}
