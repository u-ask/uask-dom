import test from "tape";
import "../test-extension.js";
import { DomainCollection } from "./domaincollection.js";
import { PageSet } from "./pageSet.js";
import { Workflow } from "./workflow.js";

test("Workflow creation", t => {
  const { workflow, info, incl, init, follow1, follow2, ae, final } =
    buildWorkflow();
  t.equal(workflow.name, "main");
  t.equal(workflow.info, info);
  t.deepEqual(workflow.single, DomainCollection(incl, init, final));
  t.deepEqual(workflow.many, DomainCollection(follow1, follow2, ae));
  t.deepEqual(
    workflow.sequence,
    DomainCollection(incl, init, follow1, follow2)
  );
  t.deepEqual(workflow.stop, DomainCollection(final));
  const expected = [info, incl, init, follow1, follow2, ae, final];
  t.deepEqual(
    expected.filter(e => workflow.pageSets.includes(e)),
    expected
  );
  t.equal(workflow.main, undefined);
  t.end();
});

test("Workflow available page sets", t => {
  const { workflow, info, incl, init, follow1, follow2, ae, final } =
    buildWorkflow();
  t.deepEqual(workflow.available(), DomainCollection(info));
  t.deepEqual(workflow.available(info), DomainCollection(incl));
  t.deepEqual(
    workflow.available(info, incl),
    DomainCollection(init, ae, final)
  );
  t.deepEqual(
    workflow.available(info, incl, init),
    DomainCollection(follow1, ae, final)
  );
  t.deepEqual(
    workflow.available(info, incl, init, follow1),
    DomainCollection(follow2, ae, final)
  );
  t.deepEqual(
    workflow.available(info, incl, init, follow1, follow2),
    DomainCollection(follow1, ae, final)
  );
  t.deepEqual(workflow.available(info, incl, final), DomainCollection());
  t.end();
});

test("Workflow next page set", t => {
  const { workflow, info, incl, init, follow1, follow2, ae, final } =
    buildWorkflow();
  t.deepEqual(workflow.next(), undefined);
  t.deepEqual(workflow.next(info), incl);
  t.deepEqual(workflow.next(info, incl), init);
  t.deepEqual(workflow.next(info, incl, init), follow1);
  t.deepEqual(workflow.next(info, incl, init, incl), undefined);
  t.deepEqual(workflow.next(info, incl, init, ae), undefined);
  t.deepEqual(workflow.next(info, incl, init, follow1), follow2);
  t.deepEqual(workflow.next(info, incl, init, follow1, follow2), undefined);
  t.deepEqual(
    workflow.next(info, incl, init, follow1, follow2, follow1),
    follow2
  );
  t.deepEqual(workflow.next(info, incl, final), undefined);
  t.end();
});

test("Secondary workflow", t => {
  const { workflow: main, info, incl, init, follow1 } = buildWorkflow();
  const workflow = new Workflow({
    name: "participant",
    many: DomainCollection(follow1),
    main,
  });
  t.deepEqual(workflow.available(), DomainCollection());
  t.deepEqual(workflow.available(info, incl, init), DomainCollection(follow1));
  t.end();
});

test("Default workflow", t => {
  const { incl, follow1 } = buildWorkflow();
  const pageSets = DomainCollection(incl, follow1);
  const { infoPage, infoPageSet, mainWorkflow } = Workflow.default(pageSets);
  t.deepLooseEqual(infoPageSet.pages, [infoPage]);
  t.equal(mainWorkflow.name, "main");
  t.equal(mainWorkflow.info, infoPageSet);
  t.equal(mainWorkflow.single, pageSets);
  t.equal(mainWorkflow.pageSets.length, 3);
  t.end();
});

function buildWorkflow() {
  const info = new PageSet("Information");
  const incl = new PageSet("Inclusion");
  const follow1 = new PageSet("Follow Up 1");
  const follow2 = new PageSet("Follow Up 2");
  const ae = new PageSet("Adverse event");
  const init = new PageSet("Initial consultation");
  const final = new PageSet("Final consultation");
  const workflow = new Workflow({
    info,
    single: DomainCollection(incl, init, final),
    many: DomainCollection(follow1, follow2, ae),
    sequence: DomainCollection(incl, init, follow1, follow2),
    stop: DomainCollection(final),
  });
  return { workflow, info, incl, init, final, follow1, follow2, ae };
}
