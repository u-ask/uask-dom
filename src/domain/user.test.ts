import test from "tape";
import { DomainCollection } from "./domaincollection.js";
import { Interview } from "./interview.js";
import { InterviewItem } from "./interviewitem.js";
import { ItemTypes } from "./itemtypes.js";
import { Page } from "./page.js";
import { PageItem } from "./pageitem.js";
import { PageSet } from "./pageSet.js";
import { Participant } from "./participant.js";
import { Sample } from "./sample.js";
import { Survey } from "./survey.js";
import { User } from "./user.js";

test("Create user", t => {
  const user = new User(
    "Jean",
    "Dupont",
    "Professor",
    "investigator:biologist",
    "jean.dupont@example.com",
    "+33686868686",
    DomainCollection("001", "002"),
    DomainCollection(),
    { option: "test" }
  );
  t.equal(user.name, "Jean");
  t.equal(user.firstName, "Dupont");
  t.equal(user.title, "Professor");
  t.equal(user.role, "investigator");
  t.equal(user.workflow, "investigator:biologist");
  t.equal(user.email, "jean.dupont@example.com");
  t.equal(user.phone, "+33686868686");
  t.equal(user.option, "test");
  t.deepEqual(user.sampleCodes, DomainCollection("001", "002"));
  t.end();
});

test("User update", t => {
  const user = new User(
    "Jean",
    "Dupont",
    "Professor",
    "investigator:biologist",
    "jean.dupont@example.com",
    "+33686868686",
    DomainCollection("001", "002"),
    DomainCollection(),
    { option: "test" }
  );
  const update = {
    workflow: "administrator",
    email: "test.update@example.com",
    participantIds: DomainCollection("00003", "00004"),
  };
  const updatedUser = user.update(update);
  t.equal(updatedUser.name, "Jean");
  t.equal(updatedUser.role, "administrator");
  t.equal(updatedUser.workflow, "administrator");
  t.equal(updatedUser.email, "test.update@example.com");
  t.end();
});

test("Simple user", t => {
  const user = new User("investigator", "investigator@example.com");
  t.equal(user.role, "investigator");
  t.equal(user.email, "investigator@example.com");
  t.end();
});

test("Participant user", t => {
  const email = new PageItem("email", "__EMAIL", ItemTypes.text);
  const phone = new PageItem("phone", "__PHONE", ItemTypes.text);
  const page = new Page("Participant", {
    includes: DomainCollection(email, phone),
  });
  const pageSet = new PageSet("Participant", {
    pages: DomainCollection(page),
  });
  const survey = new Survey("TEST", {
    pageSets: DomainCollection(pageSet),
    pages: DomainCollection(page),
  });
  const emailItem = new InterviewItem(email, "participant@example.com");
  const phoneItem = new InterviewItem(phone, "0600000000");
  const participant = new Participant("00001", new Sample("A"), {
    interviews: DomainCollection(
      new Interview(pageSet, survey.options, {
        items: DomainCollection(emailItem, phoneItem),
      })
    ),
  });
  const user = new User(survey, participant);
  t.equal(user.role, "participant");
  t.equal(user.email, emailItem.value);
  t.equal(user.phone, phoneItem.value);
  t.equal(user.participantCodes?.[0], participant.participantCode);
  t.equal(user.userid, "test_00001");
  t.end();
});

test("Participant like user", t => {
  const survey = { name: "TEST" };
  const participant = { participantCode: "00001" };
  const user = new User(survey, participant);
  t.equal(user.role, "participant");
  t.equal(user.participantCodes?.[0], participant.participantCode);
  t.equal(user.userid, "test_00001");
  t.end();
});

test("User with null non necessary fields", t => {
  const user = new User(
    null,
    null,
    null,
    "cst",
    "cst@arone.com",
    undefined,
    DomainCollection("001")
  );
  t.equal(user.email, "cst@arone.com");
  t.equal(user.role, "cst");
  t.end();
});
