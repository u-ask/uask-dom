import { CrossRule } from "./crossrule.js";
import { HasValue, unsetMessage, update } from "./rule.js";

export class ActivationRule implements CrossRule {
  readonly name: string = "activation";
  readonly precedence: number = 50;

  constructor(
    readonly values: unknown[] = [],
    readonly behavior: "show" | "enable" = "enable"
  ) {}

  execute(activator: HasValue, target: HasValue): [HasValue, HasValue] {
    return [
      activator,
      this.isActivated(activator)
        ? this.activate(target)
        : this.deactivate(target),
    ];
  }

  private isActivated(activator: HasValue) {
    return this.values.some(v => v == activator.value);
  }

  private deactivate(target: HasValue) {
    const messages = unsetMessage(target.messages, "required");
    target = update(target, { messages });
    if (this.needsDeactivation(target))
      target = update(target, {
        value: undefined,
        unit: undefined,
        specialValue: "notApplicable",
      });
    return target;
  }

  private needsDeactivation(target: HasValue) {
    return (
      target.value != undefined ||
      target.unit != undefined ||
      target.specialValue != "notApplicable"
    );
  }

  private activate(target: HasValue) {
    if (this.needsActivation(target))
      target = update(target, {
        specialValue: undefined,
      });
    return target;
  }

  private needsActivation(target: HasValue) {
    return target.specialValue == "notApplicable";
  }

  static enable(...values: unknown[]): ActivationRule {
    return new ActivationRule(values, "enable");
  }

  static show(...values: unknown[]): ActivationRule {
    return new ActivationRule(values, "show");
  }
}
