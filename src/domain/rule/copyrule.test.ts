import test from "tape";
import { CopyRule } from "./copyrule.js";

test("Copy rule reports value and unit", t => {
  const copy = new CopyRule();
  const source = { value: 1, unit: "kg", messages: { required: "amessage" } };
  const result = copy.execute(source, { value: undefined });
  t.deepEqual(result[1], { value: 1, unit: "kg", specialValue: undefined });
  t.end();
});
