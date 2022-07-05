import test from "tape";
import { DomainCollection } from "./domaincollection.js";
import { Interview } from "./interview.js";
import { PageSet } from "./pageSet.js";
import { Participant } from "./participant.js";
import { Sample } from "./sample.js";
import {
  inDateItem,
  Scope,
  acknowledgeItem,
  undefinedItem,
  todayItem,
  sampleItem,
  thisYearItem,
} from "./scope.js";
import { PageItem } from "./pageitem.js";
import { ItemTypes } from "./itemtypes.js";
import { InterviewItem } from "./interviewitem.js";

test("Global scope contains INDATE", t => {
  const date = new Date();
  const scope = Scope.create({ lastInput: date, interviews: [] });
  const indate = scope.get([inDateItem, "global"]);
  t.deepEqual(indate?.value as Date, date);
  t.end();
});

test("Global scope does not contain INDATE", t => {
  const scope = Scope.create([]);
  const indate = scope.get([inDateItem, "global"]);
  t.notOk(indate);
  t.end();
});

test("Global scope contains INDATE with last input date", t => {
  const { participant } = buildParticipant();
  const scope = Scope.create(participant);
  const indate = scope.get([inDateItem, "global"]);
  t.deepEqual(indate?.value, participant.lastInput);
  t.end();
});

test("Global scope contains SAMPLE #257", t => {
  const { participant } = buildParticipant();
  const scope = Scope.create(participant);
  const sample = scope.get([sampleItem, "global"]);
  t.equal(sample?.value, participant.sample.sampleCode);
  t.end();
});

test("Global scope contains ACK", t => {
  const scope = Scope.create([]);
  const ack = scope.get([acknowledgeItem, "global"]);
  t.equal(ack?.value, 1);
  t.end();
});

test("Global scope contains UNDEF", t => {
  const scope = Scope.create([]);
  const undef = scope.get([undefinedItem, "global"]);
  t.equal(undef?.value, undefined);
  t.end();
});

test("Global scope contains TODAY", t => {
  const scope = Scope.create([]);
  const today = scope.get([todayItem, "global"]);
  t.ok(today?.value instanceof Date);
  const now = new Date();
  const expected = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  t.deepEqual(today?.value, expected);
  t.end();
});

test("Global scope contains THISYEAR", t => {
  const scope = Scope.create([]);
  const thisYear = scope.get([thisYearItem, "global"]);
  t.equal(typeof thisYear?.value, "number");
  const expected = new Date().getFullYear();
  t.equal(thisYear?.value, expected);
  t.end();
});

test("Global scope item not found", t => {
  const { participant } = buildParticipant();
  const scope = Scope.create(participant);
  const unknown = new PageItem("unknown", "V", ItemTypes.text);
  t.false(scope.get(unknown));
  t.end();
});

test("Local scope references global scope", t => {
  const { participant, interview2 } = buildParticipant();
  const scope = Scope.create(participant, interview2);
  t.deepEqual(scope.get(inDateItem, "global")?.value, participant.lastInput);
  t.end();
});

test("Local scope item not found", t => {
  const { participant, interview2 } = buildParticipant();
  const scope = Scope.create(participant, interview2);
  const unknown = new PageItem("unknown", "V", ItemTypes.text);
  t.false(scope.get(unknown));
  t.end();
});

test("Local scope get local item", t => {
  const { participant, interview2 } = buildParticipant();
  const pageItem = interview2.items[0].pageItem;
  const scope = Scope.create(participant, interview2);
  const result = scope.get(pageItem, "local");
  t.equal(result?.value, "B");
  t.end();
});

test("Local scope get transcient item", t => {
  const { participant, interview2 } = buildParticipant();
  const pageItem = interview2.items[0].pageItem;
  const item = new InterviewItem(pageItem, "C");
  const scope = Scope.create(participant, interview2).with([item]);
  const result = scope.get(pageItem, "local");
  t.equal(result?.value, "C");
  t.end();
});

test("Outer scope item value", t => {
  const { participant, interview2 } = buildParticipant();
  const scope = Scope.create(participant, interview2);
  const pageItem = interview2.items[0].pageItem;
  const result = scope.get(pageItem, "outer");
  t.equal(result?.value, "A");
  t.end();
});

test("Global scope item value", t => {
  const { participant, interview2 } = buildParticipant();
  const scope = Scope.create(participant, interview2);
  const result = scope.get(acknowledgeItem, "global");
  t.equal(result?.value, 1);
  t.end();
});

test("Complete scope for last interview", t => {
  const { participant, interview1, interview2 } = buildParticipant();
  const items = interview2.items.map(i => i.pageItem);
  const scope = Scope.create(participant, interview2);
  t.equal(scope.get(items[0]), interview2.items[0]);
  t.equal(scope.get([items[0], "outer"]), interview1.items[0]);
  t.end();
});

test("Complete scope for interview before the last", t => {
  const { participant, interview1, interview2 } = buildParticipant();
  const items = interview2.items.map(i => i.pageItem);
  const scope = Scope.create(participant, interview1);
  t.equal(scope.get(items[0]), interview1.items[0]);
  t.equal(scope.get([items[0], "outer"]), undefined);
  t.end();
});

test("Complete scope with item replacement", t => {
  const { participant, interview1, interview2 } = buildParticipant();
  const items = interview2.items.map(i => i.pageItem);
  const transcient = new InterviewItem(items[0], "C");
  const scope = Scope.create(participant, interview2).with([transcient]);
  t.equal(scope.get(items[0]), transcient);
  t.equal(scope.get([items[0], "outer"]), interview1.items[0]);
  t.end();
});

function buildParticipant() {
  const sample = new Sample("032");
  const pageItem = new PageItem("Q", "Q", ItemTypes.text);
  const visit = new PageSet("Inclusion");
  const interview1 = new Interview(
    visit,
    {},
    {
      items: DomainCollection(new InterviewItem(pageItem, "A")),
    }
  );
  const interview2 = new Interview(
    visit,
    {},
    {
      items: DomainCollection(new InterviewItem(pageItem, "B")),
    }
  );
  const participant = new Participant("0001", sample, {
    interviews: DomainCollection(interview1, interview2),
  });
  return { participant, interview1, interview2 };
}
