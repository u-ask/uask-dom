import test from "tape";
import {
  CheckAlert,
  DomainCollection,
  Interview,
  InterviewItem,
  ItemTypes,
  Page,
  PageItem,
  PageSet,
} from "./index.js";
import { QueryAlert, RuleAlert } from "./alert.js";

test("Create a rule type alert #119", t => {
  const interview = new Interview(new PageSet(""), {});
  const pageItem = new PageItem("A", "B", ItemTypes.text);
  const interviewItem = new InterviewItem(pageItem, undefined, {
    messages: { required: "value is required" },
  });
  const alert = new RuleAlert("?", interviewItem, interview);
  t.equal(alert.type, "rule");
  t.equal(alert.interview, interview);
  t.equal(alert.item, interviewItem);
  t.end();
});

test("Create a query type alert #119", t => {
  const interview = new Interview(new PageSet(""), {});
  const pageItem = new PageItem("A", "B", ItemTypes.text);
  const interviewItem = new InterviewItem(pageItem, undefined, {
    messages: { required: "value is required" },
  });
  const alert = new QueryAlert("?", interviewItem, interview);
  t.equal(alert.type, "query");
  t.equal(alert.interview, interview);
  t.equal(alert.item, interviewItem);
  t.end();
});

test("Create a query type alert with tags #139#141", t => {
  const interview = new Interview(new PageSet(""), {});
  const pageItem = new PageItem("A", "B", ItemTypes.text);
  const interviewItem = new InterviewItem(pageItem, undefined, {
    messages: { required: "value is required" },
  });
  const alert = new QueryAlert("?", interviewItem, interview, {
    closed: "true",
  });
  t.equal(alert.type, "query");
  t.equal(alert.interview, interview);
  t.equal(alert.item, interviewItem);
  t.equal(alert.tags?.closed, "true");
  t.end();
});

test("Create a checking alert #141", t => {
  const page = new Page("P1");
  const pageSet = new PageSet("Follow up", { pages: DomainCollection(page) });
  const interview = new Interview(pageSet, {});
  const alert = new CheckAlert("2 items unchecked", page, interview, {
    variableNames: ["SEX", "HEIGHT"],
    step: "ARC",
  });
  t.equal(alert.type, "checking");
  t.equal(alert.interview, interview);
  t.equal(alert.page, page);
  t.equal(alert.message, "2 items unchecked");
  t.equal(alert.tags?.step, "ARC");
  t.end();
});
