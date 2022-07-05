import { CrossRule } from "./crossrule.js";
import { HasValue } from "./rule.js";

export class CopyRule implements CrossRule {
  name = "copy";
  precedence = 110;

  execute(source: HasValue, target: HasValue): HasValue[] {
    return [
      source,
      {
        value: source.value,
        unit: source.unit,
        specialValue: source.specialValue,
      },
    ];
  }
}
