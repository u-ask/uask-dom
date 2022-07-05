declare type InnerType<T> = T extends IDomainCollection<infer U> ? U : T extends (infer U)[] ? U : T;
interface IDomainCollection<T> {
    indexOf(element: T): number;
    update(mapper: (i: T) => T): this;
    append(...args: T[]): this;
    takeWhile(predicate: (i: T) => boolean): this;
    delete(filter: (i: T) => boolean): this;
    sort(): this;
    sort(comparer: (i: T, j: T) => number): this;
    partition(predicate: (i: T) => boolean): [this, this];
    flat(): IDomainCollection<InnerType<T>>;
    flatMap<U>(mapper: (value: T, index: number, array: T[]) => IDomainCollection<U> | ReadonlyArray<U>, thisArg?: unknown): IDomainCollection<U>;
    readonly [key: number]: T;
    readonly length: number;
    readonly last?: T;
    [Symbol.iterator](): IterableIterator<T>;
    entries(): IterableIterator<[number, T]>;
    every(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: unknown): boolean;
    some(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: unknown): boolean;
    includes(searchElement: T, fromIndex?: number): boolean;
    forEach(callbackfn: (value: T, index: number, array: readonly T[]) => void, thisArg?: unknown): void;
    find<S extends T>(predicate: (this: void, value: T, index: number, obj: readonly T[]) => value is S, thisArg?: unknown): S | undefined;
    find(predicate: (value: T, index: number, obj: readonly T[]) => unknown, thisArg?: unknown): T | undefined;
    findIndex(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: unknown): number;
    inverseImages<U extends Partial<T>>(others: IDomainCollection<U>, application: (i1: T, i2: U) => boolean): [IDomainCollection<U>, IDomainCollection<U>];
    map<U>(mapper: (value: T, index: number, array: T[]) => U, thisArg?: unknown): IDomainCollection<U>;
    reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: readonly T[]) => U, initialValue?: U): U;
    filter<S extends T>(predicate: (value: T, index: number, array: readonly T[]) => value is S, thisArg?: unknown): IDomainCollection<S>;
    filter(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: unknown): this;
    concat(...items: (T | ConcatArray<T> | IDomainCollection<T>)[]): this;
    slice(start?: number, end?: number): this;
}

declare type mlstring = string | Readonly<Record<string, string>>;
declare function isMLstring(o: unknown): o is mlstring;
declare function isML(o: mlstring): o is Record<string, string>;
declare function getTranslation(label: mlstring | undefined, lang?: string, fallbackLang?: string): string | undefined;
declare function setTranslation(defaultLang?: string): (label: mlstring | undefined, lang: string, translation: string) => mlstring;

declare type WithFixedLabels = {
    labels: mlstring[];
    rawValues: unknown[];
};
declare function hasFixedLabels(i: ItemType): i is ItemType & WithFixedLabels;
interface ItemType {
    name: string;
    nature?: "categorical" | "numerical";
    label(value: unknown, lang?: string): string | undefined;
    rawValue(value: unknown): string | number | undefined;
    typedValue(value: unknown, ctx?: unknown): unknown;
}
declare function isamplemType(o: unknown): o is ItemType;
declare class TextType implements ItemType {
    readonly name = "text";
    label(value: unknown, lang?: string): string | undefined;
    rawValue(value: unknown): string;
    typedValue(value: unknown): unknown;
}
declare class ImageType implements ItemType {
    readonly name = "image";
    label(): string;
    rawValue(): undefined;
    typedValue(value: unknown): unknown;
}
declare abstract class AbstractNumberType implements ItemType {
    abstract readonly name: string;
    readonly nature: "numerical" | "categorical";
    protected readonly constr: any;
    constructor();
    label(value: unknown, lang?: string): string | undefined;
    rawValue(value: string | number): number;
    typedValue(value: unknown): unknown;
}
declare class RealType extends AbstractNumberType {
    readonly name = "real";
}
declare class IntegerType extends AbstractNumberType {
    readonly name = "integer";
    typedValue(value: unknown): unknown;
}
declare class DateType implements ItemType {
    readonly incomplete: boolean;
    readonly month: boolean;
    readonly name = "date";
    constructor(incomplete?: boolean, month?: boolean);
    label(value: unknown): string | undefined;
    rawValue(value: string | number | Date): string | undefined;
    typedValue(value: unknown): unknown;
}
declare class TimeType implements ItemType {
    readonly duration: boolean;
    readonly name = "time";
    constructor(duration?: boolean);
    label(value: unknown): string | undefined;
    rawValue(value: string | Date | number): string | undefined;
    typedValue(value: unknown): unknown;
    formatTime(time: number): string;
}
declare class YesNoType implements ItemType, WithFixedLabels {
    readonly name = "yesno";
    readonly nature = "categorical";
    readonly labels: {
        __code__: string;
        en: string;
        fr: string;
    }[];
    readonly rawValues: number[];
    label(value: boolean | number | undefined, lang?: string): string | undefined;
    rawValue(value: unknown): number;
    typedValue(value: unknown): unknown;
}
declare class ScoreType extends AbstractNumberType implements WithFixedLabels {
    readonly scores: number[];
    readonly defaultLang?: string | undefined;
    readonly labels: mlstring[];
    readonly name = "score";
    readonly nature = "categorical";
    readonly rawValues: unknown[];
    constructor(scores: number[], defaultLang?: string | undefined, labels?: mlstring[]);
    lang(lang: string): this;
    wording(...labels: string[]): this;
    translate(lang: string, ...labels: string[]): this;
    private getLabel;
    label(value: number, lang?: string): string | undefined;
}
declare class ScaleType extends AbstractNumberType implements WithFixedLabels {
    readonly min: number;
    readonly max: number;
    readonly defaultLang?: string | undefined;
    readonly labels: mlstring[];
    readonly name = "scale";
    readonly rawValues: unknown[];
    constructor(min: number, max: number, defaultLang?: string | undefined, labels?: mlstring[]);
    lang(lang: string): this;
    wording(...labels: string[]): this;
    translate(lang: string, ...labels: string[]): this;
    private getLabel;
    label(value: number, lang?: string): string | undefined;
}
declare class ChoiceType implements ItemType, WithFixedLabels {
    readonly multiplicity: "one" | "many";
    readonly choices: string[];
    readonly defaultLang?: string | undefined;
    readonly labels: mlstring[];
    readonly name: string;
    readonly nature = "categorical";
    readonly rawValues: unknown[];
    constructor(multiplicity: "one" | "many", choices: string[], defaultLang?: string | undefined, labels?: mlstring[]);
    lang(lang: string): ChoiceType;
    wording(...labels: string[]): ChoiceType;
    translate(lang: string, ...labels: string[]): ChoiceType;
    private getLabel;
    label(value: unknown, lang?: string): string | undefined;
    rawValue(value: unknown): string;
    typedValue(value: unknown): unknown;
}
declare class GlossaryType extends ChoiceType {
    readonly name: string;
}
interface CountryType extends GlossaryType {
}
declare class CountryType {
    readonly defaultLang?: string | undefined;
    constructor(multiplicity: "one" | "many", defaultLang?: string | undefined);
}
declare class AcknowledgeType implements ItemType, WithFixedLabels {
    readonly name = "acknowledge";
    readonly nature = "categorical";
    readonly labels: {
        __code__: string;
        en: string;
        fr: string;
    }[];
    readonly rawValues: unknown[];
    label(value: unknown, lang?: string): string | undefined;
    rawValue(value: unknown): number | undefined;
    typedValue(value: unknown): unknown;
}
declare class InfoType implements ItemType {
    readonly name = "info";
    label(value: unknown): string | undefined;
    rawValue(): undefined;
    typedValue(): unknown;
}
declare class ContextType implements HasContext<ItemType> {
    readonly name = "context";
    [context: number]: ItemType;
    constructor(types: ItemType[] | {
        [ctx: number]: ItemType;
    });
    label(value: unknown, lang?: string, ctx?: number): string | undefined;
    rawValue(value: unknown, ctx?: number): number | string | undefined;
    typedValue(value: unknown, ctx?: number): unknown;
}

declare class ComputedParser {
    private formula;
    private variableNames;
    private constructor();
    static parse(variableName: string | undefined, formula: string): {
        variableNames: string[];
        formula: string;
    };
    private static parseVars;
    private static rewrite;
}
declare class Macros {
    static memorize(variableName: string): string;
}

declare type Dynamical<T extends UnitRule | CrossRule, S extends unknown[]> = {
    (...args: S): T;
};

declare type RuleName = "required" | "critical" | "constant" | "copy" | "inRange" | "maxLength" | "fixedLength" | "decimalPrecision" | "letterCase" | "activation" | "computed" | "dynamic";
declare type RuleArgs = {
    name: RuleName;
    [name: string]: unknown;
};
declare type RuleFactory<T extends UnitRule | CrossRule> = (...args: unknown[]) => T;
declare class Rules {
    static required: (enforced?: boolean) => UnitRule;
    static critical: (event: string, message?: string, ...values: unknown[]) => UnitRule;
    static constant: (value: unknown) => UnitRule;
    static copy: () => CrossRule;
    static inRange: (min?: number, max?: number, limits?: Limits) => UnitRule;
    static maxLength: (length: number) => UnitRule;
    static fixedLength: (length: number) => UnitRule;
    static decimalPrecision: (precision: number) => UnitRule;
    static letterCase: (letterCase: "upper" | "lower") => UnitRule;
    static activation: (values: unknown[], behavior: "enable" | "show") => CrossRule;
    static computed: (formula: string, argCount?: number) => CrossRule;
    static dynamic: <T extends CrossRule | UnitRule, S extends unknown[]>(rule: RuleName | Dynamical<T, S>, computed: [formula: string, argCount?: number], ...extraArgs: unknown[]) => CrossRule;
    static create<T extends UnitRule | CrossRule>(args: RuleArgs): T;
    static create<T extends UnitRule | CrossRule>(name: RuleName, ...args: unknown[]): T;
    static args({ name, ...args }: RuleArgs): unknown[];
    static factory<T extends UnitRule | CrossRule>(name: RuleName): RuleFactory<T>;
    static find<T extends Rule | CrossItemRule>(rules: IDomainCollection<T>, name: RuleName, ...args: unknown[]): T | undefined;
    static matchRule(rule: CrossItemRule | Rule, ruleName: RuleName, ...args: unknown[]): boolean;
    static matchDirectRule(rule: CrossItemRule | Rule, ruleName: RuleName, args: unknown[]): boolean;
    static matchDynamicRule(rule: CrossItemRule | Rule, ruleName: RuleName, args: unknown[]): boolean;
    private static isSubset;
}

declare type ItemMessages = RuleMessages & {
    __acknowledged: ReadonlyArray<RuleName>;
};
declare function hasMessages(o: RuleMessages): boolean;
declare function isamplemMessages(o: RuleMessages): o is ItemMessages;
declare function areMessagesEqual(m1: ItemMessages | RuleMessages, m2: ItemMessages | RuleMessages, ruleName: RuleName): boolean;
declare function acknowledge(messages: ItemMessages | RuleMessages, ...ruleNames: RuleName[]): ItemMessages;
declare function reiterate(messages: ItemMessages | RuleMessages, ...ruleNames: RuleName[]): RuleMessages | ItemMessages;
declare function isAcknowledged(messages: ItemMessages | RuleMessages, ruleName: RuleName): boolean;
declare function alerts(messages: ItemMessages | RuleMessages): string[];
declare function acknowledgements(messages: ItemMessages | RuleMessages): string[];
declare function messageEntries(messages?: ItemMessages | RuleMessages): (readonly [RuleName, string, boolean])[];
declare function getMessage(messages: RuleMessages | ItemMessages, ruleName: RuleName): string;
declare function messageNames(messages: RuleMessages | ItemMessages): RuleName[];

declare type Difference<T> = Partial<T> & {
    operation?: mlstring;
};
interface Differentiable {
    diff(previous: this | undefined): Difference<this>;
}

declare type SpecialValue = "unknown" | "notApplicable" | "notDone" | undefined;
declare type InterviewItemLike = Pick<InterviewItem, "value" | "pageItem" | "context" | "unit" | "specialValue" | "messages">;
declare function status(item: InterviewItemLike): "missing" | "fulfilled" | "info";
declare class InterviewItem implements ItemWithContext, Differentiable {
    readonly value: unknown;
    readonly pageItem: PageItem;
    readonly context: Context;
    readonly unit?: string;
    readonly specialValue: SpecialValue;
    readonly messages: RuleMessages | ItemMessages;
    constructor(pageItem: Item, value: unknown, kwargs?: Partial<InterviewItem>);
    update(kwargs: Partial<InterviewItem>): InterviewItem;
    private messagesEqual;
    get status(): "missing" | "fulfilled" | "info";
    get wording(): mlstring;
    get type(): ItemType;
    get alerts(): string[];
    get acknowledgements(): string[];
    get event(): {
        event: string;
        acknowledged: boolean;
    } | undefined;
    acknowledge(...ruleNames: RuleName[]): InterviewItem;
    reiterate(...ruleNames: RuleName[]): InterviewItem;
    acknowledgeEvent(): InterviewItem;
    label(lang?: string): string | undefined;
    diff(previous: this | undefined): Difference<this>;
}

declare type HasValue = {
    value?: unknown;
    unit?: string;
    specialValue?: SpecialValue;
    messages?: RuleMessages;
    context?: Context;
};
declare type RuleMessages = {
    [K in RuleName]?: string;
};
interface Rule {
    readonly name: string;
    readonly precedence: number;
}
declare function update(target: InterviewItem, kwargs: HasValue): InterviewItem;
declare function update(target: HasValue, kwargs: HasValue): HasValue;
declare function setMessageIf(condition: boolean): (messages: RuleMessages | undefined, name: string, message: string) => RuleMessages | undefined;
declare function unsetMessage(messages: RuleMessages | undefined, name: string): RuleMessages | undefined;
declare function setMessage(messages: RuleMessages | undefined, name: string, message: string): RuleMessages;

interface UnitRule extends Rule {
    execute(arg: HasValue): HasValue;
}
declare class ConstantRule implements UnitRule {
    readonly value: unknown;
    constructor(value: unknown);
    readonly name: string;
    readonly precedence: number;
    execute(a: HasValue): HasValue;
}
declare const limits: {
    includeNone: {
        includeLower: boolean;
        includeUpper: boolean;
    };
    includeLower: {
        includeLower: boolean;
        includeUpper: boolean;
    };
    includeUpper: {
        includeLower: boolean;
        includeUpper: boolean;
    };
    includeBoth: {
        includeLower: boolean;
        includeUpper: boolean;
    };
};
declare type Limits = typeof limits[keyof typeof limits];

declare type InstanceNumber<T extends "prototype" | "instance"> = T extends "prototype" ? 1 : number;
declare class PageItem<T extends "prototype" | "instance" = "prototype" | "instance"> {
    readonly wording: mlstring | HasContext<mlstring>;
    readonly variableName: string;
    readonly type: ItemType | HasContext<ItemType>;
    readonly rules: IDomainCollection<UnitRule>;
    readonly units?: {
        values: string[];
        isExtendable: boolean;
    } | string[];
    readonly comment?: mlstring;
    readonly section?: mlstring;
    readonly pin?: mlstring;
    readonly kpi?: mlstring | PivotKpi;
    readonly defaultValue?: ConstantRule;
    readonly array: boolean;
    readonly instance: InstanceNumber<T>;
    constructor(wording: mlstring | HasContext<mlstring>, variableName: string, type: ItemType | HasContext<ItemType>, kwargs?: Partial<PageItem<T>>);
    private static instanceMap;
    nextInstance(): PageItem;
    hasNextInstance(): boolean;
    isInstanceOf(prototype: PageItem<"prototype">, instance?: number): boolean;
    samePrototype(instance: PageItem): boolean;
    update(kwargs: Partial<PageItem<T>>): PageItem<T>;
    static getInstance(prototype: PageItem<"prototype">, instance: number): PageItem<"instance">;
    private static getSibling;
    static getInstances(prototype: PageItem<"prototype">): PageItem[];
}
declare type SingleContext = number;
declare type Memento = number | string;
declare type ContextWithMemento = [SingleContext, Memento];
declare type Context = SingleContext | ContextWithMemento;
declare function hasMemento(context: Context | undefined): context is ContextWithMemento;
interface ItemWithContext<T extends "prototype" | "instance" = "prototype" | "instance"> {
    pageItem: PageItem<T>;
    context: Context;
}
declare type HasContext<T extends mlstring | ItemType> = T extends ItemType ? {
    [context: number]: T;
} & T : mlstring[];
declare type Item<T extends "prototype" | "instance" = "prototype" | "instance"> = PageItem<T> | ItemWithContext<T>;
declare function isamplem(item: unknown): item is Item;
declare function isContextual(o: mlstring | HasContext<mlstring>): o is HasContext<mlstring>;
declare function isContextual(o: ItemType | HasContext<ItemType>): o is HasContext<ItemType>;
declare function getItem(item: Item): PageItem;
declare function getItemContext(item: Item | {
    context?: Context;
}): SingleContext;
declare function hasContext(item: Item | {
    context?: Context;
}): item is ItemWithContext;
declare function getItemWording(item: Item | {
    wording: mlstring | mlstring[];
    context?: Context;
}): mlstring;
declare function getItemType(item: Item | {
    type: ItemType;
    context?: Context;
}): ItemType;
declare function getItemUnits(item: Item): string[];
declare function getItemMemento(item: Item | {
    context?: Context;
}): Memento | undefined;
declare function groupBySection<T extends {
    pageItem: Item;
}>(pageItems: IDomainCollection<T>): IDomainCollection<{
    title?: mlstring;
    items: IDomainCollection<T>;
}>;
declare type PivotKpi = {
    title: mlstring;
    pivot: PageItem;
};
declare function hasPivot(kpi: undefined | mlstring | PivotKpi): kpi is PivotKpi;

declare class Sample {
    readonly sampleCode: string;
    readonly name: string;
    readonly address: string;
    readonly frozen: boolean;
    constructor(sampleCode: string, kwargs?: Partial<Sample>);
    update(kwargs: Partial<Sample>): Sample;
    freeze(): Sample;
}

declare const inDateItem: PageItem<"prototype" | "instance">;
declare const sampleItem: PageItem<"prototype" | "instance">;
declare const acknowledgeItem: PageItem<"prototype" | "instance">;
declare const undefinedItem: PageItem<"prototype" | "instance">;
declare const todayItem: PageItem<"prototype" | "instance">;
declare const thisYearItem: PageItem<"prototype" | "instance">;
declare const globalItems: PageItem<"prototype" | "instance">[];
declare type ScopeLevel = "global" | "outer" | "local";
declare type ScopedItem = readonly [PageItem, ScopeLevel];
declare function isScopedItem(x: unknown): x is ScopedItem;
declare type Missing = {
    missing: true;
};
declare function isMissing(o: Partial<Missing>): o is Missing;
declare function getScopedItem(x: PageItem | ScopedItem): PageItem;
declare function getScope(x: PageItem | ScopedItem): ScopeLevel;
interface IScope {
    readonly items: InterviewItem[];
    get(pageItem: PageItem, level: ScopeLevel): InterviewItem | Missing | undefined;
}
declare abstract class AbstractScope {
    readonly items: InterviewItem[];
    readonly pageItems: Coll<Item>;
    constructor(items: InterviewItem[], pageItems: Coll<Item>);
    protected getItem(pageItem: PageItem): InterviewItem | Missing | undefined;
    private shouldExist;
}
declare class GlobalScope extends AbstractScope implements IScope {
    readonly participant?: {
        lastInput: Date;
        sample?: Sample | undefined;
    } | undefined;
    constructor(participant?: {
        lastInput: Date;
        sample?: Sample | undefined;
    } | undefined);
    get(pageItem: PageItem, level: ScopeLevel): InterviewItem | Missing | undefined;
}
declare type Coll<T> = IDomainCollection<T> | ReadonlyArray<T>;
declare type Hasamplems = {
    items: Coll<InterviewItem>;
    pageSet?: {
        items: Coll<Item>;
    };
};
declare type Scopable = Coll<Hasamplems> | {
    lastInput: Date;
    interviews: Coll<Hasamplems>;
};
declare class Scope extends AbstractScope implements IScope {
    readonly parentScope: IScope;
    readonly items: InterviewItem[];
    readonly pageItems: Coll<Item>;
    private constructor();
    get(pageItem: PageItem | ScopedItem): InterviewItem | undefined;
    get(pageItem: PageItem, level: ScopeLevel): InterviewItem | undefined;
    with(transients: InterviewItem[]): Scope;
    static create(outer: Scopable, local?: Hasamplems): Scope;
    private static getItemsByScopes;
    private static takeOuter;
    private static merge;
}

declare class Library {
    readonly page: Page;
    readonly pageItems?: IDomainCollection<PageItem<"prototype">> | undefined;
    readonly contexts?: IDomainCollection<ItemWithContext<"prototype">> | undefined;
    constructor(page: Page, pageItems?: IDomainCollection<PageItem<"prototype">> | undefined, contexts?: IDomainCollection<ItemWithContext<"prototype">> | undefined);
    get items(): IDomainCollection<Item<"prototype">>;
}
declare type Include = Library | PageItem<"prototype">;
declare class Page {
    readonly name: mlstring;
    readonly includes: IDomainCollection<Include>;
    readonly items: IDomainCollection<Item<"prototype">>;
    readonly array: boolean;
    readonly requiredItems: IDomainCollection<Item<"prototype">>;
    readonly pins: IDomainCollection<Item<"prototype">>;
    readonly kpis: IDomainCollection<Item<"prototype">>;
    readonly exportConfig?: {
        fileName?: string;
    };
    constructor(name: mlstring, kwargs?: Partial<Page>);
    private getItems;
    private getRequiredItems;
    private getPins;
    private getKpis;
    private isArray;
    update(kwargs: Partial<Page>): Page;
}

declare class PageSet {
    readonly type: mlstring;
    readonly pages: IDomainCollection<Page>;
    readonly datevar: string | undefined;
    readonly items: IDomainCollection<Item<"prototype">>;
    readonly mandatoryPages?: IDomainCollection<Page> | undefined;
    private readonly itemForVariables;
    private readonly pagesForItems;
    constructor(type: mlstring, kwargs?: Partial<PageSet>);
    private getItemForVariables;
    private getPagesForItems;
    private addItemsForPage;
    private addItemForPage;
    private getItems;
    update(kwargs: Partial<PageSet>): PageSet;
    getPagesForItem(item: Item): IDomainCollection<Page>;
    getItemForVariable(variableName: string): Item<"prototype"> | undefined;
    hasamplem(item: Item<"prototype">): boolean;
    isMandatory(page: Page): boolean;
    get pins(): IDomainCollection<Item<"prototype">>;
    get kpis(): IDomainCollection<Item<"prototype">>;
}

declare type Status = "incomplete" | "fulfilled" | "insufficient" | "empty" | "canceled";

interface Alert {
    readonly message: mlstring;
    readonly item?: Item;
    readonly page?: Page;
    readonly interview: Interview;
    readonly type: "rule" | "query" | "checking";
    readonly tags?: {
        [k: string]: string | string[];
    };
}
declare class RuleAlert implements Alert {
    readonly message: string;
    readonly item: Item;
    readonly interview: Interview;
    readonly tags?: {
        [k: string]: string | string[];
    } | undefined;
    constructor(message: string, item: Item, interview: Interview, tags?: {
        [k: string]: string | string[];
    } | undefined);
    get type(): "rule";
}
declare class QueryAlert implements Alert {
    readonly message: mlstring;
    readonly item: Item;
    readonly interview: Interview;
    readonly tags?: {
        [k: string]: string;
    } | undefined;
    constructor(message: mlstring, item: Item, interview: Interview, tags?: {
        [k: string]: string;
    } | undefined);
    get type(): "query";
}
declare class CheckAlert implements Alert {
    readonly message: mlstring;
    readonly page: Page;
    readonly interview: Interview;
    readonly tags?: {
        [k: string]: string | string[];
    } | undefined;
    constructor(message: mlstring, page: Page, interview: Interview, tags?: {
        [k: string]: string | string[];
    } | undefined);
    get type(): "checking";
}

declare type ZippedInterview = [
    Partial<Interview>,
    {
        items: Partial<InterviewItem>[];
    }
];
declare class Interview implements Differentiable {
    readonly nonce: number;
    readonly pageSet: PageSet;
    readonly options: SurveyOptions;
    readonly items: IDomainCollection<InterviewItem>;
    readonly lastInput: Date;
    private readonly _itemsForPages;
    private readonly _statusForPages;
    private readonly _itemForVariables;
    constructor(pageSet: PageSet, options: SurveyOptions, kwargs?: Partial<Interview>);
    private get itemForVariables();
    private get itemsForPages();
    private get statusForPages();
    private getItemForVariables;
    private getItemKey;
    private getItemsForPages;
    private setItemForPages;
    private getStatusForPages;
    private getPageToStatus;
    private emptyStatus;
    private nonEmptyStatus;
    private itemsNeedAnswer;
    private requiredItemsNeedAnswer;
    private itemNeedsAnswer;
    private getFulfilledItems;
    private isPageEmpty;
    private isEmptySoFar;
    private isEmptyNow;
    get status(): Status;
    private changeStatus;
    private isInsufficientSoFar;
    private isIncompleteSoFar;
    get date(): Date | undefined;
    get workflow(): string | undefined;
    get included(): boolean | undefined;
    get events(): IDomainCollection<string>;
    get pendingEvents(): IDomainCollection<string>;
    get acknowledgedEvents(): IDomainCollection<string>;
    private getString;
    private getBool;
    getItem(v?: HideableVarDef): InterviewItem | undefined;
    get fillRate(): number;
    get currentPage(): Page;
    private getStatusEntries;
    pageOf(item: InterviewItem): Page | undefined;
    get alerts(): IDomainCollection<RuleAlert>;
    get pins(): IDomainCollection<InterviewItem | undefined>;
    get kpis(): IDomainCollection<InterviewItem | [InterviewItem, InterviewItem]>;
    private getItemForPin;
    private getItemForKpi;
    private isKpi;
    private getKpi;
    update(kwargs: Partial<Interview> | ZippedInterview): Interview;
    private zip;
    private zipItems;
    private zipArray;
    private zipNthElem;
    getStatusForPage(page: Page): Status;
    getItemsForPage(page: Page): IDomainCollection<InterviewItem>;
    getItemForVariable(varItem: PageItem | string, instance?: number): InterviewItem | undefined;
    getItemsForPrototype(prototype: PageItem<"prototype">): IDomainCollection<InterviewItem>;
    nextInstance(item: InterviewItem): InterviewItem | undefined;
    hasNextInstance(item: InterviewItem): boolean;
    diff(previous: this | undefined): Difference<this>;
}
declare function getLastItems(interviews: IDomainCollection<Interview>, pageItems: IDomainCollection<PageItem<"prototype"> | string>): IDomainCollection<InterviewItem | undefined>;

declare class Workflow {
    readonly info?: PageSet;
    readonly single: IDomainCollection<PageSet>;
    readonly many: IDomainCollection<PageSet>;
    readonly sequence: IDomainCollection<PageSet>;
    readonly stop: IDomainCollection<PageSet>;
    readonly name: string;
    readonly main?: Workflow;
    readonly notifications: IDomainCollection<string>;
    constructor(kwargs?: Partial<Workflow>);
    get pageSets(): IDomainCollection<PageSet>;
    available(...done: PageSet[]): IDomainCollection<PageSet>;
    private walkSequence;
    next(...done: PageSet[]): PageSet | undefined;
    get first(): PageSet;
    get start(): PageSet;
    private get startLoop();
    private isEnded;
    private isNotInitialized;
    private isNotStarted;
    private isSequenceBroken;
    private isInSequence;
    private isComplete;
    private isLoopEnded;
    private nextInSequence;
    private continueSequence;
    isInfo(pageSet: PageSet): boolean;
    update(kwargs: Partial<Workflow>): Workflow;
}

declare class Participant {
    readonly participantCode: string;
    readonly sample: Sample;
    readonly interviews: IDomainCollection<Interview>;
    constructor(participantCode: string, sample: Sample, kwargs?: Partial<Participant>);
    get inclusionDate(): Date | undefined;
    get firstDate(): Date | undefined;
    currentInterview(workflow: Workflow): Interview;
    get lastInput(): Date;
    get workflow(): string | undefined;
    get included(): boolean;
    getValues(...pageItems: PageItem<"prototype">[]): IDomainCollection<unknown>;
    currentItems(pageItems: IDomainCollection<PageItem<"prototype">>, interview?: Interview): IDomainCollection<InterviewItem | undefined>;
    private soFar;
    get alerts(): IDomainCollection<Alert>;
    availablePageSets(workflow: Workflow): IDomainCollection<PageSet>;
    availableInterviews(workflow: Workflow): IDomainCollection<Interview>;
    next(workflow: Workflow, interview: Interview): Interview | PageSet | undefined;
    first(workflow: Workflow): PageSet;
    update(kwargs: Partial<Participant>): Participant;
}
declare function formatCode(participant: Pick<Participant, "participantCode">, options?: SurveyOptions): string;

interface CrossRule extends Rule {
    execute(...args: HasValue[]): HasValue[];
}
declare function getRuleArgs(rule: Rule | UnitRule): Record<string, unknown>;
declare type TriggerWhen = "always" | "initialization";
declare type Prototype = PageItem<"prototype">;
declare class CrossItemRule implements CrossRule {
    readonly when: TriggerWhen;
    readonly pageItems: IDomainCollection<Prototype | ScopedItem>;
    private readonly rule;
    constructor(q: IDomainCollection<Prototype | readonly [Prototype, ScopeLevel]> | Prototype | readonly [Prototype, ScopeLevel], rule: CrossRule | UnitRule, when?: TriggerWhen);
    get name(): string;
    get precedence(): number;
    get args(): Record<string, unknown>;
    get target(): Prototype;
    is<T extends Rule, U extends unknown[]>(name: RuleName): boolean;
    execute(...args: HasValue[]): HasValue[];
}
declare function unitToCrossRules(pageItem: Prototype): IDomainCollection<CrossItemRule>;
declare function parseVariableNames(variableNames: string[]): (readonly [string, ScopeLevel])[];
declare function parseVariableName(v: string): readonly [string, "global" | "outer" | "local"];
declare function getVariableName(pageItem: Prototype | readonly [Prototype, ScopeLevel]): string;
declare function link(parsed: {
    variableNames: string[];
    rule: CrossRule;
}, pageItems: Prototype[], when?: TriggerWhen): CrossItemRule;
declare type TriggerForItems = {
    initialization?: InterviewItem[];
};
declare function execute(rules: IDomainCollection<CrossItemRule>, participant: Participant, when?: TriggerWhen[], startsWith?: Interview): Participant;
declare function execute(rules: IDomainCollection<CrossItemRule>, scope: Scope, when?: TriggerWhen[]): Scope;
declare function execute(rules: IDomainCollection<CrossItemRule>, scope: Scope, when: TriggerForItems): Scope;
declare function ruleSequence(rules: IDomainCollection<CrossItemRule>): IDomainCollection<CrossItemRule>;
declare function compareRules([i1, r1]: readonly [number, CrossItemRule], [i2, r2]: readonly [number, CrossItemRule]): number;
declare function comparePrecedences(r1: CrossItemRule, r2: CrossItemRule): number;

declare class SurveyOptions {
    languages?: string[];
    defaultLang?: string;
    interviewDateVar?: string;
    phoneVar?: string;
    emailVar?: string;
    showFillRate?: boolean;
    epro?: boolean;
    inclusionVar?: HideableVarDef;
    unitSuffix?: string;
    workflowVar?: string;
    participantCodeStrategy?: ParticipantCodeStrategy;
}
declare type ParticipantCodeStrategy = {
    length?: number;
    bySample?: boolean;
};
declare type HideableVarDef = string | {
    name?: string;
    hidden?: boolean;
};
declare function isVariableHidden(variableName: string, def?: HideableVarDef): boolean;
declare class Survey {
    readonly name: string;
    readonly options: SurveyOptions;
    readonly workflows: IDomainCollection<Workflow>;
    readonly pageSets: IDomainCollection<PageSet>;
    readonly pages: IDomainCollection<Page>;
    readonly crossRules: IDomainCollection<CrossItemRule>;
    readonly items: IDomainCollection<PageItem<"prototype">>;
    readonly rules: IDomainCollection<CrossItemRule>;
    private readonly itemForVariables;
    constructor(name: string, kwargs?: Partial<Survey>);
    get mainWorkflow(): Workflow;
    workflow(name?: {
        workflow: string;
    }): Workflow;
    workflow(name: string): Workflow | undefined;
    private getItemForVariables;
    getItemForVariable(variableName: string): PageItem<"prototype"> | undefined;
    get inclusionPageSet(): PageSet | undefined;
    update(kwargs: Partial<Survey>): Survey;
    private getRules;
    get pins(): IDomainCollection<PageItem<"prototype">>;
    get kpis(): IDomainCollection<PageItem<"prototype">>;
    private static getUnitRules;
    private static addUnitRule;
}

declare type TypeName = "text" | "real" | "integer" | "date" | "yesno" | "acknowledge" | "scale" | "score" | "choice" | "glossary" | "countries" | "context" | "image" | "time" | "info";
declare type TypeArgs = {
    name: TypeName;
    [name: string]: unknown;
};
declare class ItemTypes {
    static readonly text: ItemType;
    static readonly real: ItemType;
    static readonly integer: ItemType;
    static readonly yesno: ItemType;
    static readonly info: ItemType;
    static readonly acknowledge: ItemType;
    static readonly image: ItemType;
    static readonly date: typeof ItemTypes._date;
    private static _date;
    static readonly time: (duration?: boolean) => TimeType;
    static readonly scale: (min: number, max: number) => ScaleType;
    static readonly score: (...scores: number[]) => ScoreType;
    static readonly choice: (multiplicity: "one" | "many", ...choices: string[]) => ChoiceType;
    static readonly countries: (multiplicity: "one" | "many") => CountryType;
    static readonly glossary: (multiplicity: "one" | "many", ...choices: string[]) => GlossaryType;
    static context(types: ItemType[] | {
        [ctx: number]: ItemType;
    }): ContextType;
    static create({ name, ...args }: TypeArgs): ItemType;
}

declare class DomainCollectionImpl<T> extends Array<T> implements IDomainCollection<T> {
    get last(): T | undefined;
    private constr;
    update(mapper: (i: T) => T): this;
    append(...args: T[]): this;
    takeWhile(predicate: (i: T) => boolean): this;
    delete(predicate: (i: T) => boolean): this;
    partition(predicate: (i: T) => boolean): [this, this];
    private isFlat;
    flat<U = InnerType<T>>(): IDomainCollection<U> & U[];
    flatMap<U>(mapper: (value: T, index: number, array: T[]) => U | IDomainCollection<U> | ReadonlyArray<U>, thisArg?: unknown): IDomainCollection<U> & U[];
    inverseImages<U extends Partial<T>>(others: IDomainCollection<U>, application: (i1: T, i2: U) => boolean): [IDomainCollection<U>, IDomainCollection<U>];
    private intersectImage;
    private complementImage;
    map(mapper: (value: T, index: number, array: T[]) => T, thisArg?: unknown): this;
    map<U>(mapper: (value: T, index: number, array: T[]) => U, thisArg?: unknown): IDomainCollection<U>;
    private m;
    filter<S extends T>(predicate: (value: T, index: number, array: readonly T[]) => value is S, thisArg?: unknown): IDomainCollection<S> & S[];
    filter(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: unknown): this;
    concat(...items: (T | ConcatArray<T> | IDomainCollection<T>)[]): this;
    slice(start?: number, end?: number): this;
    sort(): this;
    sort(comparer: (i: T, j: T) => number): this;
}
declare function DomainCollection<T>(...items: T[]): IDomainCollection<T>;

declare class User {
    readonly [k: string]: unknown;
    readonly name: string;
    readonly firstName: string;
    readonly title: string;
    readonly role: string;
    readonly workflow: string;
    readonly email?: string;
    readonly phone?: string;
    readonly samples?: IDomainCollection<Sample>;
    readonly participantIds?: IDomainCollection<string>;
    constructor(survey: Survey | {
        name: string;
    }, participant: Participant | {
        participantCode: string;
    });
    constructor(workflow: string, email?: string, phone?: string, samples?: IDomainCollection<Sample>, participantIds?: IDomainCollection<string>);
    constructor(name: string | undefined | null, firstName: string | undefined | null, title: string | undefined | null, workflow: string, email?: string, phone?: string, samples?: IDomainCollection<Sample>, participantIds?: IDomainCollection<string>, kwargs?: {
        [k: string]: unknown;
    });
    update(kwargs: Partial<User>): User;
}

declare type IDomain<U> = {
    update(kwargs: Partial<U>): U;
};
declare type DNode<U> = U extends Library ? LibraryNode : U extends Page ? PageNode : U extends PageSet ? PageSetNode : U extends Page ? PageNode : U extends CrossItemRule ? CrossRulesNode : U extends Rule ? SingleNode<Rule> : U extends Survey ? SurveyNode : U extends Workflow ? WorkflowNode : U extends PageItem ? PageItemNode : U extends Interview ? InterviewNode : U extends InterviewItem ? InterviewItemNode : U extends Participant ? ParticipantNode : U extends IDomain<U> ? SingleNode<U> : U extends IDomain<infer R> | IDomain<infer T> ? SingleNode<R> | SingleNode<T> : U extends [infer R, infer T] ? [DNode<R>, DNode<T>] : U extends IDomainCollection<infer T> ? DNode<T>[] : U;
declare type PageNode = SingleNode<Omit<Page, "items" | "requiredItems" | "pins" | "array" | "kpis">>;
declare type PageSetNode = SingleNode<Omit<PageSet, "pages" | "mandatoryPages" | "items" | "pins" | "kpis">> & {
    readonly pageNames: string[];
    readonly mandatoryPageNames?: string[];
};
declare type LibraryNode = SingleNode<Omit<Library, "page" | "pageItems" | "items" | "contexts">> & {
    readonly pageName: string;
    readonly variableNames?: string[];
    readonly contexts?: [string, Context][];
};
declare type CrossRulesNode = SingleNode<Omit<CrossItemRule, "pageItems" | "rule" | "name" | "target" | "precedence">> & {
    variableNames: string[];
    when: string;
};
declare type SurveyNode = SingleNode<Omit<Survey, "options" | "rules" | "pins" | "items" | "mainWorkflow" | "workflow" | "kpis" | "notifications">> & {
    readonly config: SurveyOptions;
};
declare type WorkflowNode = SingleNode<Omit<Workflow, "main" | "info" | "single" | "many" | "sequence" | "stop" | "pageSets" | "signedPageSets" | "done" | "first" | "start">> & {
    infoType?: string;
    singleTypes: string[];
    manyTypes: string[];
    sequenceTypes: string[];
    stopTypes: string[];
};
declare type PageItemNode = SingleNode<Omit<PageItem, "comment" | "pin" | "defaultValue" | "instance" | "kpi">> & {
    itemComment?: mlstring;
    pinTitle?: mlstring;
    kpiTitle?: mlstring;
    kpiPivot?: string;
    default: unknown;
};
declare type InterviewNode = DNode<Omit<Interview, "options" | "pageSet" | "currentPage" | "date" | "fillRate" | "status" | "lastInput" | "alerts" | "isSufficient" | "pins" | "kpis" | "events" | "pendingEvents" | "acknowledgedEvents">> & {
    pageSetType: string;
    lastInput: string;
};
declare type InterviewItemNode = DNode<Omit<InterviewItem, "pageItem" | "status" | "label" | "type" | "wording" | "alerts" | "acknowledgements">> & {
    variableName: string;
    instance?: number;
};
declare type ParticipantNode = DNode<Omit<Participant, "currentInterview" | "nonce" | "options" | "lastInput" | "alerts" | "included">>;
declare type SingleNode<T> = NodeRequired<T> & NodePartial<T>;
declare type NodeRequired<T> = Node<Required$1<T>>;
declare type NodePartial<T> = Partial<Node<NonRequired<T>>>;
declare type Node<T> = {
    +readonly [K in keyof T]: DNode<T[K]>;
};
declare type Required$1<T> = Pick<T, PropOf<T> & RequiredKeys<T>>;
declare type NonRequired<T> = Omit<T, PropOf<T> & RequiredKeys<T>>;
declare type RequiredKeys<T> = NonNullable<{
    [K in keyof T]: undefined extends T[K] ? never : K;
}[keyof T]>;
declare type PropOf<T> = {
    [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];

declare type Computed = {
    formula: string;
};
declare type Copy = {
    source: string;
};
declare function isComputed(o: unknown): o is Computed;
declare function isCopy(o: unknown): o is Copy;
interface ISurveyBuilder {
    options(options: Partial<SurveyOptions>): void;
    strict(): void;
    survey(name: string): ISurveyBuilder;
    pageSet(type: mlstring): IPageSetBuilder;
    page(name: mlstring): IPageBuilder;
    workflow(): IWorkflowBuilder;
    workflow(w: {
        name: string;
        raw: true;
    }): IRawWorkflowBuilder;
    workflow(name: string, ...names: string[]): IDerivedWorkflowBuilder;
    rule(variableNames: string[], args: RuleArgs): ICrossRuleBuilder;
    rule(variableNames: string[], name: RuleName, ...args: unknown[]): ICrossRuleBuilder;
}
interface WithPageItem {
    question(varname: string, type: TypeArgs): IPageItemBuilder;
    question(varname: string, type: ItemType, ...contexts: ItemType[]): IPageItemBuilder;
    question(wording: mlstring, varname: string, type: TypeArgs): IPageItemBuilder;
    question(wording: mlstring, varname: string, type: ItemType, ...contexts: ItemType[]): IPageItemBuilder;
    info(wording: mlstring, name: string): IPageItemBuilder;
    info(wording: string[], name: string): IPageItemBuilder;
}
interface WithSection {
    startSection(title?: mlstring): ISectionBuilder;
    endSection(): IPageBuilder;
}
interface ISectionBuilder extends WithSection, WithPageItem {
    activateWhen(variableName: string, ...values: unknown[]): ISectionBuilder;
    visibleWhen(variableName: string, ...values: unknown[]): ISectionBuilder;
    modifiableWhen(variableName: string, ...values: unknown[]): ISectionBuilder;
    translate(lang: string, translation: string): ISectionBuilder;
}
interface WithInclude {
    include(pageName: string, mode?: {
        followUp: true;
    } | {
        initial: true;
    }): ILibraryBuilder;
}
interface ILibraryBuilder extends WithInclude, WithPageItem, WithSection {
    select(...variableNames: string[]): ILibraryBuilder;
    context(variableName: string, ctx: Context): ILibraryBuilder;
    activateWhen(variableName: string, ...values: unknown[]): ILibraryBuilder;
    visibleWhen(variableName: string, ...values: unknown[]): ILibraryBuilder;
    modifiableWhen(variableName: string, ...values: unknown[]): ILibraryBuilder;
}
interface IPageBuilder extends ISectionBuilder, WithPageItem, WithInclude {
    translate(lang: string, translation: string): IPageBuilder;
    exportTo(conf: string | {
        fileName?: string;
    }): IPageBuilder;
}
interface IUnitBuilder {
    extendable(): IPageItemBuilder;
}
interface IPageItemBuilder extends ISectionBuilder, WithInclude, WithPageItem {
    unit(...units: string[]): IPageItemBuilder & IUnitBuilder;
    translate(lang: string, translation: string, ...contexts: string[]): IPageItemBuilder;
    required(formula?: string): IPageItemBuilder;
    critical(event: string | Computed, message?: string, formula?: Computed): IPageItemBuilder;
    critical(event: string | Computed, message?: string, ...values: unknown[]): IPageItemBuilder;
    inRange(min: number | Date | Computed, max: number | Date | Computed, limits?: Limits): IPageItemBuilder;
    inPeriod(min: Date | Computed, max: Date | Computed, limits?: Limits): IPageItemBuilder;
    comment(comment: mlstring): IPageItemBuilder;
    pin(title: mlstring): IPageItemBuilder;
    kpi(title: mlstring, pivot?: string): IPageItemBuilder;
    maxLength(maxLength: number): IPageItemBuilder;
    decimalPrecision(precision: number): IPageItemBuilder;
    fixedLength(length: number): IPageItemBuilder;
    computed(formula: string): IPageItemBuilder;
    memorize(): IPageItemBuilder;
    letterCase(letterCase: "upper" | "lower"): IPageItemBuilder;
    activateWhen(formula: string): IPageItemBuilder;
    activateWhen(variableName: string, ...values: unknown[]): IPageItemBuilder;
    visibleWhen(formula: string): IPageItemBuilder;
    visibleWhen(variableName: string, ...values: unknown[]): IPageItemBuilder;
    modifiableWhen(formula: string): IPageItemBuilder;
    modifiableWhen(variableName: string, ...values: unknown[]): IPageItemBuilder;
    rule(args: RuleArgs): IPageItemBuilder;
    rule(name: RuleName, ...args: unknown[]): IPageItemBuilder;
    defaultValue(defaultValue: unknown): IPageItemBuilder;
    wordings(wording1: mlstring, wording2: mlstring, ...contexts: mlstring[]): IPageItemBuilder;
}
declare type PageDef = {
    name: string;
    mandatory?: boolean;
};
interface IPageSetBuilder {
    pageSet(type: mlstring): IPageSetBuilder;
    translate(lang: string, translation: string): IPageSetBuilder;
    datevariable(datevariable: string): IPageSetBuilder;
    pages(...pageDefs: (PageDef | string)[]): IPageSetBuilder;
}
interface IDerivedWorkflowBuilder {
    withPageSets(...types: string[]): IDerivedWorkflowBuilder;
    notify(...events: string[]): IDerivedWorkflowBuilder;
}
interface IWorkflowBuilder {
    home(type: string): IWorkflowBuilder;
    initial(...types: string[]): IWorkflowBuilder;
    followUp(...types: string[]): IWorkflowBuilder;
    end(...types: string[]): IWorkflowBuilder;
    auxiliary(...types: string[]): IWorkflowBuilder;
    notify(...events: string[]): IWorkflowBuilder;
}
interface IRawWorkflowBuilder {
    home(name: string): IRawWorkflowBuilder;
    seq(...names: string[]): IRawWorkflowBuilder;
    n(...names: string[]): IRawWorkflowBuilder;
    one(...names: string[]): IRawWorkflowBuilder;
    end(...names: string[]): IRawWorkflowBuilder;
    notify(...events: string[]): IRawWorkflowBuilder;
}
interface ICrossRuleBuilder {
    trigger(when: TriggerWhen): ICrossRuleBuilder;
    activateWhen(target: string, activator: string, ...values: unknown[]): ICrossRuleBuilder;
    visibleWhen(target: string, activator: string, ...values: unknown[]): ICrossRuleBuilder;
    modifiableWhen(target: string, variableName: string, ...values: unknown[]): ICrossRuleBuilder;
    copy(target: string, source: string): ICrossRuleBuilder;
    computed(target: string, formula: string): ICrossRuleBuilder;
    dynamic(variableNames: string[], rule: RuleName, values: unknown[], ...extraArgs: unknown[]): ICrossRuleBuilder;
    rule(variableNames: string[], args: RuleArgs): ICrossRuleBuilder;
    rule(variableNames: string[], name: RuleName, ...args: unknown[]): ICrossRuleBuilder;
}

declare class PageItemBuilder implements IPageItemBuilder, DNode<PageItem> {
    wording: mlstring | HasContext<mlstring>;
    readonly variableName: string;
    readonly section: mlstring | undefined;
    private readonly config;
    private readonly builder?;
    private readonly crossRulesBuilder?;
    readonly array: boolean;
    readonly type: ItemType;
    readonly rules: UnitRule[];
    readonly units: {
        values: string[];
        isExtendable: boolean;
    };
    itemComment?: mlstring;
    pinTitle?: mlstring;
    kpiTitle?: mlstring;
    kpiPivot?: string;
    private built?;
    default: unknown;
    constructor(wording: mlstring | HasContext<mlstring>, variableName: string, type: ItemType | TypeArgs, section: mlstring | undefined, config: SurveyOptions, builder?: PageBuilder | undefined, crossRulesBuilder?: SurveyBuilder | undefined);
    translate(lang: string, translation: string, ...contexts: string[]): IPageItemBuilder;
    private tr;
    question(x: mlstring, y: string | ItemType | TypeArgs, z?: ItemType | TypeArgs, t?: ItemType | TypeArgs | {
        followUp?: true;
    }, ...o: ItemType[]): IPageItemBuilder;
    wordings(wording1: mlstring, wording2: mlstring, ...contexts: mlstring[]): IPageItemBuilder;
    comment(comment: mlstring): IPageItemBuilder;
    private translateComment;
    pin(title: mlstring): IPageItemBuilder;
    kpi(title: mlstring, pivot?: string): IPageItemBuilder;
    protected translateKpi(lang: string, translation: string): IPageItemBuilder;
    protected translatePin(lang: string, translation: string): IPageItemBuilder;
    info(wording: mlstring | string[], name: string): IPageItemBuilder;
    include(pageName: string, mode?: {
        followUp: true;
    } | {
        initial: true;
    }): ILibraryBuilder;
    startSection(title?: mlstring): ISectionBuilder;
    endSection(): IPageBuilder;
    unit(...units: string[]): this;
    extendable(): this;
    required(formula?: string): this;
    critical(event: string | Computed, message?: string, ...values: unknown[]): this;
    inRange(min: number | Date | Computed, max: number | Date | Computed, limits?: {
        includeLower: boolean;
        includeUpper: boolean;
    }): this;
    private isComputed;
    inPeriod(start: Date | Computed, end: Date | Computed): this;
    activateWhen(variableName: string, ...values: unknown[]): IPageItemBuilder;
    visibleWhen(variableName: string, ...values: unknown[]): IPageItemBuilder;
    modifiableWhen(variableName: string, ...values: unknown[]): IPageItemBuilder;
    computed(formula: string): IPageItemBuilder;
    memorize(): IPageItemBuilder;
    maxLength(length: number): this;
    decimalPrecision(precision: number): this;
    fixedLength(length: number): this;
    letterCase(letterCase: "upper" | "lower"): this;
    private dynamic;
    rule(args: RuleArgs): this;
    rule(name: RuleName, ...args: unknown[]): this;
    defaultValue(defaultValue: unknown): this;
    build(pageItems: (PageItem | PageItemBuilder)[]): PageItem;
    private buildKpi;
    private buildPivotKpi;
    private getPivotItem;
}

declare class LibraryBuilder implements ILibraryBuilder, DNode<Library> {
    readonly pageName: string;
    readonly mode: {
        followUp: true;
    } | {
        initial: true;
    } | undefined;
    private readonly options;
    private readonly builder?;
    private readonly ruleBuilder?;
    variableNames?: string[];
    contexts?: [string, Context][];
    private _libraryActivation?;
    constructor(pageName: string, mode: {
        followUp: true;
    } | {
        initial: true;
    } | undefined, options: SurveyOptions, builder?: PageBuilder | undefined, ruleBuilder?: ICrossRuleBuilder | undefined);
    build(pages: Page[]): Library;
    private setActivationRule;
    private getIncludedPage;
    private getFolloUpItems;
    private getSelectedItems;
    private getContexts;
    include(pageName: string, mode?: {
        followUp: true;
    } | {
        initial: true;
    }): ILibraryBuilder;
    select(...variableNames: string[]): LibraryBuilder;
    context(variableName: string, ctx: Context): LibraryBuilder;
    activateWhen(variableName: string, ...values: unknown[]): ILibraryBuilder;
    visibleWhen(variableName: string, ...values: unknown[]): ILibraryBuilder;
    modifiableWhen(variableName: string, ...values: unknown[]): ILibraryBuilder;
    startSection(title?: string): ISectionBuilder;
    endSection(): IPageBuilder;
    question(x: mlstring, y: string | ItemType | TypeArgs, z?: ItemType | TypeArgs, t?: ItemType | TypeArgs | {
        followUp?: true;
    }, ...o: ItemType[]): IPageItemBuilder;
    info(wording: mlstring | string[], name: string): IPageItemBuilder;
}

declare class PageBuilder implements IPageBuilder, DNode<Page> {
    name: mlstring;
    private readonly config;
    private readonly builder?;
    private readonly crossRulesBuilder?;
    readonly includes: (LibraryBuilder | PageItemBuilder)[];
    exportConfig?: {
        fileName?: string;
    };
    private currentSection?;
    private built?;
    private _sectionActivation?;
    constructor(name: mlstring, config: SurveyOptions, builder?: SurveyBuilder | undefined, crossRulesBuilder?: SurveyBuilder | undefined);
    get items(): PageItemBuilder[];
    translate(lang: string, translation: string): IPageBuilder;
    include(pageName: string, mode?: {
        followUp: true;
    } | {
        initial: true;
    }): ILibraryBuilder;
    startSection(title?: mlstring): ISectionBuilder;
    private translateSection;
    activateWhen(variableName: string, ...values: unknown[]): ISectionBuilder;
    visibleWhen(variableName: string, ...values: unknown[]): ISectionBuilder;
    modifiableWhen(variableName: string, ...values: unknown[]): ISectionBuilder;
    endSection(): IPageBuilder;
    question(x: mlstring, y: string | (ItemType | TypeArgs), z?: ItemType | TypeArgs, t?: (ItemType | TypeArgs) | {
        followUp?: true;
    }, ...o: ItemType[]): IPageItemBuilder;
    private addPageItem;
    private activation;
    info(wording: mlstring | string[], name: string): IPageItemBuilder;
    exportTo(conf: string | {
        fileName?: string;
    }): IPageBuilder;
    build(builders: PageBuilder[]): Page;
    private cycle;
    private detectCycle;
    private resolveAndBuild;
    private resolve;
    private getIncludes;
}

declare class PageSetBuilder implements IPageSetBuilder, DNode<PageSet> {
    type: mlstring;
    private readonly config;
    private readonly builder?;
    readonly pageDefs: PageDef[];
    datevar?: string;
    constructor(type: mlstring, config: SurveyOptions, builder?: SurveyBuilder | undefined);
    get pageNames(): string[];
    get mandatoryPageNames(): string[];
    pageSet(type: mlstring): IPageSetBuilder;
    translate(lang: string, translation: string): IPageSetBuilder;
    pages(...pageDefs: (PageDef | string)[]): IPageSetBuilder;
    datevariable(datevariable: string): IPageSetBuilder;
    build(pages: Page[]): PageSet;
    private mapPage;
    private samePage;
    private notFound;
}

declare class WorkflowBuilder implements IWorkflowBuilder, IDerivedWorkflowBuilder, IRawWorkflowBuilder, DNode<Workflow> {
    readonly name: string;
    private readonly config;
    private main?;
    private readonly builder?;
    readonly _infoType: string[];
    readonly singleTypes: string[];
    readonly manyTypes: string[];
    readonly sequenceTypes: string[];
    readonly stopTypes: string[];
    readonly signedTypes: string[];
    readonly notifications: string[];
    private pageSetTypes;
    private built?;
    constructor(name: string, config: SurveyOptions, main?: WorkflowBuilder | undefined, builder?: ISurveyBuilder | undefined);
    get infoType(): string | undefined;
    home(name: string): IWorkflowBuilder & IRawWorkflowBuilder;
    auxiliary(...names: string[]): IWorkflowBuilder;
    initial(...names: string[]): IWorkflowBuilder;
    followUp(...names: string[]): IWorkflowBuilder;
    end(...names: string[]): IWorkflowBuilder & IRawWorkflowBuilder;
    one(...names: string[]): IWorkflowBuilder & IRawWorkflowBuilder;
    n(...names: string[]): IWorkflowBuilder & IRawWorkflowBuilder;
    seq(...names: string[]): IWorkflowBuilder & IRawWorkflowBuilder;
    notify(...events: string[]): IWorkflowBuilder & IRawWorkflowBuilder & IDerivedWorkflowBuilder;
    signOn(...types: string[]): IWorkflowBuilder & IRawWorkflowBuilder;
    withPageSets(...types: string[]): IDerivedWorkflowBuilder;
    build(pageSets: PageSet[]): Workflow;
    private getParts;
    private keep;
    private buildSequence;
    findPageSet(pageSets: PageSet[], n: string): number;
    private notFound;
    private samePageSet;
    copy(names: string[]): WorkflowBuilder[];
}

declare class CrossRuleBuilder implements ICrossRuleBuilder, DNode<CrossItemRule> {
    readonly variableNames: string[];
    private readonly _rule;
    private builder?;
    private strict;
    readonly name: string;
    readonly precedence: number;
    readonly args: Record<string, unknown>;
    when: TriggerWhen;
    constructor(variableNames: string[], _rule: CrossRule | UnitRule, builder?: ICrossRuleBuilder | undefined, strict?: boolean);
    isUnitRule(): this is {
        getRule(): UnitRule;
    };
    getRule(): CrossRule | UnitRule;
    get target(): string;
    trigger(when: TriggerWhen): ICrossRuleBuilder;
    activateWhen(target: string, activator: string, ...values: unknown[]): ICrossRuleBuilder;
    visibleWhen(target: string, activator: string, ...values: unknown[]): ICrossRuleBuilder;
    modifiableWhen(target: string, activator: string, ...values: unknown[]): ICrossRuleBuilder;
    computed(target: string, formula: string): ICrossRuleBuilder;
    copy(target: string, source: string): ICrossRuleBuilder;
    dynamic(variableNames: string[], rule: RuleName, values: unknown[], ...extra: unknown[]): ICrossRuleBuilder;
    rule(variableNames: string[], args: RuleArgs): this;
    rule(variableNames: string[], name: RuleName, ...args: unknown[]): this;
    build(pageItems: PageItem[]): CrossItemRule;
    private assertStrict;
}

declare class SurveyBuilder implements ISurveyBuilder, ICrossRuleBuilder, DNode<Survey> {
    name: string;
    workflows: WorkflowBuilder[];
    readonly pageSets: PageSetBuilder[];
    readonly pages: PageBuilder[];
    config: SurveyOptions;
    readonly includeLower: {
        includeLower: boolean;
        includeUpper: boolean;
    };
    readonly includeUpper: {
        includeLower: boolean;
        includeUpper: boolean;
    };
    readonly includeLimits: {
        includeLower: boolean;
        includeUpper: boolean;
    };
    readonly includeBoth: {
        includeLower: boolean;
        includeUpper: boolean;
    };
    readonly types: typeof ItemTypes;
    readonly crossRules: CrossRuleBuilder[];
    private emptySectionTitle;
    private isStrict;
    private mainWorkflow;
    private _currentRule;
    options(options: Partial<SurveyOptions>): void;
    strict(): void;
    private buildHideable;
    private normalizeHideable;
    survey(name: string): ISurveyBuilder;
    pageSet(type: mlstring): IPageSetBuilder;
    page(name: mlstring): IPageBuilder;
    workflow(): IWorkflowBuilder;
    workflow(w: {
        name: string;
        raw: true;
    }): IRawWorkflowBuilder;
    workflow(name: string, ...names: string[]): IDerivedWorkflowBuilder;
    activateWhen(target: string, activator: string, ...values: unknown[]): CrossRuleBuilder;
    visibleWhen(target: string, activator: string, ...values: unknown[]): CrossRuleBuilder;
    private doWhen;
    private activationFormula;
    private reallyDoWhen;
    modifiableWhen(target: string, variableName: string, ...values: unknown[]): CrossRuleBuilder;
    computed(formula: string): Computed;
    computed(target: string | string[], formula: string): CrossRuleBuilder;
    copy(source: string): Copy;
    copy(target: string, source: string): CrossRuleBuilder;
    date(iso: string): Computed;
    dynamic(variableNames: string[], underlyingRule: RuleName, values: unknown[], ...extraArgs: unknown[]): CrossRuleBuilder;
    rule(variableNames: string[], args: RuleArgs): CrossRuleBuilder;
    rule(variableNames: string[], name: RuleName, ...args: unknown[]): CrossRuleBuilder;
    private addCrossRuleBuilder;
    private getCrossRuleBuilderIndex;
    trigger(when: TriggerWhen): this;
    private dynamicFormula;
    readonly get: () => Survey;
    build(): Survey;
    private buildCrossRules;
    validate(): string[];
    mandatory(page: PageDef | string): PageDef;
    private pageId;
    compose(name: string, includes: string[]): PageDef;
    alias(to: string, from: string): PageDef;
    emptySection(): string;
    question(wording: mlstring, variableName: string, type: ItemType, section?: string): PageItemBuilder;
}
declare const builder: () => SurveyBuilder;

declare const undefinedTag: {};
declare class InterviewItemBuilder {
    readonly survey: Survey;
    private builder?;
    private _item?;
    private _pageItem;
    private _value?;
    private _unit?;
    private _specialValue?;
    private _messages;
    private _context?;
    constructor(survey: Survey, x: PageItem | InterviewItem, builder?: InterviewBuilder | undefined);
    get variableName(): string;
    get instance(): number | undefined;
    value(v: unknown): this;
    unit(u: string | undefined): this;
    specialValue(s: SpecialValue): this;
    messages(msgs: RuleMessages | ItemMessages): this;
    acknowledge(...ruleNames: RuleName[]): this;
    context(c: Context): this;
    item(item: InterviewItem): InterviewBuilder;
    item(item: Item | (HasValue & {
        pageItem: Item;
    })): InterviewItemBuilder;
    item(item: string, instance?: number): InterviewItemBuilder;
    build(): InterviewItem;
}

declare class InterviewBuilder {
    private survey;
    interviewItems: (InterviewItem | InterviewItemBuilder)[];
    pageSet: PageSet;
    nonce: number;
    private interview;
    private lastInput;
    constructor(survey: Survey, pageSet: PageSet);
    constructor(survey: Survey, interview: Interview);
    init(nonce: number, lastInput: Date): InterviewBuilder;
    item(item: InterviewItem): InterviewBuilder;
    item(item: Item | (HasValue & {
        pageItem: Item;
    })): InterviewItemBuilder;
    item(item: string, instance?: number): InterviewItemBuilder;
    private addInterviewItem;
    private getItemBuilder;
    private make;
    private pageItem;
    items(items: DNode<InterviewItem>[]): this;
    private getPageItemForVariable;
    build(outer: Interview[]): Interview;
    private initializeNew;
    private rebuildExisting;
    private updateExisting;
    private initialize;
    private synchronize;
    private getScope;
    static update(current: Interview, items: IDomainCollection<InterviewItem>, lastInput: Date): Interview;
}

declare class ParticipantBuilder {
    survey: Survey;
    sample?: Sample | undefined;
    interviews: (Interview | InterviewBuilder)[];
    participantCode: string;
    private participant;
    private samples?;
    constructor(survey: Survey, samples?: IDomainCollection<Sample>);
    constructor(survey: Survey, participant?: Participant);
    constructor(survey: Survey, participantCode: string, sample: Sample);
    init(participantCode: string, sampleCode: string): ParticipantBuilder;
    interview(pageSet: PageSet, nonce?: number, lastInput?: Date): InterviewBuilder;
    interview(pageSet: mlstring, nonce?: number, lastInput?: Date): InterviewBuilder;
    interview(interview: Interview): this;
    build(): Participant;
    private buildInterviews;
    private buildInterview;
}

declare class Metadata {
    readonly pageItem: PageItem;
    [name: string]: unknown;
    crossRules: IDomainCollection<CrossItemRule>;
    constructor(pageItem: PageItem, crossRules: IDomainCollection<CrossItemRule>);
    private getProperties;
    private getActivable;
    private getShowable;
    private getActivation;
    private getComputed;
    private getDefault;
    private getMemorized;
    private getFixedLength;
    private getMaxLength;
    private getPrecision;
    private getMinRange;
    private getMaxRange;
    private getRequired;
    private getCritical;
    private getNotification;
    private getTrigger;
    private getLetterCase;
    private getRange;
    private getLimits;
    private getProperty;
    private rewriteDynamic;
    private splitArrayFormula;
    private rewriteFormula;
    private extractArrayContent;
    private orValues;
    private replaceVariable;
    private rewriteVariable;
}

declare type PIGroup = {
    pageSet: PageSet;
    interviews: IDomainCollection<Interview>;
};
declare function groupByPageSet(interviews: IDomainCollection<Interview>): IDomainCollection<PIGroup>;

declare type Modifier = {
    comment?: mlstring;
    leftWording?: mlstring;
    rightWording?: mlstring;
    classes?: string[];
};
declare function parseComment(comment: mlstring): Modifier;

declare type LayoutType = "main" | "nested";
declare type LayoutSymbol = {
    symbol: "item" | "section" | "table" | "tableItem" | "richItem" | "recordset" | "recordItem";
    [symbol: string]: mlstring | string[] | undefined;
};
declare type MayHaveRecordset<T extends Item, U extends LayoutType> = U extends "main" ? RecordsetContent<T> : never;
declare type LayoutSection<T extends Item, U extends LayoutType = "main"> = {
    title?: mlstring;
    content: (ItemContent<T> | TableContent<T> | RichItemContent<T> | MayHaveRecordset<T, U>)[];
};
interface Layout<T extends Item, U extends LayoutType = LayoutType> {
    sections: IDomainCollection<LayoutSection<T, U>>;
    getSymbols(layout: Layout<T, U>, item: Item): LayoutSymbol[];
}
declare type HasClasses = Required<Pick<Modifier, "classes">>;
declare type ItemContent<T extends Item> = {
    behavior: "item";
    labels: Pick<Modifier, "comment"> & {
        wording: mlstring;
    };
    modifiers: HasClasses;
    item: T;
};
declare type TableContent<T extends Item> = {
    behavior: "table";
    columns: mlstring[];
    items: RowContent<T>[];
};
declare type RowContent<T extends Item> = {
    wording: mlstring;
    row: CellContent<T>[];
};
declare type CellContent<T extends Item> = {
    item: T | null;
    modifiers: HasClasses;
} | null;
declare type RichItemContent<T extends Item> = {
    behavior: "richItem";
    labels: Pick<Modifier, "comment" | "leftWording" | "rightWording"> & {
        wording: mlstring;
    };
    modifiers: HasClasses;
    item: T;
};
declare type RecordHeader = {
    wording: mlstring;
    modifiers: HasClasses;
};
declare type RecordContent<T extends Item> = (TableContent<T> | ItemContent<T> | RichItemContent<T>)[];
declare type RecordsetContent<T extends Item> = {
    behavior: "recordset";
    columns: RecordHeader[];
    items: RecordContent<T>[];
};
declare function parseLayout<T extends Item>(pageItems: IDomainCollection<T>): IDomainCollection<LayoutSection<T, "main">>;

interface IParticipantSummary {
    participantCode: string;
    sampleCode: string;
    kpis: ItemJson;
    pins: ItemJson;
    alerts: IDomainCollection<Json>;
    inclusionDate: Date | number | undefined;
}

declare type Value = Date | number | mlstring | undefined;
declare type Json = Record<string, unknown>;
declare type ItemJson = Record<string, {
    value: Value;
    kpi?: mlstring;
    pin?: mlstring;
    type: mlstring;
    wording: mlstring;
    specialValue: SpecialValue;
}>;
declare type DataSource = {
    row: {
        variableName: string;
        label: mlstring;
        values: (Value | SpecialValue)[];
        type: TypeArgs;
    };
    column: {
        variableName: string;
        label: mlstring;
        values: (Value | SpecialValue)[];
        type: TypeArgs;
    };
};
interface IKPI {
    readonly title: mlstring;
    readonly values: number[][];
    readonly columnSums: number[][];
    readonly rowSums: number[][];
    readonly datasource: DataSource;
}
declare type KPIArgs = {
    name: KPIName;
    [name: string]: unknown;
};
declare type KPIName = "QueriesBySamples" | "UniVariateCategoricalAnalysis" | "UniVariateNumericalAnalysis" | "InclusionsBySamples";
declare function getColumnSums(values: number[][]): number[][];
declare function getRowSums(values: number[][]): number[][];
declare class InclusionsBySamples implements IKPI {
    readonly survey: Survey;
    readonly samples: IDomainCollection<Sample>;
    readonly participants: IDomainCollection<IParticipantSummary>;
    readonly title: mlstring;
    readonly values: number[][];
    readonly datasource: DataSource;
    constructor(survey: Survey, samples: IDomainCollection<Sample>, participants: IDomainCollection<IParticipantSummary>, title?: mlstring, rowLabel?: mlstring, columnLabel?: mlstring);
    private getRowIndexes;
    private getInclusionDate;
    private getValues;
    get columnSums(): number[][];
    get rowSums(): number[][];
}

declare type Margin = {
    rawValues: unknown[];
    values: (string | undefined)[];
    modalities: string[];
    percentiles?: number[];
    variableName: string;
    label: mlstring;
    type: TypeArgs;
    nature: "categorical" | "numerical";
};
declare type Row = [...(string | undefined)[], number];
declare type KpiSetOptions = {
    sample?: boolean;
};
declare class KPISet {
    readonly survey: Survey;
    readonly margins: Map<string, Margin>;
    readonly data: Row[];
    constructor(survey: Survey, summaries: IParticipantSummary[], options?: KpiSetOptions);
    get variableNames(): string[];
    select(...variableNames: string[]): KPISet;
    getMatrix(rowVariable: string, colVariable: string): IKPI;
    private getData;
    private getMargins;
    private selectData;
    private selectMargins;
    private getValuesFromMargins;
    private pushOrIncr;
    private initRow;
    private incrRow;
    private compareRows;
    private compareValue;
    private setRawValues;
    private addRawValue;
    private setValues;
    private setCategoricalValues;
    private setComputedModalities;
    private setFixedModalities;
    private setNumericalValues;
    private getValues;
    private getModalities;
    private getModality;
}
declare class AbstractKpi implements Pick<IKPI, "title" | "datasource"> {
    protected rowMargin: Margin;
    protected colMargin: Margin;
    title: mlstring;
    datasource: DataSource;
    constructor(rowMargin: Margin, colMargin: Margin);
}
declare class CategoricalDistribution extends AbstractKpi implements IKPI {
    values: number[][];
    columnSums: number[][];
    rowSums: number[][];
    constructor(rowMargin: Margin, colMargin: Margin, data: Row[]);
}
declare class NumericalDistribution extends AbstractKpi implements IKPI {
    values: number[][];
    columnSums: number[][];
    rowSums: number[][];
    constructor(rowMargin: Margin, colMargin: Margin);
}

declare type IDomainProxy<T> = T & {
    value: T;
};
declare function isDomainProxy<T>(adapter: T): adapter is IDomainProxy<T>;
declare function DomainProxy<T, U extends IDomainProxy<T>>(adapter: U, adaptee: T): U;
declare function isProxyEqual<T>(a: T | IDomainProxy<T>, b: T | IDomainProxy<T>): boolean;

interface MutableSurvey extends Survey, IDomainProxy<Survey> {
}
declare class MutableSurvey {
    value: Survey;
    constructor(value: Survey);
    update(kwargs: Partial<Survey>): this;
    updateItem(pageIndex: number, index: number, item: PageItem, rules: CrossItemRule[]): this;
    deleteItem(pageIndex: number, index: number): this;
    insertItem(pageIndex: number, index: number, item: PageItem, rules: CrossItemRule[]): this;
    insertItems(pageIndex: number, index: number, items: PageItem[], rules: CrossItemRule[]): this;
    updatePage(pageIndex: number, page: Page): this;
    insertPage(pageSetIndex: number, index: number, page: Page): this;
    deletePage(pageSetIndex: number, index: number): this;
    updateInclude(pageIndex: number, index: number, include: Include): this;
    insertInclude(pageIndex: number, index: number, include: Include): this;
    deleteInclude(pageIndex: number, index: number): this;
    updatePageSet(pageSetIndex: number, pageSet: PageSet): this;
    insertPageSet(pageSet: PageSet): this;
    deletePageSet(pageSetIndex: number): this;
    updateWorkflow(workflowIndex: number, workflow: Workflow): this;
    insertWorkflow(workflow: Workflow): this;
    deleteWorkflow(workflowIndex: number): this;
    updateOptions(surveyOptions: SurveyOptions): this;
}

interface MutableParticipant extends Participant, IDomainProxy<Participant> {
}
declare class MutableParticipant {
    value: Participant;
    constructor(value: Participant);
    update(kwargs: Partial<Participant>): this;
    updateItem(item: Item): this;
    updateItems(items: IDomainCollection<Item>): this;
    updatePageSet(pageSet: PageSet): this;
    updatePageSets(pageSets: IDomainCollection<PageSet>): this;
    insertItem(item: Item): this;
    insertItems(items: IDomainCollection<Item>): this;
    insertPageSet(pageSet: PageSet, options: SurveyOptions): this;
    insertPageSets(pageSets: IDomainCollection<PageSet>, options: SurveyOptions): this;
    deleteItem(item: Item): this;
    deleteItems(items: IDomainCollection<Item>): this;
    deletePageSet(pageSet: PageSet): this;
    deletePageSets(pageSets: IDomainCollection<PageSet>): this;
    private updateItemsInInterview;
    private updateItemInInterviewItem;
    private insertItemsInInterview;
    private insertInterviews;
    private insertInterview;
    private deleteItemsInInterview;
    private deleteItemInInterview;
    private sameItem;
    private samePageSet;
    private interviewHasamplem;
}

declare type Elements = ReadonlyArray<unknown>;
declare type Header = ReadonlyArray<string>;
interface IRow {
    readonly participantCode: string;
    readonly nonce: number;
    readonly elements: Elements;
}
interface ITable {
    readonly name: string;
    readonly header: Header;
    readonly rows: ReadonlyArray<IRow>;
}
interface ITableSet {
    readonly name: string;
    readonly locale?: string;
    readonly tables: ReadonlyArray<ITable>;
}

declare class SurveyTableSet implements ITableSet {
    readonly survey: Survey;
    readonly participants: ReadonlyArray<Participant>;
    readonly tables: ReadonlyArray<ITable>;
    readonly name: string;
    readonly locale?: string;
    constructor(survey: Survey, participants: ReadonlyArray<Participant>, lang?: string | undefined);
    private getPages;
    private zipSets;
}

export { AcknowledgeType, Alert, CategoricalDistribution, CheckAlert, ChoiceType, Computed, ComputedParser, Context, ContextType, ContextWithMemento, Copy, CountryType, CrossItemRule, CrossRule, CrossRuleBuilder, DNode, DataSource, DateType, Difference, Differentiable, DomainCollection, DomainCollectionImpl, DomainProxy, Dynamical, Elements, GlobalScope, GlossaryType, HasContext, HasValue, Header, HideableVarDef, ICrossRuleBuilder, IDerivedWorkflowBuilder, IDomainCollection, IDomainProxy, IKPI, ILibraryBuilder, IPageBuilder, IPageItemBuilder, IPageSetBuilder, IParticipantSummary, IRawWorkflowBuilder, IRow, ISectionBuilder, ISurveyBuilder, ITable, ITableSet, IUnitBuilder, IWorkflowBuilder, ImageType, Include, InclusionsBySamples, InfoType, InnerType, IntegerType, Interview, InterviewBuilder, InterviewItem, InterviewItemBuilder, Item, ItemContent, ItemJson, ItemMessages, ItemType, ItemTypes, ItemWithContext, Json, KPIArgs, KPIName, KPISet, KpiSetOptions, Layout, LayoutSection, Library, LibraryBuilder, Macros, Memento, Metadata, Missing, MutableParticipant, MutableSurvey, NumericalDistribution, Page, PageBuilder, PageDef, PageItem, PageItemBuilder, PageSet, PageSetBuilder, Participant, ParticipantBuilder, ParticipantCodeStrategy, PivotKpi, QueryAlert, RealType, RecordContent, RecordsetContent, RichItemContent, Rule, RuleAlert, RuleArgs, RuleFactory, RuleMessages, RuleName, Rules, Sample, ScaleType, Scope, ScopeLevel, ScopedItem, ScoreType, SingleContext, SpecialValue, Status, Survey, SurveyBuilder, SurveyOptions, SurveyTableSet, TableContent, TextType, TimeType, TriggerWhen, TypeArgs, TypeName, UnitRule, User, Value, WithFixedLabels, WithSection, Workflow, WorkflowBuilder, YesNoType, ZippedInterview, acknowledge, acknowledgeItem, acknowledgements, alerts, areMessagesEqual, builder, comparePrecedences, compareRules, execute, formatCode, getColumnSums, getItem, getItemContext, getItemMemento, getItemType, getItemUnits, getItemWording, getLastItems, getMessage, getRowSums, getRuleArgs, getScope, getScopedItem, getTranslation, getVariableName, globalItems, groupByPageSet, groupBySection, hasContext, hasFixedLabels, hasMemento, hasMessages, hasPivot, inDateItem, isAcknowledged, isComputed, isContextual, isCopy, isDomainProxy, isML, isMLstring, isMissing, isProxyEqual, isScopedItem, isVariableHidden, isamplem, isamplemMessages, isamplemType, limits, link, messageEntries, messageNames, mlstring, parseComment, parseLayout, parseVariableName, parseVariableNames, reiterate, ruleSequence, sampleItem, setMessage, setMessageIf, setTranslation, status, thisYearItem, todayItem, undefinedItem, undefinedTag, unitToCrossRules, unsetMessage, update };
