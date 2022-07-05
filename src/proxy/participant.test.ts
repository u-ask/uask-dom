import test from "tape";
import {
  DomainCollection,
  Interview,
  InterviewItem,
  ItemTypes,
  Page,
  PageItem,
  PageSet,
  Participant,
  Sample,
} from "../domain/index.js";
import { MutableParticipant } from "./participant.js";

test("Update a page item in a mutable participant", t => {
  const { mutable, pageItem1 } = setup();
  const pageItem = pageItem1.update({ wording: "Q11" });
  mutable.updateItem(pageItem);
  t.equal(mutable.interviews[0].items[0].pageItem, pageItem);
  t.end();
});

test("Delete a page item in a mutable participant", t => {
  const { mutable, pageItem1 } = setup();
  mutable.deleteItem(pageItem1);
  t.false(
    mutable.interviews[0].items.some(
      i => i.pageItem.variableName == pageItem1.variableName
    )
  );
  t.end();
});

test("Delete a page set in a mutable participant", t => {
  const { mutable, pageSet2 } = setup();
  mutable.deletePageSet(pageSet2);
  t.false(mutable.interviews.some(i => i.pageSet == pageSet2));
  t.end();
});

test("Insert items in a mutable participant", t => {
  const { mutable, pageItem2 } = setup();
  const items = DomainCollection(new InterviewItem(pageItem2, "D"));
  mutable.insertItems(items);
  t.deepLooseEqual(
    mutable.interviews[1].items.map(i => i.pageItem.variableName),
    ["Q2"]
  );
  t.deepLooseEqual(
    mutable.interviews[2].items.map(i => i.pageItem.variableName),
    ["Q2"]
  );
  t.end();
});

test("Update a page set in a mutable participant", t => {
  const { mutable, pageSet1, page2 } = setup();
  const pageSet = pageSet1.update({ pages: pageSet1.pages.append(page2) });
  mutable.updatePageSet(pageSet);
  t.equal(mutable.interviews[0].pageSet, pageSet);
  t.end();
});

test("Insert a page set in a mutable participant", t => {
  const { mutable } = setup();
  const pageItem = new PageItem("Q+", "Q+", ItemTypes.text);
  const page = new Page("P+", {
    includes: DomainCollection(pageItem),
  });
  const pageSet = new PageSet("PS+", {
    pages: DomainCollection(page),
  });
  mutable.insertPageSet(pageSet, {});
  t.equal(mutable.interviews.last?.pageSet, pageSet);
  t.deepLooseEqual(
    mutable.interviews.last?.items.map(i => i.pageItem),
    [pageItem]
  );
  t.end();
});

function setup() {
  const pageItem1 = new PageItem("Q1", "Q", ItemTypes.text);
  const pageItem2 = new PageItem("Q2", "Q2", ItemTypes.text);
  const page1 = new Page("P1", {
    includes: DomainCollection(pageItem1),
  });
  const page2 = new Page("P1", {
    includes: DomainCollection(pageItem2),
  });
  const pageSet1 = new PageSet("PS1", {
    pages: DomainCollection(page1, page2),
  });
  const pageSet2 = new PageSet("PS2", {
    pages: DomainCollection(page2),
  });
  const interviewItem1 = new InterviewItem(pageItem1, "A");
  const interviewItem2 = new InterviewItem(pageItem2, "B");
  const interview1 = new Interview(
    pageSet1,
    {},
    {
      items: DomainCollection(interviewItem1, interviewItem2),
    }
  );
  const interview2 = new Interview(
    pageSet2,
    {},
    {
      items: DomainCollection(interviewItem2.update({ value: "C" })),
    }
  );
  const interview3 = new Interview(pageSet2, {});
  const participant = new Participant("0001", new Sample("1"), {
    interviews: DomainCollection(interview1, interview2, interview3),
  });
  const mutable = new MutableParticipant(participant);
  return {
    mutable,
    pageSet1,
    pageSet2,
    page1,
    page2,
    pageItem1,
    pageItem2,
    interview1,
    interview2,
    interview3,
  };
}
