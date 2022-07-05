import test from "tape";
import { DomainCollection, Interview } from "../domain/index.js";
import { exampleParticipants } from "../example.js";
import { groupByPageSet } from "./groupby.js";

test("Page set groups have different page sets", t => {
  const groups = buildGroups();
  const sorted = groups.sort((g, h) =>
    JSON.stringify(g.pageSet.type).localeCompare(JSON.stringify(h.pageSet.type))
  );
  sorted.forEach((g, i) => {
    if (i > 0) t.notDeepEqual(g.pageSet, sorted[i - 1].pageSet);
  });
  t.end();
});

test("Page set group interviews has same page sets", t => {
  const groups = buildGroups();
  groups.forEach(g => {
    g.interviews.forEach(i => {
      t.equal(i.pageSet, g.pageSet);
    });
  });
  t.end();
});

test("Page set group interviews are sorted by date", t => {
  const groups = buildGroups();
  groups.forEach(g => {
    g.interviews.forEach((i, x) => {
      if (x > 0) t.false((i.date ?? 0) < (g.interviews[x - 1].date ?? 0));
    });
  });
  t.end();
});

function buildGroups() {
  const interviews = exampleParticipants.reduce(
    (result, p) => result.append(...p.interviews),
    DomainCollection<Interview>()
  );
  return groupByPageSet(interviews);
}
