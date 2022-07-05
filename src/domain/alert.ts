import { Page } from "./page.js";
import { mlstring } from "./domain.js";
import { Interview } from "./interview.js";
import { Item } from "./pageitem.js";

export interface Alert {
  readonly message: mlstring;
  readonly item?: Item;
  readonly page?: Page;
  readonly interview: Interview;
  readonly type: "rule" | "query" | "checking";
  readonly tags?: { [k: string]: string | string[] };
}

export class RuleAlert implements Alert {
  constructor(
    readonly message: string,
    readonly item: Item,
    readonly interview: Interview,
    readonly tags?: { [k: string]: string | string[] }
  ) {
    Object.freeze(this);
  }

  get type(): "rule" {
    return "rule";
  }
}

export class QueryAlert implements Alert {
  constructor(
    readonly message: mlstring,
    readonly item: Item,
    readonly interview: Interview,
    readonly tags?: { [k: string]: string }
  ) {
    Object.freeze(this);
  }

  get type(): "query" {
    return "query";
  }
}

export class CheckAlert implements Alert {
  constructor(
    readonly message: mlstring,
    readonly page: Page,
    readonly interview: Interview,
    readonly tags?: { [k: string]: string | string[] }
  ) {
    Object.freeze(this);
  }

  get type(): "checking" {
    return "checking";
  }
}
