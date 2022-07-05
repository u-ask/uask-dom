import { mlstring } from "./domain.js";

export type Difference<T> = Partial<T> & { operation?: mlstring };
export interface Differentiable {
  diff(previous: this | undefined): Difference<this>;
}
