import { RuleMessages } from "./rule.js";
import { RuleName } from "./rules.js";

export type ItemMessages = RuleMessages & {
  __acknowledged: ReadonlyArray<RuleName>;
};

export function hasMessages(o: RuleMessages): boolean {
  return Object.keys(o).length > (isamplemMessages(o) ? 1 : 0);
}

export function isamplemMessages(o: RuleMessages): o is ItemMessages {
  return "__acknowledged" in o;
}

export function areMessagesEqual(
  m1: ItemMessages | RuleMessages,
  m2: ItemMessages | RuleMessages,
  ruleName: RuleName
): boolean {
  return (
    getMessage(m1, ruleName) == getMessage(m2, ruleName),
    isAcknowledged(m1, ruleName) == isAcknowledged(m2, ruleName)
  );
}

export function acknowledge(
  messages: ItemMessages | RuleMessages,
  ...ruleNames: RuleName[]
): ItemMessages {
  if (!isamplemMessages(messages))
    return { ...messages, __acknowledged: ruleNames };
  const ack = ruleNames.filter(r => !messages.__acknowledged.includes(r));
  if (ack.length == 0) return messages;
  return {
    ...messages,
    __acknowledged: [...messages.__acknowledged, ...ack],
  };
}

export function reiterate(
  messages: ItemMessages | RuleMessages,
  ...ruleNames: RuleName[]
): RuleMessages | ItemMessages {
  if (!isamplemMessages(messages)) return messages;
  const ack = messages.__acknowledged.filter(r => !ruleNames.includes(r));
  if (ack.length == messages.__acknowledged.length) return messages;
  return {
    ...messages,
    __acknowledged: ack,
  };
}

export function isAcknowledged(
  messages: ItemMessages | RuleMessages,
  ruleName: RuleName
): boolean {
  return isamplemMessages(messages) && messages.__acknowledged.includes(ruleName);
}

export function alerts(messages: ItemMessages | RuleMessages): string[] {
  return messageNames(messages)
    .filter(name => !isAcknowledged(messages, name))
    .map(name => getMessage(messages, name));
}

export function acknowledgements(
  messages: ItemMessages | RuleMessages
): string[] {
  return messageNames(messages)
    .filter(name => isAcknowledged(messages, name))
    .map(name => getMessage(messages, name));
}

export function messageEntries(
  messages?: ItemMessages | RuleMessages
): (readonly [RuleName, string, boolean])[] {
  return messages
    ? messageNames(messages).map(name => [
        name,
        getMessage(messages, name),
        isAcknowledged(messages, name),
      ])
    : [];
}

export function getMessage(
  messages: RuleMessages | ItemMessages,
  ruleName: RuleName
): string {
  return messages?.[ruleName] as string;
}

export function messageNames(
  messages: RuleMessages | ItemMessages
): RuleName[] {
  return Object.keys(messages ?? {}).filter(
    k => k != "__acknowledged"
  ) as RuleName[];
}
