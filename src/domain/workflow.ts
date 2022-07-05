import { Domain } from "./domain.js";
import { DomainCollection } from "./domaincollection.js";
import { IDomainCollection } from "./domaincollectiondef.js";
import { PageSet } from "./pageSet.js";

export class Workflow {
  readonly info?: PageSet;
  readonly single = DomainCollection<PageSet>();
  readonly many = DomainCollection<PageSet>();
  readonly sequence = DomainCollection<PageSet>();
  readonly stop = DomainCollection<PageSet>();
  readonly name: string = "main";
  readonly main?: Workflow;
  readonly notifications = DomainCollection<string>();

  constructor(kwargs?: Partial<Workflow>) {
    Object.assign(this, kwargs);
    Domain.extend(this);
  }

  get pageSets(): IDomainCollection<PageSet> {
    const singleAux = this.single.filter(p => !this.sequence.includes(p));
    const manyAux = this.many.filter(p => !this.sequence.includes(p));
    return this.info
      ? DomainCollection(this.info, ...this.sequence, ...singleAux, ...manyAux)
      : DomainCollection(...this.sequence, ...singleAux, ...manyAux);
  }

  available(...done: PageSet[]): IDomainCollection<PageSet> {
    if (!this.main) return this.walkSequence(done);
    return this.main.walkSequence(done).filter(p => this.pageSets.includes(p));
  }

  private walkSequence(done: PageSet[]): IDomainCollection<PageSet> {
    switch (true) {
      case this.isEnded(done):
        return DomainCollection();
      case this.isNotInitialized(done):
        return DomainCollection(this.first);
      case this.isNotStarted(done):
        return DomainCollection(this.start);
      case this.isLoopEnded(done):
        return this.continueSequence(done, this.startLoop);
      default:
        return this.continueSequence(done);
    }
  }

  next(...done: PageSet[]): PageSet | undefined {
    switch (true) {
      case this.isSequenceBroken(done):
      case this.isEnded(done):
      case this.isNotInitialized(done):
      case this.isLoopEnded(done):
        return undefined;
      case this.isNotStarted(done):
        return this.start;
      default:
        return this.nextInSequence(done);
    }
  }

  get first(): PageSet {
    return this.info ?? this.sequence[0];
  }

  get start(): PageSet {
    return this.sequence[0];
  }

  private get startLoop(): PageSet {
    return this.sequence.find(p => this.many.includes(p)) as PageSet;
  }

  private isEnded(done: PageSet[]) {
    return this.stop.includes(done[done.length - 1]);
  }

  private isNotInitialized(done: PageSet[]) {
    return done.length == 0 && typeof this.info != undefined;
  }

  private isNotStarted(done: PageSet[]) {
    return !done.includes(this.sequence[0]);
  }

  private isSequenceBroken(done: PageSet[]) {
    return (
      !this.isInSequence(done) ||
      this.isComplete(done, this.nextInSequence(done))
    );
  }

  private isInSequence(done: PageSet[]) {
    return (
      this.isNotStarted(done) || this.sequence.includes(done[done.length - 1])
    );
  }

  private isComplete(done: PageSet[], next: PageSet) {
    return done.includes(next) && this.single.includes(next);
  }

  private isLoopEnded(done: PageSet[]) {
    return this.nextInSequence(done) == undefined;
  }

  private nextInSequence(done: PageSet[]) {
    const lastInSequence = done.reduce((last, p) => {
      const y = this.sequence.indexOf(p);
      return y == -1 ? last : y;
    }, -1);
    const nextInSequence = lastInSequence + 1;
    return this.sequence[nextInSequence];
  }

  private continueSequence(
    done: PageSet[],
    current = this.nextInSequence(done)
  ): IDomainCollection<PageSet> {
    const remainingSingle = this.single.filter(
      p => !done.includes(p) && !this.stop.includes(p) && current != p
    );
    const remainingMany = this.many.filter(p => !this.sequence.includes(p));
    return DomainCollection(
      ...(current ? [current] : []),
      ...remainingSingle,
      ...remainingMany,
      ...this.stop
    );
  }

  isInfo(pageSet: PageSet): boolean {
    return pageSet == this.info || pageSet == this.main?.info;
  }

  update(kwargs: Partial<Workflow>): Workflow {
    return Domain.update(this, kwargs, [Workflow]);
  }
}
