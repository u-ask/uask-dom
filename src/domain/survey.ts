import {
  CrossItemRule,
  ruleSequence,
  TriggerWhen,
} from "./rule/crossrule.js";
import { Domain } from "./domain.js";
import { DomainCollection } from "./domaincollection.js";
import { IDomainCollection } from "./domaincollectiondef.js";
import { Page } from "./page.js";
import { PageSet } from "./pageSet.js";
import { getItem, PageItem } from "./pageitem.js";
import { ConstantRule, UnitRule } from "./rule/unitrule.js";
import { Workflow } from "./workflow.js";

export class SurveyOptions {
  languages?: string[] = ["en", "fr"];
  defaultLang?: string = this.languages?.length ? this.languages[0] : "en";
  interviewDateVar?: string = "VDATE";
  phoneVar?: string = "__PHONE";
  emailVar?: string = "__EMAIL";
  showFillRate?: boolean = true;
  epro?: boolean = false;
  inclusionVar?: HideableVarDef = {
    name: "__INCLUDED",
    hidden: false,
  };
  unitSuffix?: string = "_UNIT";
  workflowVar?: string = "__WORKFLOW";
  participantCodeStrategy?: ParticipantCodeStrategy = {
    length: 5,
    bySample: false,
  };
}

export type ParticipantCodeStrategy = {
  length?: number;
  bySample?: boolean;
};

export type HideableVarDef = string | { name?: string; hidden?: boolean };

export function isVariableHidden(
  variableName: string,
  def?: HideableVarDef
): boolean {
  if (typeof def == "undefined") return false;
  if (typeof def == "string") return variableName == def;
  return variableName == def.name && !!def.hidden;
}

class Survey {
  readonly name: string;
  readonly options = new SurveyOptions();
  readonly workflows = DomainCollection<Workflow>();
  readonly pageSets = DomainCollection<PageSet>();
  readonly pages = DomainCollection<Page>();
  readonly crossRules = DomainCollection<CrossItemRule>();
  readonly items: IDomainCollection<PageItem<"prototype">>;
  readonly rules: IDomainCollection<CrossItemRule>;
  private readonly itemForVariables: Map<string, PageItem<"prototype">>;

  constructor(name: string, kwargs?: Partial<Survey>) {
    this.name = name;
    Object.assign(this, kwargs);
    this.itemForVariables = this.getItemForVariables();
    this.items = DomainCollection(...this.itemForVariables.values());
    this.rules = this.getRules();
    Object.defineProperty(this, "items", { enumerable: false });
    Object.defineProperty(this, "rules", { enumerable: false });
    Object.defineProperty(this, "itemForVariables", { enumerable: false });
    Domain.extend(this);
  }

  get mainWorkflow(): Workflow {
    return this.workflow("main") as Workflow;
  }

  workflow(name?: { workflow: string }): Workflow;
  workflow(name: string): Workflow | undefined;
  workflow(name?: { workflow: string } | string): Workflow | undefined {
    const workflowName =
      typeof name == "undefined"
        ? "main"
        : typeof name == "string"
        ? name
        : name.workflow;
    const workflow = this.workflows.find(w => w.name == workflowName);
    return (
      workflow ?? (typeof name == "string" ? undefined : this.mainWorkflow)
    );
  }

  private getItemForVariables() {
    return this.pages.reduce(
      (result, p) =>
        p.includes
          .filter((i): i is PageItem => i instanceof PageItem)
          .reduce((r, item) => {
            r.set(item.variableName, item);
            return r;
          }, result),
      new Map<string, PageItem<"prototype">>()
    );
  }

  getItemForVariable(variableName: string): PageItem<"prototype"> | undefined {
    return this.itemForVariables.get(variableName);
  }

  get inclusionPageSet(): PageSet | undefined {
    const inclusionVar =
      typeof this.options.inclusionVar == "string"
        ? this.options.inclusionVar
        : this.options.inclusionVar?.name;
    return this.pageSets.find(p =>
      p.items.some(i => getItem(i).variableName == inclusionVar)
    );
  }

  update(kwargs: Partial<Survey>): Survey {
    return Domain.update(this, kwargs, [Survey, this.name]);
  }

  private getRules(): IDomainCollection<CrossItemRule> {
    return this.items.reduce((rules, i) => {
      const r = Survey.getUnitRules(i).concat(
        this.crossRules.filter(r => r.target == i)
      );
      return ruleSequence(rules.append(...r));
    }, DomainCollection<CrossItemRule>());
  }

  get pins(): IDomainCollection<PageItem<"prototype">> {
    return this.items.filter(i => i.pin);
  }

  get kpis(): IDomainCollection<PageItem<"prototype">> {
    return this.items.filter(i => i.kpi);
  }

  private static getUnitRules(pageItem: PageItem<"prototype">) {
    const reducer = Survey.addUnitRule(pageItem);
    const allRules = pageItem.rules.reduce(
      (rules, r) => reducer(rules, r),
      DomainCollection<CrossItemRule>()
    );
    return pageItem.defaultValue == undefined
      ? allRules
      : reducer(
          allRules,
          pageItem.defaultValue as ConstantRule,
          "initialization"
        );
  }

  private static addUnitRule(pageItem: PageItem<"prototype">) {
    return (
      rules: IDomainCollection<CrossItemRule>,
      rule: UnitRule,
      when: TriggerWhen = "always"
    ) => rules.append(new CrossItemRule(pageItem, rule, when));
  }
}

export { Survey };
