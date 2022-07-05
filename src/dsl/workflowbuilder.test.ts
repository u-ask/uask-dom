import test from "tape";
import { DomainCollection, PageSet } from "../domain/index.js";
import { WorkflowBuilder } from "./workflowbuilder.js";

const mainWorkflow = new WorkflowBuilder("main", {});
mainWorkflow
  .home("Introduction")
  .auxiliary("Follow up", "Adverse event")
  .initial("Inclusion")
  .end("Final consultation");

test("Main workflow construction", t => {
  const { ps0, ps1, ps2, ps3, ps4, ps5 } = buildPageSets();
  const workflow = mainWorkflow.build([ps0, ps1, ps2, ps3, ps4, ps5]);
  t.equal(workflow.name, "main");
  t.equal(workflow.info, ps0);
  t.deepEqual(workflow.single, DomainCollection(ps1, ps4, ps5));
  t.deepEqual(workflow.many, DomainCollection(ps2, ps3));
  t.deepEqual(workflow.sequence, DomainCollection(ps1));
  t.deepEqual(workflow.stop, DomainCollection(ps5));
  t.equal(workflow.pageSets.length, 6);
  t.equal(workflow.main, undefined);
  t.end();
});

test("Participant workflow construction", t => {
  const { ps0, ps1, ps2, ps3, ps4, ps5 } = buildPageSets();
  const workflowBuilder = new WorkflowBuilder("participant", {}, mainWorkflow);
  workflowBuilder.withPageSets("Introduction", "Follow up");
  const workflow = workflowBuilder.build([ps0, ps1, ps2, ps3, ps4, ps5]);
  t.equal(workflow.name, "participant");
  t.equal(workflow.info, ps0);
  t.deepEqual(workflow.single, DomainCollection());
  t.deepEqual(workflow.many, DomainCollection(ps2));
  t.deepEqual(workflow.sequence, DomainCollection());
  t.deepEqual(workflow.stop, DomainCollection());
  t.equal(workflow.pageSets.length, 2);
  t.equal(workflow.main, mainWorkflow.build([]));
  t.end();
});

test("Workflow with pageset not found", t => {
  const { ps0, ps1, ps2, ps3, ps4, ps5 } = buildPageSets();
  const workflowBuilder = new WorkflowBuilder("main", {});
  workflowBuilder.home("Introduction").initial("Inclusion").auxiliary("Follow");
  const build = () => workflowBuilder.build([ps0, ps1, ps2, ps3, ps4, ps5]);
  t.throws(build, "page set follow not found");
  t.end();
});

test("Derived workflow with notifications #275", t => {
  const { ps0, ps1 } = buildPageSets();
  const workflowBuilder = new WorkflowBuilder("main", {});
  workflowBuilder.home("Introduction").initial("Inclusion");
  const derivedWorkflowBuilder = new WorkflowBuilder(
    "derived",
    {},
    workflowBuilder
  );
  derivedWorkflowBuilder.notify("ae");
  const derived = derivedWorkflowBuilder.build([ps0, ps1]);
  t.deepLooseEqual(derived.notifications, ["ae"]);
  t.end();
});

function buildPageSets() {
  const ps0 = new PageSet("Introduction");
  const ps1 = new PageSet("Inclusion");
  const ps2 = new PageSet("Follow up");
  const ps3 = new PageSet("Adverse event");
  const ps4 = new PageSet("Third week consultation");
  const ps5 = new PageSet("Final consultation");
  return { ps0, ps1, ps2, ps3, ps4, ps5 };
}
