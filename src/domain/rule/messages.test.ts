import test from "tape";
import { messageEntries } from "./messages.js";

test("Messages entries", t => {
  const messages = {
    required: "value is required",
    inRange: "value is out of range",
    __acknowledged: ["inRange"],
  };
  const entries = messageEntries(messages);
  t.deepEqual(entries, [
    ["required", "value is required", false],
    ["inRange", "value is out of range", true],
  ]);
  t.end();
});
