import tape from "tape";

interface TestArray<T> {
  includes(searchElement: T, fromIndex?: number): boolean;

  every(
    predicate: (value: T, index: number, array: readonly T[]) => unknown,
    thisArg?: unknown
  ): boolean;
}

declare module "tape" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  class Test {
    almostEqual(
      actual: unknown,
      expected: unknown,
      margin?: number,
      msg?: string,
      extra?: tape.AssertOptions
    ): void;
    arrayContains<T>(
      actual: TestArray<T> | undefined,
      expected: TestArray<T>,
      msg?: string,
      extra?: tape.AssertOptions
    ): void;
  }
}

tape.Test.prototype.arrayContains = function <T>(
  actual: TestArray<T>,
  expected: TestArray<T>,
  msg?: string,
  extra?: tape.AssertOptions
) {
  this.true(
    expected.every(e => actual.includes(e)),
    msg ? msg : "should contain array",
    extra
  );
};

tape.Test.prototype.almostEqual = function (
  actual: unknown,
  expected: unknown,
  margin = 10e-8,
  msg?: string,
  extra?: tape.AssertOptions
): void {
  const actualRounded = Math.round(<number>actual / margin) * margin;
  const expectedRounded = Math.round(<number>expected / margin) * margin;
  this.equal(actualRounded, expectedRounded, msg, extra);
};
