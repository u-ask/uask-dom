import {
  DomainCollection,
  PageSet,
  SurveyOptions,
  Workflow,
} from "../domain/index.js";
import { getTranslation } from "../domain/domain.js";
import { DNode } from "./abstracttree.js";
import {
  IDerivedWorkflowBuilder,
  IRawWorkflowBuilder,
  ISurveyBuilder,
  IWorkflowBuilder,
} from "./builders.js";

export class WorkflowBuilder
  implements
    IWorkflowBuilder,
    IDerivedWorkflowBuilder,
    IRawWorkflowBuilder,
    DNode<Workflow>
{
  readonly _infoType: string[] = [];
  readonly singleTypes: string[] = [];
  readonly manyTypes: string[] = [];
  readonly sequenceTypes: string[] = [];
  readonly stopTypes: string[] = [];
  readonly signedTypes: string[] = [];
  readonly notifications: string[] = [];
  private pageSetTypes: string[] = [];
  private built?: Workflow;

  constructor(
    readonly name: string,
    private readonly config: SurveyOptions,
    private main?: WorkflowBuilder,
    private readonly builder?: ISurveyBuilder
  ) {}

  get infoType(): string | undefined {
    return this._infoType[0];
  }

  home(name: string): IWorkflowBuilder & IRawWorkflowBuilder {
    if (this._infoType.length) this._infoType[0] = name;
    else this._infoType.push(name);
    return this;
  }

  auxiliary(...names: string[]): IWorkflowBuilder {
    return this.n(...names);
  }

  initial(...names: string[]): IWorkflowBuilder {
    return this.seq(...names);
  }

  followUp(...names: string[]): IWorkflowBuilder {
    this.seq(...names);
    this.n(...names);
    return this;
  }

  terminal(...names: string[]): IWorkflowBuilder & IRawWorkflowBuilder {
    return this.end(...names);
  }

  end(...names: string[]): IWorkflowBuilder & IRawWorkflowBuilder {
    this.stopTypes.push(...names);
    return this;
  }

  one(...names: string[]): IWorkflowBuilder & IRawWorkflowBuilder {
    this.singleTypes.push(...names);
    return this;
  }

  n(...names: string[]): IWorkflowBuilder & IRawWorkflowBuilder {
    this.manyTypes.push(...names);
    return this;
  }

  seq(...names: string[]): IWorkflowBuilder & IRawWorkflowBuilder {
    this.sequenceTypes.push(...names);
    return this;
  }

  notify(
    ...events: string[]
  ): IWorkflowBuilder & IRawWorkflowBuilder & IDerivedWorkflowBuilder {
    this.notifications.push(...events);
    return this;
  }

  signOn(...types: string[]): IWorkflowBuilder & IRawWorkflowBuilder {
    this.signedTypes.push(...types);
    return this;
  }

  withPageSets(...types: string[]): IDerivedWorkflowBuilder {
    if (!this.main) throw "main workflow is missing";
    if (this.main._infoType.length && types.includes(this.main._infoType[0]))
      this.home(this.main._infoType[0]);
    this.n(...this.main.manyTypes.filter(n => types.includes(n)));
    this.seq(...this.main.sequenceTypes.filter(n => types.includes(n)));
    this.terminal(...this.main.stopTypes.filter(n => types.includes(n)));
    this.signOn(...this.main.signedTypes.filter(n => types.includes(n)));
    this.pageSetTypes.push(...types);
    return this;
  }

  build(pageSets: PageSet[]): Workflow {
    if (this.built) return this.built;
    const keepPageSets = this.keep(pageSets);
    const { info, single, many, startsWith, endsWith } =
      this.getParts(keepPageSets);
    const main = this.main?.build(pageSets);
    this.built = new Workflow({
      name: this.name,
      info,
      single: DomainCollection(...single),
      many: DomainCollection(...many),
      sequence: DomainCollection(...startsWith),
      stop: DomainCollection(...endsWith),
      ...(this.main ? { main } : {}),
      notifications: DomainCollection(...this.notifications),
    });
    return this.built;
  }

  private getParts({ keep, ref }: { keep: PageSet[]; ref: WorkflowBuilder }) {
    const startsWith = this.buildSequence(keep, ref.sequenceTypes);
    const info = this.buildSequence(keep, ref._infoType)[0];
    const endsWith = this.buildSequence(keep, ref.stopTypes);
    const many = this.buildSequence(keep, ref.manyTypes);
    const single =
      this.singleTypes.length > 0
        ? this.buildSequence(keep, ref.singleTypes)
        : keep.filter(p => !many.includes(p) && p != info);
    return { info, single, many, startsWith, endsWith };
  }

  private keep(pageSets: PageSet[]) {
    if (this.name == "main") return { keep: pageSets, ref: this };
    if (this.pageSetTypes.length == 0)
      this.pageSetTypes = [
        ...this._infoType,
        ...this.singleTypes,
        ...this.manyTypes,
      ];
    if (this.pageSetTypes.length == 0)
      return { keep: pageSets, ref: this.main as WorkflowBuilder };
    return { keep: this.buildSequence(pageSets, this.pageSetTypes), ref: this };
  }

  private buildSequence(pageSets: PageSet[], names: string[]) {
    return names
      .map(n => this.findPageSet(pageSets, n))
      .sort()
      .map(i => pageSets[i]);
  }

  findPageSet(pageSets: PageSet[], n: string): number {
    const index = pageSets.findIndex(p => this.samePageSet(p, n));
    if (index == -1) this.notFound(n);
    return index;
  }

  private notFound(t: string) {
    throw `page set ${t} not found`;
  }

  private samePageSet(p: PageSet, t: string) {
    return getTranslation(p.type, "__code__", this.config.defaultLang) == t;
  }

  copy(names: string[]): WorkflowBuilder[] {
    return names.map(n => {
      const b = Object.create(WorkflowBuilder.prototype);
      Object.assign(b, { ...this, name: n });
      return b;
    });
  }
}
