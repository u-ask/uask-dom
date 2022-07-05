import {
  IDomainCollection,
  Survey,
  SurveyOptions,
  PageSet,
  Library,
  Workflow,
  Rule,
  CrossItemRule,
  PageItem,
  mlstring,
  Page,
  Interview,
  InterviewItem,
  Participant,
  Context,
} from "../domain/index.js";

type IDomain<U> = {
  update(kwargs: Partial<U>): U;
};

export type DNode<U> = U extends Library
  ? LibraryNode
  : U extends Page
  ? PageNode
  : U extends PageSet
  ? PageSetNode
  : U extends Page
  ? PageNode
  : U extends CrossItemRule
  ? CrossRulesNode
  : U extends Rule
  ? SingleNode<Rule>
  : U extends Survey
  ? SurveyNode
  : U extends Workflow
  ? WorkflowNode
  : U extends PageItem
  ? PageItemNode
  : U extends Interview
  ? InterviewNode
  : U extends InterviewItem
  ? InterviewItemNode
  : U extends Participant
  ? ParticipantNode
  : U extends IDomain<U>
  ? SingleNode<U>
  : U extends IDomain<infer R> | IDomain<infer T>
  ? SingleNode<R> | SingleNode<T>
  : U extends [infer R, infer T]
  ? [DNode<R>, DNode<T>]
  : U extends IDomainCollection<infer T>
  ? DNode<T>[]
  : U;

type PageNode = SingleNode<
  Omit<Page, "items" | "requiredItems" | "pins" | "array" | "kpis">
>;

type PageSetNode = SingleNode<
  Omit<PageSet, "pages" | "mandatoryPages" | "items" | "pins" | "kpis">
> & {
  readonly pageNames: string[];
  readonly mandatoryPageNames?: string[];
};

type LibraryNode = SingleNode<
  Omit<Library, "page" | "pageItems" | "items" | "contexts">
> & {
  readonly pageName: string;
  readonly variableNames?: string[];
  readonly contexts?: [string, Context][];
};

type CrossRulesNode = SingleNode<
  Omit<CrossItemRule, "pageItems" | "rule" | "name" | "target" | "precedence">
> & {
  variableNames: string[];
  when: string;
};

type SurveyNode = SingleNode<
  Omit<
    Survey,
    | "options"
    | "rules"
    | "pins"
    | "items"
    | "mainWorkflow"
    | "workflow"
    | "kpis"
    | "notifications"
  >
> & {
  readonly config: SurveyOptions;
};

type WorkflowNode = SingleNode<
  Omit<
    Workflow,
    | "main"
    | "info"
    | "single"
    | "many"
    | "sequence"
    | "stop"
    | "pageSets"
    | "signedPageSets"
    | "done"
    | "first"
    | "start"
  >
> & {
  infoType?: string;
  singleTypes: string[];
  manyTypes: string[];
  sequenceTypes: string[];
  stopTypes: string[];
};

type PageItemNode = SingleNode<
  Omit<PageItem, "comment" | "pin" | "defaultValue" | "instance" | "kpi">
> & {
  itemComment?: mlstring;
  pinTitle?: mlstring;
  kpiTitle?: mlstring;
  kpiPivot?: string;
  default: unknown;
};

type InterviewNode = DNode<
  Omit<
    Interview,
    | "options"
    | "pageSet"
    | "currentPage"
    | "date"
    | "fillRate"
    | "status"
    | "lastInput"
    | "alerts"
    | "isSufficient"
    | "pins"
    | "kpis"
    | "events"
    | "pendingEvents"
    | "acknowledgedEvents"
  >
> & {
  pageSetType: string;
  lastInput: string;
};

type InterviewItemNode = DNode<
  Omit<
    InterviewItem,
    | "pageItem"
    | "status"
    | "label"
    | "type"
    | "wording"
    | "alerts"
    | "acknowledgements"
  >
> & {
  variableName: string;
  instance?: number;
};

type ParticipantNode = DNode<
  Omit<
    Participant,
    | "currentInterview"
    | "nonce"
    | "options"
    | "lastInput"
    | "alerts"
    | "included"
  >
>;

/* bellow are utility types */

type SingleNode<T> = NodeRequired<T> & NodePartial<T>;

type NodeRequired<T> = Node<Required<T>>;

type NodePartial<T> = Partial<Node<NonRequired<T>>>;

type Node<T> = {
  +readonly [K in keyof T]: DNode<T[K]>;
};

type Required<T> = Pick<T, PropOf<T> & RequiredKeys<T>>;

type NonRequired<T> = Omit<T, PropOf<T> & RequiredKeys<T>>;

type RequiredKeys<T> = NonNullable<
  {
    [K in keyof T]: undefined extends T[K] ? never : K;
  }[keyof T]
>;

type PropOf<T> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];
