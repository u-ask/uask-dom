import { InterviewItem, SpecialValue } from "../interviewitem.js";
import { Domain } from "../domain.js";
import { DomainCollectionImpl } from "../domaincollection.js";
import { Context } from "../pageitem.js";
import { RuleName } from "./rules.js";

export type HasValue = {
  value?: unknown;
  unit?: string;
  specialValue?: SpecialValue;
  messages?: RuleMessages;
  context?: Context;
};

export type RuleMessages = {
  [K in RuleName]?: string;
};

export interface Rule {
  readonly name: string;
  readonly precedence: number;
}

class AnswerLikeImpl implements HasValue {
  constructor(kwargs: Partial<HasValue>) {
    Object.assign(this, kwargs);
  }
}

export function update(target: InterviewItem, kwargs: HasValue): InterviewItem;
export function update(target: HasValue, kwargs: HasValue): HasValue;
export function update(target: HasValue, kwargs: HasValue): HasValue {
  if (target == kwargs) return target;
  const hasValue: HasValue = Object.assign(
    {},
    "value" in kwargs ? { value: kwargs.value } : {},
    "unit" in kwargs ? { unit: kwargs.unit } : {},
    "specialValue" in kwargs ? { specialValue: kwargs.specialValue } : {},
    "messages" in kwargs ? { messages: kwargs.messages } : {},
    "context" in kwargs ? { context: kwargs.context } : {}
  );
  if (target instanceof InterviewItem) {
    if (hasProperMessages(hasValue)) return target.update(hasValue);
    const kw = Object.assign({}, hasValue, {
      messages: hasValue.messages ?? {},
    });
    return target.update(kw);
  }
  return Domain.update(target, hasValue, [AnswerLikeImpl]);
}

function hasProperMessages(a: HasValue): a is Partial<InterviewItem> {
  return !a.messages || a.messages instanceof DomainCollectionImpl;
}

export function setMessageIf(
  condition: boolean
): (
  messages: RuleMessages | undefined,
  name: string,
  message: string
) => RuleMessages | undefined {
  return condition ? setMessage : unsetMessage;
}

export function unsetMessage(
  messages: RuleMessages | undefined,
  name: string
): RuleMessages | undefined {
  if (messages == undefined) return undefined;
  if (name in messages) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [name as keyof RuleMessages]: _, ...others } = messages;
    return others;
  }
  return messages;
}

export function setMessage(
  messages: RuleMessages | undefined,
  name: string,
  message: string
): RuleMessages {
  if (messages == undefined) return { [name]: message };
  if (messages[name as keyof RuleMessages] == message) return messages;
  return { ...messages, [name]: message };
}
