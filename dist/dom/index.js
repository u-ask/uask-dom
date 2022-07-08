function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
}

function isMLstring(o) {
    return (typeof o == "string" ||
        (typeof o == "object" &&
            o != null &&
            Object.values(o).every(v => typeof v == "string")));
}
function isML(o) {
    return typeof o == "object" && !Array.isArray(o);
}
function getTranslation(label, lang, fallbackLang) {
    var _a;
    if (typeof label == "undefined" || typeof label == "string")
        return label;
    if (typeof label == "number")
        return String(label);
    return (_a = label[lang !== null && lang !== void 0 ? lang : "en"]) !== null && _a !== void 0 ? _a : label[fallbackLang !== null && fallbackLang !== void 0 ? fallbackLang : "en"];
}
function setTranslation(defaultLang) {
    return (label, lang, translation) => typeof label == "object"
        ? Object.assign(Object.assign({}, label), { [lang]: translation }) : {
        [defaultLang !== null && defaultLang !== void 0 ? defaultLang : "en"]: label !== null && label !== void 0 ? label : "",
        [lang]: translation,
    };
}
const Domain = {
    extend(obj) {
        if (!("__keys__" in obj))
            Object.assign(obj, { __keys__: {} });
        if (!("__changes__" in obj))
            Object.assign(obj, { __changes__: {} });
        Object.freeze(obj);
    },
    update(obj, kwargs, clazz) {
        if (!Domain.hasChanges(obj, kwargs))
            return obj;
        const [constr, ...args] = clazz;
        if (kwargs instanceof constr)
            return kwargs;
        return new constr(...args, Object.assign(Object.assign(Object.assign({}, obj), kwargs), { __changes__: Object.assign({}, obj.__changes__) }));
    },
    hasChanges(obj, kwargs) {
        let key;
        for (key in kwargs) {
            const objVal = obj[key];
            const kwargVal = kwargs[key];
            switch (key) {
                case "__keys__":
                case "__changes__":
                    if (Domain.hasChanges(objVal, kwargVal))
                        return true;
                    break;
                default:
                    if (objVal instanceof Date || kwargVal instanceof Date) {
                        const objDate = new Date(objVal);
                        const kwargDate = new Date(kwargVal);
                        if (objDate.getTime() != kwargDate.getTime())
                            return true;
                    }
                    else if (notSame(kwargs[key], obj[key]))
                        return true;
            }
        }
        return false;
    },
};
function notSame(o1, o2) {
    return ((Array.isArray(o1) && !Array.isArray(o2)) ||
        (!Array.isArray(o1) && Array.isArray(o2)) ||
        o1 != o2);
}
function merge(current, values) {
    return {
        on(predicate) {
            return mergeJoin(current, values, predicate);
        },
    };
}
function mergeJoin(current, values, predicate) {
    const [exist, notExist] = current.inverseImages(values, predicate);
    const updated = mergeUpdate(current, exist, predicate);
    return {
        insert(apply) {
            return updated.append(...apply(notExist));
        },
        insertAll() {
            return updated.append(...notExist);
        },
        updateOnly() {
            return updated;
        },
    };
}
function mergeUpdate(current, values, predicate) {
    if (values.length == 0)
        return current;
    return current.update(a => mergeItem(a, values, predicate));
}
function mergeItem(item, values, predicate) {
    const p = values.find(c => predicate(item, c));
    return p ? item.update(p) : item;
}

class DomainCollectionImpl extends Array {
    get last() {
        return this.length > 0 ? this[this.length - 1] : undefined;
    }
    constr(items) {
        const constr = Object.getPrototypeOf(this).constructor;
        return construct(constr, items);
    }
    update(mapper) {
        return this.m(i => mapper(i), c => this.constr(c), undefined);
    }
    append(...args) {
        return this.concat(args);
    }
    takeWhile(predicate) {
        const ix = super.findIndex(i => !predicate(i));
        const end = ix == -1 ? this.length : ix;
        return this.slice(0, end);
    }
    delete(predicate) {
        return this.filter(i => !predicate(i));
    }
    partition(predicate) {
        const p1 = [];
        const p2 = [];
        for (const i of this) {
            (predicate(i) ? p1 : p2).push(i);
        }
        return [this.constr(p1), this.constr(p2)];
    }
    isFlat() {
        return this.length == 0 || !Array.isArray(this[0]);
    }
    flat() {
        if (this.isFlat())
            return this;
        const nonFlat = this;
        return construct(DomainCollectionImpl, []).concat(...nonFlat);
    }
    flatMap(mapper, thisArg) {
        const mapped = this.map(mapper, thisArg);
        return mapped.flat();
    }
    inverseImages(others, application) {
        const [image] = this.partition(c => this.intersectImage(others, application, c));
        return others.partition(a => this.complementImage(image, application, a));
    }
    intersectImage(others, application, c) {
        return others.findIndex(a => application(c, a)) > -1;
    }
    complementImage(coll, application, a) {
        return this.intersectImage(coll, (i1, i2) => application(i2, i1), a);
    }
    map(mapper, thisArg) {
        return this.m(mapper, e => DomainCollection(...e), thisArg);
    }
    m(mapper, constr, thisArg) {
        const changer = withChangeDetection(mapper);
        const result = super.map((i, x, a) => changer(i, x, a), thisArg);
        return changer.changed ? constr(result) : this;
    }
    filter(predicate, thisArg) {
        const changer = withChangeDetection(predicate, true);
        const result = super.filter((i, x, a) => changer(i, x, a), thisArg);
        return changer.changed ? this.constr(result) : this;
    }
    concat(...items) {
        if (items.length == 0)
            return this;
        const concatened = super.concat(...items);
        return concatened.length == this.length ? this : this.constr(concatened);
    }
    slice(start = 0, end = this.length) {
        if (start == 0 && end >= this.length)
            return this;
        return this.constr(super.slice(start, end));
    }
    sort(comparer) {
        const result = [...this];
        result.sort(comparer);
        return this.constr(result);
    }
}
function withChangeDetection(mapper, useResult) {
    const changer = function (i, x, a) {
        const u = mapper(i, x, a);
        changer.changed = changer.changed || u != (useResult !== null && useResult !== void 0 ? useResult : i);
        return u;
    };
    changer.changed = false;
    return changer;
}
const emptyCollection = new DomainCollectionImpl();
Object.freeze(emptyCollection);
function DomainCollection(...items) {
    if (items.length == 0)
        return emptyCollection;
    return construct(DomainCollectionImpl, items);
}
function construct(constr, items) {
    const a = new constr(items.length);
    Object.assign(a, { length: 0 });
    a.push(...items);
    Object.freeze(a);
    return a;
}

function hasFixedLabels(i) {
    if (!isamplemType(i))
        return false;
    const o = i;
    return Array.isArray(o.labels);
}
function isamplemType(o) {
    if (typeof o != "object" || o === null)
        return false;
    return "label" in Object.getPrototypeOf(o) && "name" in o;
}
class TextType {
    constructor() {
        this.name = "text";
    }
    label(value, lang) {
        return typeof value == "undefined"
            ? undefined
            : getTranslation(value, lang);
    }
    rawValue(value) {
        return String(value);
    }
    typedValue(value) {
        return value !== null && value !== void 0 ? value : undefined;
    }
}
class ImageType {
    constructor() {
        this.name = "image";
    }
    label() {
        return "Image";
    }
    rawValue() {
        return undefined;
    }
    typedValue(value) {
        return value !== null && value !== void 0 ? value : undefined;
    }
}
class AbstractNumberType {
    constructor() {
        this.nature = "numerical";
        this.constr = Object.getPrototypeOf(this).constructor;
        Object.defineProperty(this, "constr", { enumerable: false });
    }
    label(value, lang) {
        return typeof value == "undefined"
            ? undefined
            : value.toLocaleString(lang);
    }
    rawValue(value) {
        return typeof value == "string" ? parseFloat(value) : value;
    }
    typedValue(value) {
        return value == undefined ? undefined : Number(value);
    }
}
class RealType extends AbstractNumberType {
    constructor() {
        super(...arguments);
        this.name = "real";
    }
}
class IntegerType extends AbstractNumberType {
    constructor() {
        super(...arguments);
        this.name = "integer";
    }
    typedValue(value) {
        return value !== null && value !== void 0 ? value : undefined;
    }
}
class DateType {
    constructor(incomplete = false, month = false) {
        this.incomplete = incomplete;
        this.month = month;
        this.name = "date";
    }
    label(value) {
        return this.incomplete
            ? value
            : value instanceof Date
                ? new Date(Math.round(value.getTime() / 86400000) * 86400000)
                    .toISOString()
                    .substring(0, 10)
                : typeof value == "string"
                    ? this.label(new Date(value))
                    : value;
    }
    rawValue(value) {
        return this.label(value);
    }
    typedValue(value) {
        if (value == undefined)
            return undefined;
        if (this.incomplete && typeof value == "string")
            return value;
        if (this.incomplete && typeof value == "number")
            return String(value);
        return new Date(value);
    }
}
class TimeType {
    constructor(duration = false) {
        this.duration = duration;
        this.name = "time";
    }
    label(value) {
        return this.duration
            ? typeof value == "number"
                ? this.formatTime(value)
                : value
            : value instanceof Date
                ? value.toLocaleTimeString("fr-FR").substring(0, 5)
                : typeof value == "string" && new Date(value).toString() != "Invalid Date"
                    ? new Date(value).toLocaleTimeString("fr-FR").substring(0, 5)
                    : value;
    }
    rawValue(value) {
        return this.label(value);
    }
    typedValue(value) {
        return value !== null && value !== void 0 ? value : undefined;
    }
    formatTime(time) {
        const min = time % 60;
        const h = (time - min) / 60;
        if (h > 24) {
            const hModulus = h % 24;
            const j = (h - hModulus) / 24;
            if (j > 7) {
                const jModulus = j % 7;
                const w = (j - jModulus) / 7;
                return `${w}w${jModulus}j${hModulus}h${min}min`;
            }
            return `${j}j${hModulus}h${min}min`;
        }
        return `${h}h${min}min`;
    }
}
class YesNoType {
    constructor() {
        this.name = "yesno";
        this.nature = "categorical";
        this.labels = [
            { __code__: "0", en: "No", fr: "Non" },
            { __code__: "1", en: "Yes", fr: "Oui" },
        ];
        this.rawValues = [0, 1];
    }
    label(value, lang) {
        return typeof value == "undefined"
            ? undefined
            : getTranslation(this.labels[Number(value) ? 1 : 0], lang);
    }
    rawValue(value) {
        return (typeof value == "string" ? parseInt(value) : value) ? 1 : 0;
    }
    typedValue(value) {
        return value == undefined ? undefined : value ? 1 : 0;
    }
}
class ScoreType extends AbstractNumberType {
    constructor(scores, defaultLang, labels = scores.map(s => ({
        __code__: String(s),
        [defaultLang !== null && defaultLang !== void 0 ? defaultLang : "en"]: String(s),
    }))) {
        super();
        this.scores = scores;
        this.defaultLang = defaultLang;
        this.labels = labels;
        this.name = "score";
        this.nature = "categorical";
        this.rawValues = scores;
    }
    lang(lang) {
        return new this.constr(this.scores, lang, this.labels);
    }
    wording(...labels) {
        var _a;
        return this.translate((_a = this.defaultLang) !== null && _a !== void 0 ? _a : "en", ...labels);
    }
    translate(lang, ...labels) {
        var _a;
        return new this.constr(this.scores, this.defaultLang, (_a = this.labels) === null || _a === void 0 ? void 0 : _a.map((l, i) => { var _a; return setTranslation((_a = this.defaultLang) !== null && _a !== void 0 ? _a : "en")(l, lang, labels[i]); }));
    }
    getLabel(value, lang) {
        var _a;
        const ix = this.scores.indexOf(value);
        return getTranslation((_a = this.labels) === null || _a === void 0 ? void 0 : _a[ix], lang);
    }
    label(value, lang) {
        return !this.scores.includes(value)
            ? undefined
            : this.getLabel(value, lang);
    }
}
function range(min, max) {
    const r = [];
    for (let i = min; i <= max; i++) {
        r.push(i);
    }
    return r;
}
class ScaleType extends AbstractNumberType {
    constructor(min, max, defaultLang, labels = range(min, max).map(s => ({
        __code__: String(s),
        [defaultLang !== null && defaultLang !== void 0 ? defaultLang : "en"]: String(s),
    }))) {
        super();
        this.min = min;
        this.max = max;
        this.defaultLang = defaultLang;
        this.labels = labels;
        this.name = "scale";
        this.rawValues = range(min, max);
    }
    lang(lang) {
        return new this.constr(this.min, this.max, lang, this.labels);
    }
    wording(...labels) {
        var _a;
        return this.translate((_a = this.defaultLang) !== null && _a !== void 0 ? _a : "en", ...labels);
    }
    translate(lang, ...labels) {
        var _a;
        return new this.constr(this.min, this.max, this.defaultLang, (_a = this.labels) === null || _a === void 0 ? void 0 : _a.map((l, i) => { var _a; return setTranslation((_a = this.defaultLang) !== null && _a !== void 0 ? _a : "en")(l, lang, labels[i]); }));
    }
    getLabel(value, lang) {
        var _a;
        return getTranslation((_a = this.labels) === null || _a === void 0 ? void 0 : _a[value], lang);
    }
    label(value, lang) {
        return value < this.min || value > this.max
            ? undefined
            : this.getLabel(value, lang);
    }
}
class ChoiceType {
    constructor(multiplicity, choices, defaultLang, labels = choices.map(c => ({
        __code__: c,
        [defaultLang !== null && defaultLang !== void 0 ? defaultLang : "en"]: c,
    }))) {
        this.multiplicity = multiplicity;
        this.choices = choices;
        this.defaultLang = defaultLang;
        this.labels = labels;
        this.name = "choice";
        this.nature = "categorical";
        this.rawValues = choices;
    }
    lang(lang) {
        const constr = Object.getPrototypeOf(this).constructor;
        return new constr(this.multiplicity, this.choices, lang, this.labels);
    }
    wording(...labels) {
        var _a;
        return this.translate((_a = this.defaultLang) !== null && _a !== void 0 ? _a : "en", ...labels);
    }
    translate(lang, ...labels) {
        const constr = Object.getPrototypeOf(this).constructor;
        return new constr(this.multiplicity, this.choices, this.defaultLang, this.labels.map((l, i) => { var _a; return setTranslation((_a = this.defaultLang) !== null && _a !== void 0 ? _a : "en")(l, lang, labels[i]); }));
    }
    getLabel(value, lang) {
        const i = this.choices.indexOf(value);
        return i == -1 ? undefined : getTranslation(this.labels[i], lang);
    }
    label(value, lang) {
        return typeof value == "undefined"
            ? undefined
            : Array.isArray(value)
                ? value.map(v => this.getLabel(v, lang)).join(", ")
                : this.getLabel(value, lang);
    }
    rawValue(value) {
        return String(value);
    }
    typedValue(value) {
        return value !== null && value !== void 0 ? value : undefined;
    }
}
class GlossaryType extends ChoiceType {
    constructor() {
        super(...arguments);
        this.name = "glossary";
    }
}
class CountryType {
    constructor(multiplicity, defaultLang) {
        this.defaultLang = defaultLang;
        return new GlossaryType(multiplicity, ["FRA", "BEL", "ESP", "ITA"], defaultLang, [
            { __code__: "FRA", en: "France", fr: "France" },
            { __code__: "BEL", en: "Belgium", fr: "Belgique" },
            { __code__: "ESP", en: "Spain", fr: "Espagne" },
            { __code__: "ITA", en: "Italy", fr: "Italie" },
        ]);
    }
}
class AcknowledgeType {
    constructor() {
        this.name = "acknowledge";
        this.nature = "categorical";
        this.labels = [{ __code__: "1", en: "Yes", fr: "Oui" }];
        this.rawValues = [1];
    }
    label(value, lang) {
        return typeof value == "undefined"
            ? undefined
            : getTranslation(this.labels[0], lang);
    }
    rawValue(value) {
        return value ? 1 : undefined;
    }
    typedValue(value) {
        return value ? 1 : undefined;
    }
}
class InfoType {
    constructor() {
        this.name = "info";
    }
    label(value) {
        return typeof value == "undefined" ? undefined : String(value);
    }
    rawValue() {
        return undefined;
    }
    typedValue() {
        return undefined;
    }
}
class ContextType {
    constructor(types) {
        this.name = "context";
        Object.assign(this, types);
    }
    label(value, lang, ctx = 0) {
        return typeof value == "undefined"
            ? undefined
            : this[ctx].label(value, lang);
    }
    rawValue(value, ctx = 0) {
        return typeof value == "undefined" ? undefined : this[ctx].rawValue(value);
    }
    typedValue(value, ctx = 0) {
        return value == undefined ? undefined : this[ctx].typedValue(value);
    }
}

class PageItem {
    constructor(wording, variableName, type, kwargs) {
        this.rules = DomainCollection();
        this.section = undefined;
        this.array = false;
        this.instance = 1;
        this.wording = wording;
        this.variableName = variableName;
        this.type = type;
        Object.assign(this, kwargs);
        Domain.extend(this);
    }
    nextInstance() {
        if (!this.array)
            throw "page item does not accept multiple instances";
        if (PageItem.instanceMap.has(this)) {
            return PageItem.instanceMap.get(this);
        }
        const instance = this.update({
            instance: this.instance + 1,
        });
        PageItem.instanceMap.set(this, instance);
        return instance;
    }
    hasNextInstance() {
        return PageItem.instanceMap.has(this);
    }
    isInstanceOf(prototype, instance) {
        if (prototype.instance != 1)
            throw "not a prototype";
        return (this.samePrototype(prototype) && (!instance || this.instance == instance));
    }
    samePrototype(instance) {
        return this.variableName == instance.variableName;
    }
    update(kwargs) {
        return Domain.update(this, kwargs, [
            PageItem,
            this.wording,
            this.variableName,
            this.type,
        ]);
    }
    static getInstance(prototype, instance) {
        if (prototype.instance != 1)
            throw "not a prototype";
        return PageItem.getSibling(prototype, instance);
    }
    static getSibling(pageItem, instance) {
        if (pageItem.instance == instance)
            return pageItem;
        return PageItem.getSibling(pageItem.nextInstance(), instance);
    }
    static getInstances(prototype) {
        if (prototype.instance != 1)
            throw "not a prototype";
        const result = [prototype];
        let r = prototype;
        while (r.hasNextInstance()) {
            r = r.nextInstance();
            result.push(r);
        }
        return result;
    }
}
PageItem.instanceMap = new WeakMap();
function hasMemento(context) {
    return Array.isArray(context) && context.length > 1;
}
function isamplem(item) {
    return (item instanceof PageItem ||
        ((item === null || item === void 0 ? void 0 : item.pageItem) instanceof PageItem &&
            !!(item === null || item === void 0 ? void 0 : item.context)));
}
function isContextual(o) {
    if (typeof o == "string")
        return false;
    if (Array.isArray(o))
        return true;
    return 0 in o;
}
function getItem(item) {
    if (item instanceof PageItem)
        return item;
    return item.pageItem;
}
function getItemContext(item) {
    return hasContext(item)
        ? hasMemento(item.context)
            ? item.context[0]
            : item.context
        : 0;
}
function hasContext(item) {
    return "context" in item;
}
function getItemWording(item) {
    const wording = "pageItem" in item ? item.pageItem.wording : item.wording;
    const context = getItemContext(item);
    return Array.isArray(wording) ? wording[context] : wording;
}
function getItemType(item) {
    const type = "pageItem" in item ? item.pageItem.type : item.type;
    const context = getItemContext(item);
    return type instanceof ContextType ? type[context] : type;
}
function getItemUnits(item) {
    const units = getItem(item).units;
    if (units == undefined)
        return [];
    if (Array.isArray(units))
        return units;
    return units.values;
}
function getItemMemento(item) {
    return hasContext(item) && hasMemento(item.context)
        ? tryNumber(item.context[1])
        : undefined;
}
function tryNumber(o) {
    const t1 = Number(o);
    if (!isNaN(t1))
        return t1;
    const t2 = new Date(o).getTime();
    if (!isNaN(t2))
        return t2;
    return o;
}
function groupBySection(pageItems) {
    return pageItems.reduce((result, q) => {
        const item = getItem(q.pageItem);
        if (result.length == 0 || result[result.length - 1].title != item.section)
            return result.append({ title: item.section, items: DomainCollection(q) });
        return result.update(r => r == result.last ? { title: r.title, items: r.items.append(q) } : r);
    }, DomainCollection());
}
function hasPivot(kpi) {
    return typeof kpi == "object" && typeof kpi.pivot == "object";
}

class ItemTypes {
    static _date(incomplete = false, month = false) {
        return ItemTypes.create({ name: "date", incomplete, month });
    }
    static context(types) {
        return new ContextType(types);
    }
    static create(_a) {
        var { name } = _a, args = __rest(_a, ["name"]);
        switch (name) {
            case "scale":
                return new ScaleType(args.min, args.max, args.defaultLang, args.labels);
            case "score":
                return new ScoreType(args.scores, args.defaultLang, args.labels);
            case "text":
                return new TextType();
            case "real":
                return new RealType();
            case "integer":
                return new IntegerType();
            case "date":
                return new DateType(args.incomplete, args.month);
            case "yesno":
                return new YesNoType();
            case "acknowledge":
                return new AcknowledgeType();
            case "choice":
                return new ChoiceType(args.multiplicity, args.choices, args.defaultLang, args.labels);
            case "countries":
                return new CountryType(args.multiplicity, args.defaultLang);
            case "glossary":
                return new GlossaryType(args.multiplicity, args.choices, args.defaultLang, args.labels);
            case "context":
                return new ContextType(Object.keys(args).map(t => ItemTypes.create(args[t])));
            case "image":
                return new ImageType();
            case "time":
                return new TimeType(args.duration);
            case "info":
                return new InfoType();
        }
    }
}
ItemTypes.text = ItemTypes.create({ name: "text" });
ItemTypes.real = ItemTypes.create({ name: "real" });
ItemTypes.integer = ItemTypes.create({ name: "integer" });
ItemTypes.yesno = ItemTypes.create({ name: "yesno" });
ItemTypes.info = ItemTypes.create({ name: "info" });
ItemTypes.acknowledge = ItemTypes.create({ name: "acknowledge" });
ItemTypes.image = ItemTypes.create({ name: "image" });
ItemTypes.date = ItemTypes._date;
ItemTypes.time = (duration = false) => ItemTypes.create({ name: "time", duration });
ItemTypes.scale = (min, max) => ItemTypes.create({ name: "scale", min, max });
ItemTypes.score = (...scores) => ItemTypes.create({ name: "score", scores });
ItemTypes.choice = (multiplicity, ...choices) => ItemTypes.create({
    name: "choice",
    multiplicity,
    choices,
});
ItemTypes.countries = (multiplicity) => ItemTypes.create({
    name: "countries",
    multiplicity,
});
ItemTypes.glossary = (multiplicity, ...choices) => ItemTypes.create({
    name: "glossary",
    multiplicity,
    choices,
});

function hasMessages(o) {
    return Object.keys(o).length > (isamplemMessages(o) ? 1 : 0);
}
function isamplemMessages(o) {
    return "__acknowledged" in o;
}
function areMessagesEqual(m1, m2, ruleName) {
    return (getMessage(m1, ruleName) == getMessage(m2, ruleName),
        isAcknowledged(m1, ruleName) == isAcknowledged(m2, ruleName));
}
function acknowledge(messages, ...ruleNames) {
    if (!isamplemMessages(messages))
        return Object.assign(Object.assign({}, messages), { __acknowledged: ruleNames });
    const ack = ruleNames.filter(r => !messages.__acknowledged.includes(r));
    if (ack.length == 0)
        return messages;
    return Object.assign(Object.assign({}, messages), { __acknowledged: [...messages.__acknowledged, ...ack] });
}
function reiterate(messages, ...ruleNames) {
    if (!isamplemMessages(messages))
        return messages;
    const ack = messages.__acknowledged.filter(r => !ruleNames.includes(r));
    if (ack.length == messages.__acknowledged.length)
        return messages;
    return Object.assign(Object.assign({}, messages), { __acknowledged: ack });
}
function isAcknowledged(messages, ruleName) {
    return isamplemMessages(messages) && messages.__acknowledged.includes(ruleName);
}
function alerts(messages) {
    return messageNames(messages)
        .filter(name => !isAcknowledged(messages, name))
        .map(name => getMessage(messages, name));
}
function acknowledgements(messages) {
    return messageNames(messages)
        .filter(name => isAcknowledged(messages, name))
        .map(name => getMessage(messages, name));
}
function messageEntries(messages) {
    return messages
        ? messageNames(messages).map(name => [
            name,
            getMessage(messages, name),
            isAcknowledged(messages, name),
        ])
        : [];
}
function getMessage(messages, ruleName) {
    return messages === null || messages === void 0 ? void 0 : messages[ruleName];
}
function messageNames(messages) {
    return Object.keys(messages !== null && messages !== void 0 ? messages : {}).filter(k => k != "__acknowledged");
}

const emptyMessages = {};
function status(item) {
    if (item.pageItem.type.name == ItemTypes.info.name)
        return "info";
    if (item.value != undefined &&
        item.value !== "" &&
        !Array.isArray(item.value))
        return unitStatus(item);
    if (Array.isArray(item.value))
        return item.value.length > 0 ? "fulfilled" : "missing";
    if (item.specialValue != undefined)
        return "fulfilled";
    return "missing";
}
function unitStatus(item) {
    var _a;
    if ((_a = item.pageItem.units) === null || _a === void 0 ? void 0 : _a.values)
        return item.unit != undefined || item.pageItem.units.values.length < 2
            ? "fulfilled"
            : "missing";
    else
        return "fulfilled";
}
class InterviewItem {
    constructor(pageItem, value, kwargs) {
        this.context = 0;
        this.specialValue = undefined;
        this.messages = emptyMessages;
        this.value = value;
        if (pageItem instanceof PageItem)
            this.pageItem = pageItem;
        else {
            this.pageItem = pageItem.pageItem;
            this.context = pageItem.context;
        }
        Object.assign(this, kwargs);
        this.value = this.pageItem.type.typedValue(isNull(this.value) ? undefined : this.value, this.context);
        Object.freeze(this.messages);
        if (isamplemMessages(this.messages))
            Object.freeze(this.messages.__acknowledged);
        Domain.extend(this);
    }
    update(kwargs) {
        if (!(kwargs instanceof InterviewItem)) {
            if (typeof kwargs.messages != "undefined" &&
                this.messagesEqual(kwargs.messages)) {
                kwargs = Object.assign(Object.assign({}, kwargs), { messages: this.messages });
            }
            if ("value" in kwargs) {
                kwargs = Object.assign(Object.assign({}, kwargs), { value: this.pageItem.type.typedValue(kwargs.value) });
            }
        }
        return Domain.update(this, kwargs, [
            InterviewItem,
            this.pageItem,
            this.value,
        ]);
    }
    messagesEqual(messages) {
        const names = messageNames(messages);
        const thisNames = messageNames(this.messages);
        if (names.length != thisNames.length)
            return false;
        for (const name of names) {
            if (!areMessagesEqual(messages, this.messages, name))
                return false;
        }
        return true;
    }
    get status() {
        return status(this);
    }
    get wording() {
        return getItemWording(this);
    }
    get type() {
        return getItemType(this);
    }
    get alerts() {
        return alerts(this.messages);
    }
    get acknowledgements() {
        return acknowledgements(this.messages);
    }
    get event() {
        return this.messages.critical
            ? {
                event: this.messages.critical,
                acknowledged: isAcknowledged(this.messages, "critical"),
            }
            : undefined;
    }
    acknowledge(...ruleNames) {
        return this.update({ messages: acknowledge(this.messages, ...ruleNames) });
    }
    reiterate(...ruleNames) {
        return this.update({ messages: reiterate(this.messages, ...ruleNames) });
    }
    acknowledgeEvent() {
        return this.update({
            messages: acknowledge(this.messages, "critical"),
        });
    }
    label(lang) {
        const value = this.type.label(this.value, lang);
        return value && this.unit
            ? `${value} ${this.unit}`
            : value !== null && value !== void 0 ? value : this.specialValue;
    }
    diff(previous) {
        const diff = this.type.name == "image"
            ? { value: undefined }
            : {};
        const acknowledge = this.acknowledgements.find(m => !(previous === null || previous === void 0 ? void 0 : previous.acknowledgements.includes(m)));
        if (acknowledge)
            return Object.assign(Object.assign({}, diff), { operation: `acknowledge (${acknowledge})` });
        const reiterate = previous === null || previous === void 0 ? void 0 : previous.acknowledgements.find(m => !this.acknowledgements.includes(m));
        if (reiterate)
            return Object.assign(Object.assign({}, diff), { operation: `reiterate (${reiterate})` });
        return diff;
    }
}
function isNull(value) {
    return value === "";
}

class AnswerLikeImpl {
    constructor(kwargs) {
        Object.assign(this, kwargs);
    }
}
function update(target, kwargs) {
    var _a;
    if (target == kwargs)
        return target;
    const hasValue = Object.assign({}, "value" in kwargs ? { value: kwargs.value } : {}, "unit" in kwargs ? { unit: kwargs.unit } : {}, "specialValue" in kwargs ? { specialValue: kwargs.specialValue } : {}, "messages" in kwargs ? { messages: kwargs.messages } : {}, "context" in kwargs ? { context: kwargs.context } : {});
    if (target instanceof InterviewItem) {
        if (hasProperMessages(hasValue))
            return target.update(hasValue);
        const kw = Object.assign({}, hasValue, {
            messages: (_a = hasValue.messages) !== null && _a !== void 0 ? _a : {},
        });
        return target.update(kw);
    }
    return Domain.update(target, hasValue, [AnswerLikeImpl]);
}
function hasProperMessages(a) {
    return !a.messages || a.messages instanceof DomainCollectionImpl;
}
function setMessageIf(condition) {
    return condition ? setMessage : unsetMessage;
}
function unsetMessage(messages, name) {
    if (messages == undefined)
        return undefined;
    if (name in messages) {
        const _a = messages, _b = name; _a[_b]; const others = __rest(_a, [typeof _b === "symbol" ? _b : _b + ""]);
        return others;
    }
    return messages;
}
function setMessage(messages, name, message) {
    if (messages == undefined)
        return { [name]: message };
    if (messages[name] == message)
        return messages;
    return Object.assign(Object.assign({}, messages), { [name]: message });
}

const inDateItem = new PageItem("Last input", "INDATE", ItemTypes.date(false));
const sampleItem = new PageItem("Sample code", "SAMPLE", ItemTypes.text);
const acknowledgeItem = new PageItem("Acknowledge", "ACK", ItemTypes.acknowledge);
const undefinedItem = new PageItem("Undefined", "UNDEF", ItemTypes.yesno);
const todayItem = new PageItem("Today", "TODAY", ItemTypes.date(false));
const thisYearItem = new PageItem("ThisYear", "THISYEAR", ItemTypes.integer);
const globalItems = [
    inDateItem,
    sampleItem,
    todayItem,
    thisYearItem,
    acknowledgeItem,
    undefinedItem,
];
function isScopeLevel(x) {
    return x == "global" || x == "outer" || x == "local";
}
function isScopedItem(x) {
    return (Array.isArray(x) &&
        x.length == 2 &&
        x[0] instanceof PageItem &&
        isScopeLevel(x[1]));
}
const missing = { missing: true };
function isMissing(o) {
    return !!o.missing;
}
function getScopedItem(x) {
    return isScopedItem(x) ? x[0] : x;
}
function getScope(x) {
    return isScopedItem(x) ? x[1] : "local";
}
class AbstractScope {
    constructor(items, pageItems) {
        this.items = items;
        this.pageItems = pageItems;
    }
    getItem(pageItem) {
        const item = this.items.find(i => i.pageItem == pageItem);
        return item !== null && item !== void 0 ? item : (this.shouldExist(pageItem) ? missing : undefined);
    }
    shouldExist(pageItem) {
        return this.pageItems.findIndex(i => getItem(i) == pageItem) > -1;
    }
}
class GlobalScope extends AbstractScope {
    constructor(participant) {
        super([
            ...((participant === null || participant === void 0 ? void 0 : participant.lastInput)
                ? [new InterviewItem(inDateItem, participant.lastInput)]
                : []),
            ...((participant === null || participant === void 0 ? void 0 : participant.sample)
                ? [new InterviewItem(sampleItem, participant.sample.sampleCode)]
                : []),
            new InterviewItem(todayItem, today()),
            new InterviewItem(thisYearItem, new Date().getFullYear()),
            new InterviewItem(acknowledgeItem, true),
            new InterviewItem(undefinedItem, undefined),
        ], [
            ...((participant === null || participant === void 0 ? void 0 : participant.lastInput) ? [inDateItem] : []),
            todayItem,
            acknowledgeItem,
            undefinedItem,
        ]);
        this.participant = participant;
    }
    get(pageItem, level) {
        if (level != "global")
            return undefined;
        return super.getItem(pageItem);
    }
}
class Scope extends AbstractScope {
    constructor(parentScope, items, pageItems) {
        super(items, pageItems);
        this.parentScope = parentScope;
        this.items = items;
        this.pageItems = pageItems;
    }
    get(x, y = "local") {
        const pageItem = x instanceof PageItem ? x : x[0];
        const level = x instanceof PageItem ? y : x[1];
        switch (level) {
            case "global":
                return this.parentScope.get(pageItem, "global");
            case "outer":
                return this.parentScope.get(pageItem, "local");
            case "local":
                return super.getItem(pageItem);
        }
    }
    with(transients) {
        if (transients.length == 0)
            return this;
        const items = Scope.merge(this.items, transients);
        return new Scope(this.parentScope, items, this.pageItems);
    }
    static create(outer, local) {
        const { participant, outerItems, localItems } = Scope.getItemsByScopes(outer, local);
        const globalScope = new GlobalScope(participant);
        const [outerHead, ...outerTail] = outerItems;
        const outerScope = outerHead
            ? outerTail.reduce((scope, i) => scope.with([...i.items]), new Scope(globalScope, [...outerHead.items], []))
            : globalScope;
        const pageItems = (local === null || local === void 0 ? void 0 : local.pageSet)
            ? local.pageSet.items
            : localItems.map(i => i.pageItem);
        return new Scope(outerScope, localItems, pageItems);
    }
    static getItemsByScopes(outer, local) {
        const participant = "lastInput" in outer ? outer : undefined;
        const outerItems = "interviews" in outer ? [...Scope.takeOuter(outer, local)] : outer;
        const localItems = local ? [...local.items] : [];
        return { participant, outerItems, localItems };
    }
    static takeOuter(outer, local) {
        const x = local ? outer.interviews.indexOf(local) : -1;
        return outer.interviews.slice(0, x >= 0 ? x : outer.interviews.length);
    }
    static merge(items, transients) {
        const result = [...items];
        for (const item of transients) {
            const i = result.findIndex(r => r.pageItem == item.pageItem);
            if (i == -1)
                result.push(item);
            else
                result[i] = item;
        }
        return result;
    }
}
function today() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

class RuleAlert {
    constructor(message, item, interview, tags) {
        this.message = message;
        this.item = item;
        this.interview = interview;
        this.tags = tags;
        Object.freeze(this);
    }
    get type() {
        return "rule";
    }
}
class QueryAlert {
    constructor(message, item, interview, tags) {
        this.message = message;
        this.item = item;
        this.interview = interview;
        this.tags = tags;
        Object.freeze(this);
    }
    get type() {
        return "query";
    }
}
class CheckAlert {
    constructor(message, page, interview, tags) {
        this.message = message;
        this.page = page;
        this.interview = interview;
        this.tags = tags;
        Object.freeze(this);
    }
    get type() {
        return "checking";
    }
}

function isZippedInterview(o) {
    return Array.isArray(o);
}
class Interview {
    constructor(pageSet, options, kwargs) {
        this.nonce = 0;
        this.items = DomainCollection();
        this.lastInput = new Date();
        this._itemsForPages = new Map();
        this._statusForPages = new Map();
        this._itemForVariables = new Map();
        this.pageSet = pageSet;
        this.options = options;
        Object.assign(this, kwargs);
        Object.defineProperty(this, "_itemsForPages", { enumerable: false });
        Object.defineProperty(this, "_statusForPages", { enumerable: false });
        Object.defineProperty(this, "_itemForVariables", { enumerable: false });
        Object.defineProperty(this, "_processesForVariables", {
            enumerable: false,
        });
        Object.defineProperty(this, "_knownActions", { enumerable: false });
        Object.defineProperty(this, "_instances", { enumerable: false });
        Domain.extend(this);
    }
    get itemForVariables() {
        if (this._itemForVariables.size == 0) {
            this.getItemForVariables(this._itemForVariables);
        }
        return this._itemForVariables;
    }
    get itemsForPages() {
        if (this._itemsForPages.size == 0) {
            this.getItemsForPages(this._itemsForPages);
        }
        return this._itemsForPages;
    }
    get statusForPages() {
        if (this._statusForPages.size == 0) {
            this.getStatusForPages(this._statusForPages);
        }
        return this._statusForPages;
    }
    getItemForVariables(itemForVariables) {
        return this.items.reduce((r, item) => {
            const itemKey = this.getItemKey(item.pageItem, item.pageItem.instance);
            r.set(itemKey, item);
            return r;
        }, itemForVariables);
    }
    getItemKey(item, instance) {
        if (item instanceof PageItem) {
            instance = item.instance;
            item = item.variableName;
        }
        return `${item}@${instance}`;
    }
    getItemsForPages(itemsForPages) {
        this.pageSet.pages.forEach(page => {
            itemsForPages.set(page, DomainCollection());
        });
        return this.items.reduce((acc, item) => {
            const pages = this.pageSet.getPagesForItem(item);
            this.setItemForPages(acc, item, pages);
            return acc;
        }, itemsForPages);
    }
    setItemForPages(acc, item, pages) {
        return pages.reduce((acc, page) => {
            const items = acc.get(page);
            acc.set(page, items.append(item));
            return acc;
        }, acc);
    }
    getStatusForPages(statusForPages) {
        for (const [p, i] of this.itemsForPages) {
            statusForPages.set(p, this.getPageToStatus(p, i));
        }
        return statusForPages;
    }
    getPageToStatus(page, items) {
        if (this.isPageEmpty(page, items))
            return this.emptyStatus(page);
        return this.nonEmptyStatus(page, items);
    }
    emptyStatus(page) {
        return this.pageSet.isMandatory(page) && page.requiredItems.length > 0
            ? "insufficient"
            : "empty";
    }
    nonEmptyStatus(page, items) {
        const fulfilled = this.getFulfilledItems(items);
        return this.itemsNeedAnswer(page, fulfilled)
            ? this.pageSet.isMandatory(page)
                ? this.requiredItemsNeedAnswer(page, fulfilled)
                    ? "insufficient"
                    : "incomplete"
                : "incomplete"
            : "fulfilled";
    }
    itemsNeedAnswer(page, fulfilled) {
        return page.items.find(q => this.itemNeedsAnswer(q, fulfilled));
    }
    requiredItemsNeedAnswer(page, fulfilled) {
        return page.requiredItems.some(i => this.itemNeedsAnswer(i, fulfilled));
    }
    itemNeedsAnswer(q, fulfilled) {
        return (getItemType(q).name != ItemTypes.info.name && !fulfilled.has(getItem(q)));
    }
    getFulfilledItems(items) {
        const missing = items.filter(i => i.status == "missing");
        const fulfilled = items.filter(i => i.status == "fulfilled" &&
            !missing.some(t => t.pageItem.samePrototype(i.pageItem)));
        return new Set(fulfilled.map(i => i.pageItem));
    }
    isPageEmpty(page, items) {
        let allValuesEmpty = true;
        let someSpecialValueEmpty = items.length <
            page.items.filter(i => getItemType(i).name != "info").length;
        for (const i of items.filter(i => getItemType(i).name != "info")) {
            allValuesEmpty = this.isEmptySoFar(allValuesEmpty, i);
            someSpecialValueEmpty = this.isEmptyNow(someSpecialValueEmpty, i);
        }
        return allValuesEmpty && someSpecialValueEmpty;
    }
    isEmptySoFar(empty, i) {
        return empty && i.value == undefined;
    }
    isEmptyNow(empty, i) {
        return empty || i.specialValue == undefined;
    }
    get status() {
        let status = "fulfilled";
        for (const pageStatus of this.statusForPages.values()) {
            status = this.changeStatus(status, pageStatus);
        }
        return status;
    }
    changeStatus(status, pageStatus) {
        return this.isInsufficientSoFar(status, pageStatus)
            ? "insufficient"
            : this.isIncompleteSoFar(status, pageStatus)
                ? "incomplete"
                : status;
    }
    isInsufficientSoFar(status, pageStatus) {
        return status == "insufficient" || pageStatus == "insufficient";
    }
    isIncompleteSoFar(status, pageStatus) {
        return (status == "incomplete" ||
            pageStatus == "incomplete" ||
            pageStatus == "empty");
    }
    get date() {
        var _a, _b, _c;
        return (_c = this.getItemForVariable((_b = (_a = this.pageSet.datevar) !== null && _a !== void 0 ? _a : this.options.interviewDateVar) !== null && _b !== void 0 ? _b : "VDATE")) === null || _c === void 0 ? void 0 : _c.value;
    }
    get workflow() {
        return this.getString(this.options.workflowVar);
    }
    get included() {
        return this.getBool(this.options.inclusionVar);
    }
    get events() {
        return this.items
            .filter(i => i.event)
            .map(i => { var _a; return (_a = i.event) === null || _a === void 0 ? void 0 : _a.event; })
            .sort()
            .filter((event, x, arr) => x == 0 || arr[x - 1] != event);
    }
    get pendingEvents() {
        return this.items
            .filter(i => i.event && !i.event.acknowledged)
            .map(i => { var _a; return (_a = i.event) === null || _a === void 0 ? void 0 : _a.event; })
            .sort()
            .filter((event, x, arr) => x == 0 || arr[x - 1] != event);
    }
    get acknowledgedEvents() {
        const pendings = this.pendingEvents;
        return this.events.filter(e => !pendings.includes(e));
    }
    getString(v) {
        var _a;
        return (_a = this.getItem(v)) === null || _a === void 0 ? void 0 : _a.value;
    }
    getBool(v) {
        const item = this.getItem(v);
        if (typeof item == "undefined")
            return undefined;
        return !!(item === null || item === void 0 ? void 0 : item.value);
    }
    getItem(v) {
        const varName = typeof v == "string" ? v : v === null || v === void 0 ? void 0 : v.name;
        return this.getItemForVariable(varName, 1);
    }
    get fillRate() {
        const [sum, count] = this.pageSet.items
            .filter(i => getItemType(i).name != ItemTypes.info.name)
            .map(i => this.items.some(t => t.pageItem.isInstanceOf(getItem(i)) && t.status == "fulfilled")
            ? 1
            : 0)
            .reduce(([sum, count], i) => {
            sum += i;
            count += 1;
            return [sum, count];
        }, [0, 0]);
        const rate = sum / count;
        return Number.isInteger(rate) ? rate : Number(rate.toFixed(2));
    }
    get currentPage() {
        const status = this.getStatusEntries();
        return status.reduce((current, s) => isInsufficient(current) || (!isInsufficient(s) && isIncomplete(current))
            ? current
            : s)[0];
    }
    getStatusEntries() {
        return this.pageSet.pages.map(p => [p, this.getStatusForPage(p)]);
    }
    pageOf(item) {
        return this.pageSet.pages.find(p => p.items.includes(item.pageItem));
    }
    get alerts() {
        return this.items.reduce((r, i) => r.append(...i.alerts.map(a => new RuleAlert(a, i, this))), DomainCollection());
    }
    get pins() {
        return this.pageSet.pins.map(pin => this.getItemForPin(pin));
    }
    get kpis() {
        return this.pageSet.kpis.flatMap(kpi => this.getItemForKpi(kpi));
    }
    getItemForPin(pin) {
        return this.items.find(item => hasContext(pin)
            ? item.pageItem == pin.pageItem && item.context == pin.context
            : item.pageItem == pin);
    }
    getItemForKpi(kpi) {
        return this.items
            .filter(item => this.isKpi(kpi, item))
            .map(item => this.getKpi(item));
    }
    isKpi(kpi, item) {
        return hasContext(kpi)
            ? item.pageItem.isInstanceOf(kpi.pageItem) && item.context == kpi.context
            : item.pageItem.isInstanceOf(kpi);
    }
    getKpi(item) {
        const kpi = item.pageItem.kpi;
        if (hasPivot(kpi)) {
            const pivotItem = this.getItemForVariable(kpi.pivot.variableName, item.pageItem.instance);
            return [item, pivotItem];
        }
        return item;
    }
    update(kwargs) {
        if (isZippedInterview(kwargs))
            return this.zip(kwargs);
        return Domain.update(this, kwargs, [Interview, this.pageSet, this.options]);
    }
    zip([kwargs, nkwargs]) {
        const updated = this.update(kwargs);
        if (nkwargs == undefined)
            return updated;
        const items = updated.zipItems(nkwargs);
        return updated.update({ items });
    }
    zipItems(nkwargs) {
        return typeof nkwargs.items != "undefined"
            ? this.zipArray(this.items, nkwargs.items)
            : this.items;
    }
    zipArray(source, items) {
        return source
            .map((i, n) => this.zipNthElem(i, n, items))
            .append(...items.slice(source.length));
    }
    zipNthElem(e, n, elems) {
        const p = elems[n];
        return p ? e.update(p) : e;
    }
    getStatusForPage(page) {
        const status = this.statusForPages.get(page);
        return status !== null && status !== void 0 ? status : "incomplete";
    }
    getItemsForPage(page) {
        const items = this.itemsForPages.get(page);
        return items !== null && items !== void 0 ? items : DomainCollection();
    }
    getItemForVariable(varItem, instance = 1) {
        const itemKey = this.getItemKey(varItem, instance);
        return this.itemForVariables.get(itemKey);
    }
    getItemsForPrototype(prototype) {
        const items = [];
        for (const instance of PageItem.getInstances(prototype)) {
            const item = this.getItemForVariable(instance);
            if (item)
                items.push(item);
        }
        return DomainCollection(...items);
    }
    nextInstance(item) {
        return this.getItemForVariable(item.pageItem.nextInstance());
    }
    hasNextInstance(item) {
        return (item.pageItem.hasNextInstance() && this.nextInstance(item) != undefined);
    }
    diff(previous) {
        return {};
    }
}
function isInsufficient([_, status]) {
    return status == "insufficient";
}
function isIncomplete([_, status]) {
    return status == "empty" || status == "incomplete";
}
function getLastItems(interviews, pageItems) {
    return pageItems.map(p => interviews.reduce((item, i) => {
        var _a;
        return (_a = i.items.find(it => typeof p == "string"
            ? it.pageItem.variableName == p
            : it.pageItem == p)) !== null && _a !== void 0 ? _a : item;
    }, undefined));
}

class Participant {
    constructor(participantCode, sample, kwargs) {
        this.interviews = DomainCollection();
        this.participantCode = participantCode;
        this.sample = sample;
        Object.assign(this, kwargs);
        Domain.extend(this);
    }
    get inclusionDate() {
        var _a;
        return (_a = this.interviews.find(i => i.included)) === null || _a === void 0 ? void 0 : _a.date;
    }
    get firstDate() {
        const minTime = Math.min(...this.interviews.map(i => { var _a, _b; return (_b = (_a = i.date) === null || _a === void 0 ? void 0 : _a.getTime()) !== null && _b !== void 0 ? _b : Infinity; }));
        return isFinite(minTime) ? new Date(minTime) : undefined;
    }
    currentInterview(workflow) {
        var _a;
        const available = this.availableInterviews(workflow);
        const currentinterview = (_a = available.find(interview => interview.status == "insufficient")) !== null && _a !== void 0 ? _a : available.find(interview => interview.status == "incomplete");
        if (currentinterview != undefined)
            return currentinterview;
        return available[available.length - 1];
    }
    get lastInput() {
        return this.interviews.reduce((acc, interview) => {
            return acc > interview.lastInput ? acc : interview.lastInput;
        }, new Date(0));
    }
    get workflow() {
        return this.interviews.reduce((w, i) => { var _a; return (_a = i.workflow) !== null && _a !== void 0 ? _a : w; }, undefined);
    }
    get included() {
        return this.interviews.some(i => i.included);
    }
    getValues(...pageItems) {
        return this.currentItems(DomainCollection(...pageItems)).map(i => i === null || i === void 0 ? void 0 : i.value);
    }
    currentItems(pageItems, interview) {
        const interviews = this.soFar(interview);
        return getLastItems(interviews, pageItems);
    }
    soFar(interview) {
        return interview == undefined
            ? this.interviews
            : this.interviews.takeWhile(i => i != interview);
    }
    get alerts() {
        return this.interviews.reduce((r, i) => r.append(...i.alerts), DomainCollection());
    }
    availablePageSets(workflow) {
        var _a;
        if (((_a = this.currentInterview(workflow)) === null || _a === void 0 ? void 0 : _a.status) == "insufficient")
            return DomainCollection();
        return workflow.available(...this.interviews.map(i => i.pageSet));
    }
    availableInterviews(workflow) {
        return this.interviews.filter(i => workflow.pageSets.includes(i.pageSet));
    }
    next(workflow, interview) {
        const sofar = [
            ...this.soFar(interview).map(i => i.pageSet),
            interview.pageSet,
        ];
        const nextPageSet = workflow.next(...sofar);
        if (nextPageSet == undefined)
            return undefined;
        if (sofar.length == this.interviews.length)
            return nextPageSet;
        if (this.interviews[sofar.length].pageSet == nextPageSet)
            return this.interviews[sofar.length];
        return undefined;
    }
    first(workflow) {
        return workflow.first;
    }
    update(kwargs) {
        return Domain.update(this, kwargs, [
            Participant,
            this.participantCode,
            this.sample,
        ]);
    }
}
function formatCode(participant, options) {
    var _a, _b;
    const len = (_b = (_a = options === null || options === void 0 ? void 0 : options.participantCodeStrategy) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 5;
    return participant.participantCode.slice(-len);
}

function getRuleArgs(rule) {
    const args = __rest(rule, ["name", "precedence"]);
    return args;
}
class CrossItemRule {
    constructor(q, rule, when = "always") {
        this.when = when;
        if (q instanceof PageItem || isScopedItem(q)) {
            this.pageItems = DomainCollection(q);
        }
        else {
            this.pageItems = q;
        }
        this.rule = rule;
        Object.freeze(this);
    }
    get name() {
        return this.rule.name;
    }
    get precedence() {
        return this.rule.precedence;
    }
    get args() {
        return getRuleArgs(this.rule);
    }
    get target() {
        const t = this.pageItems.last;
        return isScopedItem(t) ? t[0] : t;
    }
    is(name) {
        return this.rule.name == name;
    }
    execute(...args) {
        const result = this.pageItems.length == 1
            ? this.rule.execute(args[0])
            : this.rule.execute(...args);
        return Array.isArray(result) ? result : [result];
    }
}
function unitToCrossRules(pageItem) {
    return pageItem.rules.map(r => new CrossItemRule(pageItem, r));
}
function parseVariableNames(variableNames) {
    return variableNames.map(v => {
        return parseVariableName(v);
    });
}
function parseVariableName(v) {
    return v.startsWith("@")
        ? [v.substr(1), "global"]
        : v.startsWith("$")
            ? [v.substr(1), "outer"]
            : [v, "local"];
}
function getVariableName(pageItem) {
    if (pageItem instanceof PageItem)
        return pageItem.variableName;
    return getVariableNameWhenScoped(pageItem);
}
function getVariableNameWhenScoped(pageItem) {
    const [{ variableName }, scope] = pageItem;
    const prefix = scope == "global" ? "@" : scope == "outer" ? "$" : "";
    return prefix + variableName;
}
function link(parsed, pageItems, when = "always") {
    const parsedVariables = parseVariableNames(parsed.variableNames);
    const items = parsedVariables.map(variableName => getPageItemForVariable(variableName, pageItems));
    return new CrossItemRule(DomainCollection(...items), parsed.rule, when);
}
function getPageItemForVariable([variableName, scope], pageItems) {
    const pageItem = getPageItem(variableName, pageItems);
    if (!pageItem)
        throw `unknown variable ${variableName}`;
    return [pageItem, scope];
}
function getPageItem(variableName, pageItems) {
    return pageItems.find(q => q.variableName == variableName);
}
class FirstPassReset extends Set {
    constructor(when) {
        super();
        if (!Array.isArray(when)) {
            this.when = ["always"];
            if (typeof when.initialization != "undefined")
                for (const init of when.initialization)
                    if (status(init) == "missing")
                        this.add(init);
        }
        else
            this.when = when;
    }
    proceedWithRule(rule) {
        return this.when.includes(rule.when) || this.size > 0;
    }
    proceedWithItems(rule, items) {
        return (this.when.includes(rule.when) ||
            (rule.when == "initialization" && this.has(items[items.length - 1])));
    }
    processResult(item, result) {
        if (this.isActivated(item, result))
            this.add(result);
        if (item != result)
            this.delete(item);
    }
    isActivated(item, result) {
        return (item.specialValue == "notApplicable" &&
            typeof result.specialValue == "undefined");
    }
}
class SecondPassReset extends Set {
    constructor(reset) {
        super();
        for (const item of reset)
            this.add(item);
    }
    proceedWithRule(rule) {
        return rule.when == "initialization";
    }
    proceedWithItems(rule, items) {
        return this.has(items[items.length - 1]);
    }
    processResult() { }
}
function execute(rules, x, when = ["always"], startsWith) {
    if (x instanceof Participant)
        return executeAll(rules, x, when, startsWith);
    const sequence = ruleSequence(rules);
    const firstPass = new FirstPassReset(when);
    const execScope = executeSequence(sequence, x, firstPass);
    const secondPass = new SecondPassReset(firstPass);
    return executeSequence(sequence, execScope, secondPass);
}
function executeSequence(selection, scope, reset) {
    return selection
        .filter(rule => reset.proceedWithRule(rule))
        .reduce((result, rule) => executeRuleAndMapResult(rule, result, reset), scope);
}
function ruleSequence(rules) {
    return rules
        .map((r, i) => [i, r])
        .sort((r1, r2) => compareRules(r1, r2))
        .map(([_, r]) => r);
}
function compareRules([i1, r1], [i2, r2]) {
    if (r1.target == r2.target) {
        const c = comparePrecedences(r1, r2);
        if (c)
            return c;
    }
    return comparePositions(i1, i2);
}
function comparePrecedences(r1, r2) {
    return r2.precedence - r1.precedence;
}
function comparePositions(i1, i2) {
    return i1 - i2;
}
function executeRuleAndMapResult(rule, scope, reset, instance = 1) {
    const items = getItemsForRule(rule, scope, instance);
    if (items !== false)
        return executeRuleForInstance(rule, scope, items, reset, instance);
    return scope;
}
function executeRuleForInstance(rule, scope, items, reset, instance) {
    const scopeForInstance = reset.proceedWithItems(rule, items)
        ? proceed(rule, scope, items, reset)
        : scope;
    if (rule.target.array)
        return executeRuleForNextInstance(rule, scopeForInstance, reset, instance);
    return scopeForInstance;
}
function proceed(rule, scope, items, reset) {
    const results = tryExecuteRule(rule, items);
    const localResults = processResults(rule, results, items, reset);
    return scope.with(localResults);
}
function executeRuleForNextInstance(rule, scope, reset, instance) {
    return executeRuleAndMapResult(rule, scope, reset, instance + 1) || scope;
}
function processResults(rule, results, items, reset) {
    const localResults = new Array();
    for (const i in results) {
        const item = items[i];
        const result = results[i];
        const prototype = rule.pageItems[i];
        if (isLocalResult(item, prototype)) {
            localResults.push(result);
            reset.processResult(item, result);
        }
    }
    return localResults;
}
function tryExecuteRule(rule, items) {
    try {
        return executeRule(rule, items);
    }
    catch (e) {
        console.log(e);
        return [];
    }
}
function executeRule(rule, items) {
    const result = rule.execute(...items);
    return items.map((a, i) => update(a, result[i]));
}
function getItemsForRule(rule, scope, instance) {
    const items = new Array(rule.pageItems.length);
    for (let i = 0; i < rule.pageItems.length; i++) {
        const added = addItemForRule(items, rule, scope, instance, i);
        if (!added)
            return false;
    }
    const targetItem = items[items.length - 1];
    return isMissing(targetItem) ? false : items;
}
function addItemForRule(items, rule, scope, instance, i) {
    const pageItem = getItemForInstance(rule, i, instance);
    if (pageItem === false)
        return false;
    const scoped = scope.get(pageItem);
    if (typeof scoped == "undefined")
        return false;
    items[i] = scoped;
    return true;
}
function getItemForInstance(rule, i, instance) {
    const level = getScope(rule.pageItems[i]);
    const proto = getScopedItem(rule.pageItems[i]);
    const pageItem = proto.array ? PageItem.getInstance(proto, instance) : proto;
    if (pageItem.array && pageItem.instance != instance)
        return false;
    return [pageItem, level];
}
function isLocalResult(item, pageItem) {
    return !isMissing(item) && getScope(pageItem) == "local";
}
function executeAll(rules, participant, when, startsWith) {
    const startIndex = startsWith ? participant.interviews.indexOf(startsWith) : 0;
    const reset = resetMessages(participant, startIndex);
    return reset.interviews.reduce((p, i, x) => {
        if (x < startIndex)
            return p;
        const scope = Scope.create(p, i);
        const executed = execute(rules, scope, when).items;
        return p.update({
            interviews: p.interviews.update(ii => ii == i ? i.update({ items: i.items.map((i, x) => executed[x]) }) : ii),
        });
    }, reset);
}
function resetMessages(participant, startIndex) {
    return participant.update({
        interviews: participant.interviews.map((i, x) => x < startIndex
            ? i
            : i.update({
                items: i.items.map(t => hasMessages(t.messages) ? resetItemMessages(t) : t),
            })),
    });
}
function resetItemMessages(t) {
    return t.update({
        messages: isamplemMessages(t.messages)
            ? { __acknowledged: t.messages.__acknowledged }
            : {},
    });
}

class ConstantRule {
    constructor(value) {
        this.value = value;
        this.name = "constant";
        this.precedence = 100;
    }
    execute(a) {
        return update(a, { value: this.value });
    }
}
class RequiredRule {
    constructor(enforced = true) {
        this.enforced = enforced;
        this.name = "required";
        this.precedence = 70;
    }
    execute(a) {
        const messages = setMessageIf(this.enforced && typeof a.value == "undefined")(a.messages, this.name, RequiredRule.message);
        return update(a, { messages });
    }
}
RequiredRule.message = "value is required";
class CriticalRule {
    constructor(event, message = event, ...values) {
        this.event = event;
        this.message = message;
        this.name = "critical";
        this.precedence = 70;
        this.values = values;
    }
    execute(a) {
        const enforced = this.values.length == 0 ||
            this.values[0] === true ||
            this.values.includes(a.value);
        const messages = setMessageIf(enforced && typeof a.value != "undefined")(a.messages, this.name, `${this.event}`);
        return update(a, { messages });
    }
}
const limits = {
    includeNone: { includeLower: false, includeUpper: false },
    includeLower: { includeLower: true, includeUpper: false },
    includeUpper: { includeLower: false, includeUpper: true },
    includeBoth: { includeLower: true, includeUpper: true },
};
class InRangeRule {
    constructor(min = 0, max = 1, limits = { includeLower: false, includeUpper: false }) {
        this.min = min;
        this.max = max;
        this.limits = limits;
        this.name = "inRange";
        this.precedence = 10;
    }
    execute(a) {
        var _a, _b;
        const minLimitChar = ((_a = this.limits) === null || _a === void 0 ? void 0 : _a.includeLower) ? "[" : "]";
        const maxLimitChar = ((_b = this.limits) === null || _b === void 0 ? void 0 : _b.includeUpper) ? "]" : "[";
        const minLabel = typeof this.min == "number"
            ? this.min
            : ItemTypes.date(false).label(this.min);
        const maxLabel = typeof this.max == "number"
            ? this.max
            : ItemTypes.date(false).label(this.max);
        const message = `value must be in range ${minLimitChar}${minLabel}, ${maxLabel}${maxLimitChar}`;
        const value = typeof a.value == "string"
            ? new Date(`${a.value}-01-01`.substr(0, 10))
            : a.value;
        const messages = setMessageIf(value < this.min ||
            value > this.max ||
            (!this.limits.includeLower && a.value == this.min) ||
            (!this.limits.includeUpper && a.value == this.max))(a.messages, this.name, message);
        return update(a, { messages });
    }
}
class MaxLengthRule {
    constructor(length) {
        this.name = "maxLength";
        this.precedence = 10;
        this.length = length;
    }
    execute(a) {
        var _a;
        const messages = setMessageIf(((_a = a.value) === null || _a === void 0 ? void 0 : _a.length) > this.length)(a.messages, this.name, `Text must be less than ${this.length} characters long`);
        return update(a, { messages });
    }
}
class DecimalPrecisionRule {
    constructor(precision) {
        this.name = "decimalPrecision";
        this.precedence = 10;
        this.precision = precision;
    }
    execute(a) {
        if (!a.value)
            return a;
        const k = Math.pow(10, this.precision);
        return update(a, {
            value: Math.round(a.value * k) / k,
        });
    }
}
class FixedLengthRule {
    constructor(length) {
        this.name = "fixedLength";
        this.precedence = 10;
        this.length = length;
    }
    execute(a) {
        var _a;
        const messages = setMessageIf(((_a = a.value) === null || _a === void 0 ? void 0 : _a.length) != this.length)(a.messages, this.name, `text length must be ${this.length}`);
        return update(a, { messages });
    }
}
class LetterCaseRule {
    constructor(letterCase) {
        this.letterCase = letterCase;
        this.name = "letterCase";
        this.precedence = 10;
    }
    execute(target) {
        if (target.value != undefined) {
            const value = target.value;
            target =
                this.letterCase == "upper"
                    ? update(target, { value: value.toUpperCase() })
                    : update(target, { value: value.toLowerCase() });
        }
        return target;
    }
}

class Library {
    constructor(page, pageItems, contexts) {
        this.page = page;
        this.pageItems = pageItems;
        this.contexts = contexts;
        Domain.extend(this);
    }
    get items() {
        return (!this.pageItems || this.pageItems.length == 0
            ? this.page.items
            : this.pageItems).map(i => { var _a, _b; return (_b = (_a = this.contexts) === null || _a === void 0 ? void 0 : _a.find(c => c.pageItem == getItem(i))) !== null && _b !== void 0 ? _b : i; });
    }
}
class Page {
    constructor(name, kwargs) {
        this.includes = DomainCollection();
        this.name = name;
        Object.assign(this, kwargs);
        this.items = this.getItems();
        this.requiredItems = this.getRequiredItems();
        this.pins = this.getPins();
        this.kpis = this.getKpis();
        this.array = this.isArray();
        Object.defineProperty(this, "item", { enumerable: false });
        Object.defineProperty(this, "array", { enumerable: false });
        Object.defineProperty(this, "requiredItems", { enumerable: false });
        Object.defineProperty(this, "pins", { enumerable: false });
        Object.defineProperty(this, "kpis", { enumerable: false });
        Domain.extend(this);
    }
    getItems() {
        return this.includes.reduce((result, l) => {
            return l instanceof PageItem
                ? result.append(l)
                : l.items.reduce((r, i) => (r.includes(i) ? r : r.append(i)), result);
        }, DomainCollection());
    }
    getRequiredItems() {
        return this.items.filter(i => getItem(i).rules.some(rule => rule instanceof RequiredRule));
    }
    getPins() {
        return this.items.filter(i => getItem(i).pin);
    }
    getKpis() {
        return this.items.filter(i => getItem(i).kpi);
    }
    isArray() {
        return this.items.length != 0 && this.items.every(i => getItem(i).array);
    }
    update(kwargs) {
        return Domain.update(this, kwargs, [Page, this.name]);
    }
}

class PageSet {
    constructor(type, kwargs) {
        this.pages = DomainCollection();
        this.mandatoryPages = DomainCollection();
        this.type = type;
        Object.assign(this, kwargs);
        this.items = this.getItems();
        this.itemForVariables = this.getItemForVariables();
        this.pagesForItems = this.getPagesForItems();
        Object.defineProperty(this, "items", { enumerable: false });
        Object.defineProperty(this, "itemForVariables", { enumerable: false });
        Object.defineProperty(this, "pagesForItems", { enumerable: false });
        Domain.extend(this);
    }
    getItemForVariables() {
        return this.items.reduce((result, item) => {
            result.set(getItem(item).variableName, item);
            return result;
        }, new Map());
    }
    getPagesForItems() {
        return this.pages.reduce((acc, page) => this.addItemsForPage(acc, page), new Map());
    }
    addItemsForPage(acc, page) {
        return page.items.reduce((acc, item) => this.addItemForPage(acc, page, item), acc);
    }
    addItemForPage(acc, page, item) {
        const rawItem = getItem(item).variableName;
        const pages = acc.get(rawItem);
        if (pages)
            acc.set(rawItem, pages.append(page));
        else
            acc.set(rawItem, DomainCollection(page));
        return acc;
    }
    getItems() {
        return this.pages.reduce((result, p) => p.items.reduce((r, i) => r.findIndex(t => getItem(t) == getItem(i)) > -1 ? r : r.append(i), result), DomainCollection());
    }
    update(kwargs) {
        return Domain.update(this, kwargs, [PageSet, this.type]);
    }
    getPagesForItem(item) {
        var _a;
        return ((_a = this.pagesForItems.get(getItem(item).variableName)) !== null && _a !== void 0 ? _a : DomainCollection());
    }
    getItemForVariable(variableName) {
        return this.itemForVariables.get(variableName);
    }
    hasamplem(item) {
        return this.pagesForItems.has(getItem(item).variableName);
    }
    isMandatory(page) {
        var _a;
        return (!!((_a = this.mandatoryPages) === null || _a === void 0 ? void 0 : _a.includes(page)) && page.requiredItems.length != 0);
    }
    get pins() {
        return this.items.filter(i => getItem(i).pin);
    }
    get kpis() {
        return this.items.filter(i => getItem(i).kpi);
    }
}

class Workflow {
    constructor(kwargs) {
        this.info = Workflow.home().infoPageSet;
        this.single = DomainCollection();
        this.many = DomainCollection();
        this.sequence = DomainCollection();
        this.stop = DomainCollection();
        this.name = "main";
        this.notifications = DomainCollection();
        Object.assign(this, kwargs);
        Domain.extend(this);
    }
    get pageSets() {
        const singleAux = this.single.filter(p => !this.sequence.includes(p));
        const manyAux = this.many.filter(p => !this.sequence.includes(p));
        return this.info
            ? DomainCollection(this.info, ...this.sequence, ...singleAux, ...manyAux)
            : DomainCollection(...this.sequence, ...singleAux, ...manyAux);
    }
    available(...done) {
        if (!this.main)
            return this.walkSequence(done);
        return this.main.walkSequence(done).filter(p => this.pageSets.includes(p));
    }
    walkSequence(done) {
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
    next(...done) {
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
    get first() {
        var _a;
        return (_a = this.info) !== null && _a !== void 0 ? _a : this.sequence[0];
    }
    get start() {
        return this.sequence[0];
    }
    get startLoop() {
        return this.sequence.find(p => this.many.includes(p));
    }
    isEnded(done) {
        return this.stop.includes(done[done.length - 1]);
    }
    isNotInitialized(done) {
        return done.length == 0 && typeof this.info != undefined;
    }
    isNotStarted(done) {
        return !done.includes(this.sequence[0]);
    }
    isSequenceBroken(done) {
        return (!this.isInSequence(done) ||
            this.isComplete(done, this.nextInSequence(done)));
    }
    isInSequence(done) {
        return (this.isNotStarted(done) || this.sequence.includes(done[done.length - 1]));
    }
    isComplete(done, next) {
        return done.includes(next) && this.single.includes(next);
    }
    isLoopEnded(done) {
        return this.nextInSequence(done) == undefined;
    }
    nextInSequence(done) {
        const lastInSequence = done.reduce((last, p) => {
            const y = this.sequence.indexOf(p);
            return y == -1 ? last : y;
        }, -1);
        const nextInSequence = lastInSequence + 1;
        return this.sequence[nextInSequence];
    }
    continueSequence(done, current = this.nextInSequence(done)) {
        const remainingSingle = this.single.filter(p => !done.includes(p) && !this.stop.includes(p) && current != p);
        const remainingMany = this.many.filter(p => !this.sequence.includes(p));
        return DomainCollection(...(current ? [current] : []), ...remainingSingle, ...remainingMany, ...this.stop);
    }
    isInfo(pageSet) {
        var _a;
        return pageSet == this.info || pageSet == ((_a = this.main) === null || _a === void 0 ? void 0 : _a.info);
    }
    update(kwargs) {
        return Domain.update(this, kwargs, [Workflow]);
    }
    static default(pageSets) {
        const { infoPageSet, infoPage } = Workflow.home();
        const mainWorkflow = new Workflow({
            name: "main",
            info: infoPageSet,
            single: pageSets,
            sequence: pageSets,
        });
        return { infoPage, infoPageSet, mainWorkflow };
    }
    static home() {
        const info = { __code__: "HOME", en: "Synthesis" };
        const infoPage = new Page(info);
        const infoPageSet = new PageSet(info, {
            pages: DomainCollection(infoPage),
        });
        return { infoPageSet, infoPage };
    }
}

class SurveyOptions {
    constructor() {
        var _a;
        this.languages = ["en", "fr"];
        this.defaultLang = ((_a = this.languages) === null || _a === void 0 ? void 0 : _a.length) ? this.languages[0] : "en";
        this.interviewDateVar = "VDATE";
        this.phoneVar = "__PHONE";
        this.emailVar = "__EMAIL";
        this.showFillRate = true;
        this.epro = false;
        this.inclusionVar = {
            name: "__INCLUDED",
            hidden: false,
        };
        this.unitSuffix = "_UNIT";
        this.workflowVar = "__WORKFLOW";
        this.participantCodeStrategy = {
            length: 5,
            bySample: false,
        };
    }
}
function isVariableHidden(variableName, def) {
    if (typeof def == "undefined")
        return false;
    if (typeof def == "string")
        return variableName == def;
    return variableName == def.name && !!def.hidden;
}
class Survey {
    constructor(name, kwargs) {
        this.options = new SurveyOptions();
        this.workflows = DomainCollection();
        this.pageSets = DomainCollection();
        this.pages = DomainCollection();
        this.crossRules = DomainCollection();
        this.name = name;
        Object.assign(this, kwargs);
        if (this.workflows.length == 0)
            Object.assign(this, this.initWorkflow());
        if (!this.pageSets.includes(this.mainWorkflow.info))
            Object.assign(this, this.initInfo(this.mainWorkflow));
        this.itemForVariables = this.getItemForVariables();
        this.items = DomainCollection(...this.itemForVariables.values());
        this.rules = this.getRules();
        Object.defineProperty(this, "items", { enumerable: false });
        Object.defineProperty(this, "rules", { enumerable: false });
        Object.defineProperty(this, "itemForVariables", { enumerable: false });
        Domain.extend(this);
    }
    initInfo(workflow) {
        const pages = this.pages.append(...workflow.info.pages);
        const pageSets = this.pageSets.append(workflow.info);
        return { pages, pageSets };
    }
    initWorkflow() {
        const { infoPage, infoPageSet, mainWorkflow } = Workflow.default(this.pageSets);
        const pages = this.pages.append(infoPage);
        const pageSets = this.pageSets.append(infoPageSet);
        const workflows = DomainCollection(mainWorkflow);
        return { pages, pageSets, workflows };
    }
    get mainWorkflow() {
        return this.workflow("main");
    }
    workflow(name) {
        const workflowName = typeof name == "undefined"
            ? "main"
            : typeof name == "string"
                ? name
                : name.workflow;
        const workflow = this.workflows.find(w => w.name == workflowName);
        return (workflow !== null && workflow !== void 0 ? workflow : (typeof name == "string" ? undefined : this.mainWorkflow));
    }
    getItemForVariables() {
        return this.pages.reduce((result, p) => p.includes
            .filter((i) => i instanceof PageItem)
            .reduce((r, item) => {
            r.set(item.variableName, item);
            return r;
        }, result), new Map());
    }
    getItemForVariable(variableName) {
        return this.itemForVariables.get(variableName);
    }
    get inclusionPageSet() {
        var _a;
        const inclusionVar = typeof this.options.inclusionVar == "string"
            ? this.options.inclusionVar
            : (_a = this.options.inclusionVar) === null || _a === void 0 ? void 0 : _a.name;
        return this.pageSets.find(p => p.items.some(i => getItem(i).variableName == inclusionVar));
    }
    update(kwargs) {
        return Domain.update(this, kwargs, [Survey, this.name]);
    }
    getRules() {
        return this.items.reduce((rules, i) => {
            const r = Survey.getUnitRules(i).concat(this.crossRules.filter(r => r.target == i));
            return ruleSequence(rules.append(...r));
        }, DomainCollection());
    }
    get pins() {
        return this.items.filter(i => i.pin);
    }
    get kpis() {
        return this.items.filter(i => i.kpi);
    }
    static getUnitRules(pageItem) {
        const reducer = Survey.addUnitRule(pageItem);
        const allRules = pageItem.rules.reduce((rules, r) => reducer(rules, r), DomainCollection());
        return pageItem.defaultValue == undefined
            ? allRules
            : reducer(allRules, pageItem.defaultValue, "initialization");
    }
    static addUnitRule(pageItem) {
        return (rules, rule, when = "always") => rules.append(new CrossItemRule(pageItem, rule, when));
    }
}

class Sample {
    constructor(sampleCode, kwargs) {
        this.name = "";
        this.address = "";
        this.frozen = false;
        this.sampleCode = sampleCode;
        Object.assign(this, kwargs);
        Domain.extend(this);
    }
    update(kwargs) {
        return Domain.update(this, kwargs, [Sample, this.sampleCode]);
    }
    freeze() {
        return this.update({ frozen: true });
    }
}

class ActivationRule {
    constructor(values = [], behavior = "enable") {
        this.values = values;
        this.behavior = behavior;
        this.name = "activation";
        this.precedence = 50;
    }
    execute(activator, target) {
        return [
            activator,
            this.isActivated(activator)
                ? this.activate(target)
                : this.deactivate(target),
        ];
    }
    isActivated(activator) {
        return this.values.some(v => v == activator.value);
    }
    deactivate(target) {
        const messages = unsetMessage(target.messages, "required");
        target = update(target, { messages });
        if (this.needsDeactivation(target))
            target = update(target, {
                value: undefined,
                unit: undefined,
                specialValue: "notApplicable",
            });
        return target;
    }
    needsDeactivation(target) {
        return (target.value != undefined ||
            target.unit != undefined ||
            target.specialValue != "notApplicable");
    }
    activate(target) {
        if (this.needsActivation(target))
            target = update(target, {
                specialValue: undefined,
            });
        return target;
    }
    needsActivation(target) {
        return target.specialValue == "notApplicable";
    }
    static enable(...values) {
        return new ActivationRule(values, "enable");
    }
    static show(...values) {
        return new ActivationRule(values, "show");
    }
}

class ComputedRule {
    constructor(formula, argCount = 10) {
        this.formula = formula;
        this.argCount = argCount;
        this.name = "computed";
        this.precedence = 100;
        if (isAuthorized(formula))
            this.func = this.makeFunc(argCount, formula);
        else
            throw "Unauthorized code in formula";
        Object.defineProperties(this, {
            func: {
                enumerable: false,
                writable: false,
                configurable: false,
            },
        });
        Object.freeze(this);
    }
    makeFunc(argCount, formula) {
        const argList = ComputedRule.makeArgList(argCount);
        const body = ComputedRule.transpile(formula);
        return new Function(...argList, `return ${body}`);
    }
    static makeArgList(argCount) {
        const args = new Array(argCount).fill(1).map((o, i) => `$${i + o}`);
        return ["$", ...args];
    }
    static transpile(formula) {
        return formula
            .replace(/#([0-9]{4}-[0-9]{2}-[0-9]{2})#/g, (_, iso) => `new Date('${iso}')`)
            .replace(/~/g, "$.");
    }
    execute(...args) {
        const firsts = args.slice(0, args.length - 1);
        const last = args[args.length - 1];
        return [...firsts, this.compute(args, last)];
    }
    compute(args, last) {
        const a = [
            this.buildContextArg(last),
            ...args.map(a => (a.specialValue == "notApplicable" ? null : a.value)),
        ];
        const result = this.func(...a);
        const value = this.buildResult(result, last);
        return update(last, value);
    }
    buildContextArg(last) {
        const undef = "~MEM:undefined";
        const context = getItemMemento(last);
        const state = context == undef ? undefined : context;
        const ctx = {
            IN: (searchValues, value) => {
                return !!(searchValues === null || searchValues === void 0 ? void 0 : searchValues.includes(value));
            },
            UNDEF: (...v) => v.every(v => v == undefined),
            NA: (...v) => v.every(v => v === null),
            MEM: (value, memento) => {
                var _a;
                return { value, memento: (_a = memento !== null && memento !== void 0 ? memento : value) !== null && _a !== void 0 ? _a : undef };
            },
            M: state,
        };
        const ctxFun = (value, memento) => {
            return ctx.UNDEF(value, memento) ? ctx.M : ctx.MEM(value, memento);
        };
        return Object.assign(ctxFun, ctx);
    }
    buildResult(result, last) {
        if (isUndef(result))
            return makeUndef();
        return this.buildValuedResult(result, last);
    }
    buildValuedResult(result, last) {
        const value = hasContextValue(result) ? result.value : result;
        const memento = hasContextValue(result) ? result.memento : undefined;
        const { lastContext, lastMemento } = getLastContext(last);
        return Object.assign({ value, specialValue: undefined }, makeNewContext(lastContext, lastMemento, memento));
    }
}
class ComputedParser {
    constructor(formula, variableNames = []) {
        this.formula = formula;
        this.variableNames = variableNames;
    }
    static parse(variableName, formula) {
        const stringsOut = formula.replace(/'[^']+'/g, "''");
        const varExp = new RegExp(/(^|[^\w'~])([$@]?(__)?[A-Za-z]\w*)/, "g");
        const variableNames = ComputedParser.parseVars(varExp, stringsOut);
        const parser = variableNames
            .filter(v => v != variableName)
            .concat(variableName ? [variableName] : [])
            .reduce((parser, v) => ComputedParser.rewrite(parser, v), new ComputedParser(formula));
        return {
            variableNames: parser.variableNames,
            formula: parser.formula,
        };
    }
    static parseVars(varExp, formula) {
        const variableNames = [];
        let match = varExp.exec(formula);
        while (match) {
            if (!variableNames.includes(match[2]))
                variableNames.push(match[2]);
            match = varExp.exec(formula);
        }
        return variableNames.sort();
    }
    static rewrite(result, variableName) {
        const variableNames = [...result.variableNames, variableName];
        const variableExpr = variableName.replace(/([$@])?(\w*)$/, (s, p1, p2) => {
            return `${p1 ? `\\${p1}` : ""}\\b${p2}\\b`;
        });
        const expression = result.formula.replace(new RegExp(variableExpr, "g"), `$${String(variableNames.length)}`);
        return new ComputedParser(expression, variableNames);
    }
}
function makeNewContext(lastContext, lastMemento, memento) {
    return memento && memento != lastMemento
        ? { context: [lastContext, memento] }
        : {};
}
function getLastContext(last) {
    const lastContext = getItemContext(last);
    const lastMemento = getItemMemento(last);
    return { lastContext, lastMemento };
}
function hasContextValue(result) {
    return (typeof result == "object" &&
        result != null &&
        "memento" in result &&
        "value" in result);
}
function makeUndef() {
    return {
        value: undefined,
        specialValue: undefined,
    };
}
function isAuthorized(formula) {
    return /^([[#$\d.,+\-*/%()=<>?:&!| \]]|('.*')|(~[A-Z(]+))*$/.test(formula);
}
function isUndef(result) {
    return typeof result == "number" && isNaN(result);
}
class Macros {
    static memorize(variableName) {
        return `~NA(${variableName})?~MEM(~M):~MEM(${variableName})`;
    }
}

class CopyRule {
    constructor() {
        this.name = "copy";
        this.precedence = 110;
    }
    execute(source, target) {
        return [
            source,
            {
                value: source.value,
                unit: source.unit,
                specialValue: source.specialValue,
            },
        ];
    }
}

class DynamicRule {
    constructor(rule, computedArgs, ...extraArgs) {
        this.rule = rule;
        this.computedArgs = computedArgs;
        this.name = "dynamic";
        const r = rule(...[]);
        this.precedence = r.precedence;
        this.underlyingRule = r.name;
        this.extraArgs = extraArgs;
        this.formula = [this.computedArgs.formula, this.computedArgs.argCount];
    }
    execute(...args) {
        const computed = this.computedArgs.execute(...args.map(i => (Object.assign({}, i))));
        const dynamicArgs = computed[computed.length - 1].value;
        const a = [...dynamicArgs, ...this.extraArgs];
        const dynamic = this.rule(...a);
        if (dynamic.execute.length == 1) {
            const result = this.executeUnitRule(dynamic, args);
            return args.length == 1 ? result[0] : result;
        }
        return this.executeCrossRule(dynamic, args);
    }
    executeUnitRule(dynamic, args) {
        const result = dynamic.execute(args[args.length - 1]);
        return [...args.slice(0, -1), result];
    }
    executeCrossRule(dynamic, args) {
        const execute = dynamic.execute.bind(dynamic);
        const execArgs = args.slice(-dynamic.execute.length);
        const result = execute(...execArgs);
        return [...args.slice(0, -result.length), ...result];
    }
}

class Rules {
    static create(x, ...args) {
        const f = Rules.factory(typeof x == "string" ? x : x.name);
        const a = typeof x == "string" ? args : Rules.args(x);
        return f(...a);
    }
    static args(_a) {
        var { name } = _a, args = __rest(_a, ["name"]);
        switch (name) {
            case "required":
                return [args.enforced];
            case "critical":
                return [args.event, args.message, ...args.values];
            case "constant":
                return [args.value];
            case "copy":
                return [];
            case "inRange":
                return [args.min, args.max, args.limits];
            case "maxLength":
                return [args.length];
            case "fixedLength":
                return [args.length];
            case "decimalPrecision":
                return [args.precision];
            case "letterCase":
                return [args.letterCase];
            case "activation":
                return [args.values, args.behavior];
            case "computed":
                return [args.formula, args.argCount];
            case "dynamic":
                return [
                    args.underlyingRule,
                    args.formula,
                    ...args.extraArgs,
                ];
        }
    }
    static factory(name) {
        switch (name) {
            case "required":
                return Rules.required;
            case "critical":
                return Rules.critical;
            case "constant":
                return Rules.constant;
            case "copy":
                return Rules.copy;
            case "inRange":
                return Rules.inRange;
            case "maxLength":
                return Rules.maxLength;
            case "fixedLength":
                return Rules.fixedLength;
            case "decimalPrecision":
                return Rules.decimalPrecision;
            case "letterCase":
                return Rules.letterCase;
            case "activation":
                return Rules.activation;
            case "computed":
                return Rules.computed;
            case "dynamic":
                return Rules.dynamic;
        }
    }
    static find(rules, name, ...args) {
        return rules.find(r => Rules.matchRule(r, name, ...args));
    }
    static matchRule(rule, ruleName, ...args) {
        return (Rules.matchDirectRule(rule, ruleName, args) ||
            Rules.matchDynamicRule(rule, ruleName, args));
    }
    static matchDirectRule(rule, ruleName, args) {
        return ((rule instanceof CrossItemRule &&
            rule.is(ruleName) &&
            this.isSubset(args, Object.values(rule.args))) ||
            (rule.name == ruleName && this.isSubset(args, Object.values(rule))));
    }
    static matchDynamicRule(rule, ruleName, args) {
        return (rule instanceof CrossItemRule &&
            rule.is("dynamic") &&
            rule.args.underlyingRule == ruleName &&
            Rules.isSubset(args, rule.args.extraArgs));
    }
    static isSubset(search, into) {
        return search.every(a => into.includes(a));
    }
}
Rules.required = (enforced = true) => new RequiredRule(enforced);
Rules.critical = (event, message = event, ...values) => new CriticalRule(event, message, ...values);
Rules.constant = (value) => new ConstantRule(value);
Rules.copy = () => new CopyRule();
Rules.inRange = (min, max, limits) => new InRangeRule(min, max, limits);
Rules.maxLength = (length) => new MaxLengthRule(length);
Rules.fixedLength = (length) => new FixedLengthRule(length);
Rules.decimalPrecision = (precision) => new DecimalPrecisionRule(precision);
Rules.letterCase = (letterCase) => new LetterCaseRule(letterCase);
Rules.activation = (values, behavior) => new ActivationRule(values, behavior);
Rules.computed = (formula, argCount = 10) => new ComputedRule(formula, argCount);
Rules.dynamic = (rule, computed, ...extraArgs) => new DynamicRule(typeof rule == "string" ? Rules.factory(rule) : rule, new ComputedRule(...computed), ...extraArgs);

function isParticipantLike(o) {
    return typeof o == "object" && o != null && "participantCode" in o;
}
function isSurveyLike(o) {
    return typeof o == "object" && o != null && "name" in o;
}
class User {
    constructor(x, y, z, t, u, phone, sampleCodes, participantCodes, kwargs) {
        this.name = "";
        this.firstName = "";
        this.title = "";
        if (isSurveyLike(x) && isParticipantLike(y)) {
            this.workflow = "participant";
            this.participantCodes = DomainCollection(y.participantCode);
            Object.assign(this, {
                userid: `${x.name}_${y.participantCode}`.toLocaleLowerCase(),
            });
            if (x instanceof Survey && y instanceof Participant) {
                const options = x.options;
                const emailItem = x.getItemForVariable(options === null || options === void 0 ? void 0 : options.emailVar);
                const phoneItem = x.getItemForVariable(options === null || options === void 0 ? void 0 : options.phoneVar);
                const [email, phone] = y.getValues(emailItem, phoneItem);
                this.email = email;
                this.phone = phone;
            }
        }
        else if (typeof t == "string") {
            this.name = x;
            this.firstName = y;
            this.title = z;
            this.workflow = t;
            this.email = u;
            this.phone = phone;
            this.sampleCodes = sampleCodes;
            this.participantCodes = participantCodes;
            Object.assign(this, kwargs);
        }
        else {
            this.workflow = x;
            this.email = (y !== null && y !== void 0 ? y : undefined);
            this.phone = (z !== null && z !== void 0 ? z : undefined);
            this.sampleCodes = t;
            this.participantCodes = u;
        }
        [this.role] = this.workflow.split(":");
        Object.freeze(this);
    }
    update(kwargs) {
        return Domain.update(this, kwargs, [
            User,
            this.name,
            this.firstName,
            this.title,
            this.workflow,
            this.email,
            this.phone,
            this.sampleCodes,
            this.participantCodes,
        ]);
    }
}

function isComputed(o) {
    if (typeof o != "object" || o == null)
        return false;
    const oo = o;
    return typeof oo.formula == "string";
}
function isCopy(o) {
    return !!(typeof o == "object" && o && "source" in o);
}

class PageItemBuilder {
    constructor(wording, variableName, type, section, config, builder, crossRulesBuilder) {
        this.wording = wording;
        this.variableName = variableName;
        this.section = section;
        this.config = config;
        this.builder = builder;
        this.crossRulesBuilder = crossRulesBuilder;
        this.rules = [];
        this.units = {
            values: [],
            isExtendable: false,
        };
        this.type = isamplemType(type) ? type : ItemTypes.create(type);
        this.array =
            wording != undefined &&
                (isMLstring(wording) ? isArray(wording) : wording.some(w => isArray(w)));
        function isArray(w) {
            var _a;
            return /^\s*(\+\+|->)/.test((_a = getTranslation(w)) !== null && _a !== void 0 ? _a : "");
        }
    }
    translate(lang, translation, ...contexts) {
        if (isContextual(this.wording)) {
            const t = [translation, ...contexts];
            for (const i in this.wording) {
                this.wording[i] = this.tr(this.wording[i], lang, t[i]);
            }
        }
        else
            this.wording = this.tr(this.wording, lang, translation);
        return this;
    }
    tr(w, lang, t) {
        return setTranslation(this.config.defaultLang)(w, lang, t);
    }
    question(x, y, z, t, ...o) {
        if (!this.builder)
            throw "builder is not fluent";
        return this.builder.question(x, y, z, t, ...o);
    }
    wordings(wording1, wording2, ...contexts) {
        this.wording = [wording1, wording2, ...contexts];
        return this;
    }
    comment(comment) {
        this.itemComment = comment;
        const p = new Proxy(this, {
            get: function (target, method, receiver) {
                if (method == "translate")
                    return translateComment.bind(target);
                return Reflect.get(target, method, receiver).bind(target);
            },
        });
        const translateComment = this.translateComment(p);
        return Object.create(p);
    }
    translateComment(p) {
        return function (lang, translation) {
            this.itemComment = setTranslation(this.config.defaultLang)(this.itemComment, lang, translation);
            return p;
        };
    }
    pin(title) {
        this.pinTitle = title;
        const p = new Proxy(this, {
            get: function (target, method, receiver) {
                if (method == "translate")
                    method = "translatePin";
                return Reflect.get(target, method, receiver).bind(target);
            },
        });
        return Object.create(p);
    }
    kpi(title, pivot) {
        this.kpiTitle = title;
        this.kpiPivot = pivot;
        const p = new Proxy(this, {
            get: function (target, method, receiver) {
                if (method == "translate")
                    method = "translateKpi";
                return Reflect.get(target, method, receiver).bind(target);
            },
        });
        return Object.create(p);
    }
    translateKpi(lang, translation) {
        this.kpiTitle = setTranslation(this.config.defaultLang)(this.kpiTitle, lang, translation);
        return this;
    }
    translatePin(lang, translation) {
        this.pinTitle = setTranslation(this.config.defaultLang)(this.pinTitle, lang, translation);
        return this;
    }
    info(wording, name) {
        wording = Array.isArray(wording) ? wording.join("\n\n") : wording;
        return this.question(wording, name, ItemTypes.info);
    }
    include(pageName, mode) {
        if (!this.builder)
            throw "builder is not fluent";
        return this.builder.include(pageName, mode);
    }
    startSection(title) {
        if (!this.builder)
            throw "builder is not fluent";
        return this.builder.startSection(title);
    }
    endSection() {
        if (!this.builder)
            throw "builder is not fluent";
        return this.builder.endSection();
    }
    unit(...units) {
        this.units.values.push(...units);
        return this;
    }
    extendable() {
        this.units.isExtendable = true;
        return this;
    }
    required(formula) {
        const enforced = isComputed(formula) ? formula.formula : formula;
        return typeof enforced == "string"
            ? this.dynamic([this.variableName], "required", [enforced])
            : this.rule("required");
    }
    critical(event, message, ...values) {
        return this.isComputed(event, values[0])
            ? this.dynamic([this.variableName], "critical", [
                isComputed(event) ? event : { formula: `'${event}'` },
                { formula: `'${message !== null && message !== void 0 ? message : event}'` },
                values[0],
            ])
            : this.rule("critical", event, message !== null && message !== void 0 ? message : event, ...values);
    }
    inRange(min, max, limits) {
        const theLimits = this.type.name === "integer" || this.type.name == "date"
            ? { includeLower: true, includeUpper: true }
            : limits;
        return this.isComputed(min, max)
            ? this.dynamic([this.variableName], "inRange", [min, max], theLimits)
            : this.rule("inRange", min, max, theLimits);
    }
    isComputed(...values) {
        return values.some(isComputed);
    }
    inPeriod(start, end) {
        return this.inRange(start, end);
    }
    activateWhen(variableName, ...values) {
        if (!this.crossRulesBuilder)
            throw "crossRulesBuilder is not fluent";
        this.crossRulesBuilder.activateWhen(this.variableName, variableName, ...values);
        return this;
    }
    visibleWhen(variableName, ...values) {
        if (!this.crossRulesBuilder)
            throw "crossRulesBuilder is not fluent";
        this.crossRulesBuilder.visibleWhen(this.variableName, variableName, ...values);
        return this;
    }
    modifiableWhen(variableName, ...values) {
        if (!this.crossRulesBuilder)
            throw "crossRulesBuilder is not fluent";
        this.crossRulesBuilder.modifiableWhen(this.variableName, variableName, ...values);
        return this;
    }
    computed(formula) {
        if (!this.crossRulesBuilder)
            throw "crossRulesBuilder is not fluent";
        const crossRule = this.crossRulesBuilder.computed(this.variableName, formula);
        if (crossRule.isUnitRule())
            this.rules.push(crossRule.getRule());
        return this;
    }
    memorize() {
        return this.computed(Macros.memorize(this.variableName));
    }
    maxLength(length) {
        return this.rule("maxLength", length);
    }
    decimalPrecision(precision) {
        return this.rule("decimalPrecision", precision);
    }
    fixedLength(length) {
        return this.rule("fixedLength", length);
    }
    letterCase(letterCase) {
        return this.rule("letterCase", letterCase);
    }
    dynamic(variableNames, underlyingRule, values, ...extraArgs) {
        if (!this.crossRulesBuilder)
            throw "crossRulesBuilder is not fluent";
        const crossRule = this.crossRulesBuilder.dynamic(variableNames, underlyingRule, values, ...extraArgs);
        if (crossRule.isUnitRule())
            this.rules.push(crossRule.getRule());
        return this;
    }
    rule(x, ...args) {
        this.rules.push(typeof x == "string" ? Rules.create(x, ...args) : Rules.create(x));
        return this;
    }
    defaultValue(defaultValue) {
        if (isCopy(defaultValue)) {
            if (!this.crossRulesBuilder)
                throw "crossRulesBuilder is not fluent";
            this.crossRulesBuilder
                .copy(this.variableName, defaultValue.source)
                .trigger("initialization");
        }
        else if (isComputed(defaultValue)) {
            if (!this.crossRulesBuilder)
                throw "crossRulesBuilder is not fluent";
            this.crossRulesBuilder
                .computed(this.variableName, defaultValue.formula)
                .trigger("initialization");
        }
        else
            this.default = defaultValue;
        return this;
    }
    build(pageItems) {
        if (!this.built)
            this.built = new PageItem(this.wording, this.variableName, this.type, {
                units: this.units,
                section: this.section,
                rules: DomainCollection(...this.rules),
                comment: this.itemComment,
                pin: this.pinTitle,
                kpi: this.buildKpi(pageItems),
                defaultValue: this.default == undefined
                    ? undefined
                    : new ConstantRule(this.default),
                array: this.array,
            });
        return this.built;
    }
    buildKpi(pageItems) {
        if (typeof this.kpiTitle == "undefined")
            return undefined;
        if (typeof this.kpiPivot != "undefined")
            return this.buildPivotKpi(pageItems, this.kpiTitle);
        return this.kpiTitle;
    }
    buildPivotKpi(pageItems, title) {
        const pivot = this.getPivotItem(pageItems);
        if (typeof pivot == "undefined")
            throw `pivot variable ${this.kpiPivot} does not exist in same page`;
        return { title, pivot };
    }
    getPivotItem(pageItems) {
        const pivot = pageItems.find(p => p.variableName == this.kpiPivot);
        if (pivot instanceof PageItem)
            return pivot;
        return pivot === null || pivot === void 0 ? void 0 : pivot.build([]);
    }
}

class LibraryBuilder {
    constructor(pageName, mode, options, builder, ruleBuilder) {
        this.pageName = pageName;
        this.mode = mode;
        this.options = options;
        this.builder = builder;
        this.ruleBuilder = ruleBuilder;
    }
    build(pages) {
        const page = this.getIncludedPage(pages);
        const pageItems = this.getSelectedItems(page);
        const contexts = this.getContexts(page);
        this.setActivationRule(pageItems !== null && pageItems !== void 0 ? pageItems : page.items);
        if (pageItems && !contexts)
            return new Library(page, DomainCollection(...pageItems));
        if (contexts)
            return new Library(page, pageItems ? DomainCollection(...pageItems) : undefined, DomainCollection(...contexts));
        return new Library(page);
    }
    setActivationRule(items) {
        if (typeof this._libraryActivation != "undefined") {
            if (typeof this.ruleBuilder == "undefined")
                throw "builder is not fluent";
            const [action, ...args] = this._libraryActivation;
            items === null || items === void 0 ? void 0 : items.forEach(i => {
                action.call(this.ruleBuilder, getItem(i).variableName, ...args);
            });
        }
    }
    getIncludedPage(pages) {
        const page = pages.find(p => getTranslation(p.name, "__code__", this.options.defaultLang) ==
            this.pageName);
        if (!page)
            throw `uknown page ${page}`;
        return page;
    }
    getFolloUpItems(page) {
        const items = page.items.map(getItem);
        return items.filter(i => items.findIndex(t => t.variableName == `__${i.variableName}`) > -1);
    }
    getSelectedItems(page) {
        var _a, _b;
        if (this.mode && "initial" in this.mode)
            return this.getFolloUpItems(page);
        if (page.items.length == ((_a = this.variableNames) === null || _a === void 0 ? void 0 : _a.length))
            return undefined;
        return (_b = this.variableNames) === null || _b === void 0 ? void 0 : _b.map(v => page.items.map(getItem).find(i => v == i.variableName));
    }
    getContexts(page) {
        var _a;
        if (this.mode && "followUp" in this.mode)
            return this.getFolloUpItems(page).map(i => ({ pageItem: i, context: 1 }));
        return (_a = this.contexts) === null || _a === void 0 ? void 0 : _a.map(c => {
            const pageItem = page === null || page === void 0 ? void 0 : page.items.map(getItem).find(i => c[0] == i.variableName);
            return { pageItem, context: c[1] };
        });
    }
    include(pageName, mode) {
        if (!this.builder)
            throw "builder is not fluent";
        return this.builder.include(pageName, mode);
    }
    select(...variableNames) {
        this.variableNames = variableNames;
        return this;
    }
    context(variableName, ctx) {
        if (!this.contexts)
            this.contexts = [];
        this.contexts.push([variableName, ctx]);
        return this;
    }
    activateWhen(variableName, ...values) {
        if (typeof this.ruleBuilder == "undefined")
            throw "builder is not fluent";
        this._libraryActivation = [
            this.ruleBuilder.activateWhen,
            variableName,
            ...values,
        ];
        return this;
    }
    visibleWhen(variableName, ...values) {
        if (typeof this.ruleBuilder == "undefined")
            throw "builder is not fluent";
        this._libraryActivation = [
            this.ruleBuilder.visibleWhen,
            variableName,
            ...values,
        ];
        return this;
    }
    modifiableWhen(variableName, ...values) {
        if (typeof this.ruleBuilder == "undefined")
            throw "builder is not fluent";
        this._libraryActivation = [
            this.ruleBuilder.modifiableWhen,
            variableName,
            ...values,
        ];
        return this;
    }
    startSection(title) {
        if (!this.builder)
            throw "builder is not fluent";
        return this.builder.startSection(title);
    }
    endSection() {
        if (!this.builder)
            throw "builder is not fluent";
        return this.builder.endSection();
    }
    question(x, y, z, t, ...o) {
        if (!this.builder)
            throw "builder is not fluent";
        if (t && "followUp" in t)
            return this.builder.question(x, y, z, t);
        const types = (typeof y == "string" ? [] : [y]).concat(z ? [z] : [], t ? [t] : [], ...o);
        if (typeof y == "string") {
            const [h, ...t] = types;
            return this.builder.question(x, y, h, ...t);
        }
        return this.builder.question(x, y, ...types);
    }
    info(wording, name) {
        if (!this.builder)
            throw "builder is not fluent";
        wording = Array.isArray(wording) ? wording.join("\n\n") : wording;
        return this.builder.info(wording, name);
    }
}

class PageBuilder {
    constructor(name, config, builder, crossRulesBuilder) {
        this.name = name;
        this.config = config;
        this.builder = builder;
        this.crossRulesBuilder = crossRulesBuilder;
        this.includes = [];
        this.cycle = false;
    }
    get items() {
        return this.includes.filter(q => q instanceof PageItemBuilder);
    }
    translate(lang, translation) {
        this.name = setTranslation(lang == this.config.defaultLang ? "__code__" : this.config.defaultLang)(this.name, lang, translation);
        return this;
    }
    include(pageName, mode) {
        const builder = new LibraryBuilder(pageName, mode, this.config, this, this.builder);
        this.includes.push(builder);
        return builder;
    }
    startSection(title) {
        var _a;
        this.currentSection = title !== null && title !== void 0 ? title : (_a = this.builder) === null || _a === void 0 ? void 0 : _a.emptySection();
        const p = new Proxy(this, {
            get: function (target, method, receiver) {
                if (method == "translate")
                    return translateSection.bind(target);
                return Reflect.get(target, method, receiver).bind(target);
            },
        });
        const translateSection = this.translateSection(p);
        return Object.create(p);
    }
    translateSection(p) {
        return function (lang, translation) {
            this.currentSection = setTranslation(this.config.defaultLang)(this.currentSection, lang, translation);
            return p;
        };
    }
    activateWhen(variableName, ...values) {
        this._sectionActivation = ["enable", variableName, ...values];
        return this;
    }
    visibleWhen(variableName, ...values) {
        this._sectionActivation = ["show", variableName, ...values];
        return this;
    }
    modifiableWhen(variableName, ...values) {
        this._sectionActivation = ["modifiable", variableName, ...values];
        return this;
    }
    endSection() {
        this.currentSection = undefined;
        this._sectionActivation = undefined;
        return this;
    }
    question(x, y, z, t, ...o) {
        const wording = x;
        const variableName = typeof y == "string" ? y : x;
        const types = (typeof y == "string" ? [] : [y]).concat(z ? [z] : [], t ? [t] : [], ...o);
        const pageitemBuilder = new PageItemBuilder(wording, variableName, types.length == 1 ? types[0] : ItemTypes.context(types), this.currentSection, this.config, this, this.crossRulesBuilder);
        this.addPageItem(pageitemBuilder);
        this.activation(pageitemBuilder);
        return pageitemBuilder;
    }
    addPageItem(pageitemBuilder) {
        const ix = this.includes.findIndex(i => i.variableName == pageitemBuilder.variableName);
        if (ix == -1)
            this.includes.push(pageitemBuilder);
        else
            this.includes[ix] = pageitemBuilder;
    }
    activation(pageitemBuilder) {
        if (this._sectionActivation) {
            const [behavior, ...args] = this._sectionActivation;
            (behavior == "enable"
                ? PageItemBuilder.prototype.activateWhen
                : behavior == "show"
                    ? PageItemBuilder.prototype.visibleWhen
                    : PageItemBuilder.prototype.modifiableWhen).call(pageitemBuilder, ...args);
        }
    }
    info(wording, name) {
        wording = Array.isArray(wording) ? wording.join("\n\n") : wording;
        return this.question(wording, name, ItemTypes.info);
    }
    exportTo(conf) {
        this.exportConfig = typeof conf == "string" ? { fileName: conf } : conf;
        return this;
    }
    build(builders) {
        if (this.built)
            return this.built;
        this.built = this.detectCycle(() => this.resolveAndBuild(builders));
        return this.built;
    }
    detectCycle(fn) {
        if (this.cycle)
            throw `inclusion cycle detected in ${this.name}`;
        this.cycle = true;
        const built = fn();
        this.cycle = false;
        return built;
    }
    resolveAndBuild(builders) {
        const includes = this.includes.reduce(this.resolve(builders), []);
        return new Page(this.name, Object.assign({ includes: DomainCollection(...includes) }, (this.exportConfig ? { exportConfig: this.exportConfig } : {})));
    }
    resolve(builders) {
        return (result, q) => {
            if (q instanceof PageItemBuilder)
                result.push(q.build(this.items));
            else {
                const page = this.getIncludes(builders, q);
                result.push(q.build([page]));
            }
            return result;
        };
    }
    getIncludes(builders, q) {
        var _a;
        const notFound = (n) => {
            throw `page ${n} not found`;
        };
        const builder = (_a = builders.find(b => getTranslation(b.name, "__code__", this.config.defaultLang) ==
            q.pageName)) !== null && _a !== void 0 ? _a : notFound(q.pageName);
        return builder.build(builders);
    }
}

class PageSetBuilder {
    constructor(type, config, builder) {
        this.type = type;
        this.config = config;
        this.builder = builder;
        this.pageDefs = [];
    }
    get pageNames() {
        return this.pageDefs.map(p => p.name);
    }
    get mandatoryPageNames() {
        return this.pageDefs.filter(p => p.mandatory).map(p => p.name);
    }
    pageSet(type) {
        if (!this.builder)
            throw "builder is not fluent";
        return this.builder.pageSet(type);
    }
    translate(lang, translation) {
        this.type = setTranslation(lang == this.config.defaultLang ? "__code__" : this.config.defaultLang)(this.type, lang, translation);
        return this;
    }
    pages(...pageDefs) {
        this.pageDefs.push(...pageDefs.map(p => (typeof p == "string" ? { name: p } : p)));
        return this;
    }
    datevariable(datevariable) {
        this.datevar = datevariable;
        return this;
    }
    build(pages) {
        const currentPages = this.pageDefs.map(p => {
            return {
                page: this.mapPage(pages, p.name),
                mandatory: !!p.mandatory,
            };
        });
        return new PageSet(this.type, {
            pages: DomainCollection(...currentPages.map(p => p.page)),
            datevar: this.datevar,
            mandatoryPages: DomainCollection(...currentPages.filter(p => p.mandatory).map(p => p.page)),
        });
    }
    mapPage(pages, n) {
        var _a;
        return (_a = pages.find(p => this.samePage(p, n))) !== null && _a !== void 0 ? _a : this.notFound(n);
    }
    samePage(p, n) {
        return getTranslation(p.name, "__code__", this.config.defaultLang) == n;
    }
    notFound(n) {
        throw `page ${n} not found`;
    }
}

function validate(root, messages) {
    const page1 = validateDatePagesExist(root, messages);
    if (page1.length > 0) {
        validatePageSetsHaveDate(root, page1, messages);
    }
}
function validateDatePagesExist(root, messages) {
    const page1 = root.pages.filter(p => p.includes.find(q => (Array.isArray(q) ? q[0] : q).variableName == root.config.interviewDateVar));
    if (page1.length == 0) {
        messages.push(`question with pageSet date variable '${root.config.interviewDateVar}' is missing`);
    }
    return page1;
}
function validatePageSetsHaveDate(root, page1, messages) {
    const errors = root.pageSets
        .filter(v => v.pageNames.length == 0 ||
        !page1.find(p => getTranslation(p.name, "__code__", root.config.defaultLang) ==
            v.pageNames[0]))
        .map(v => `pageSet '${getTranslation(v.type, "__code__", root.config.defaultLang)}' must have first page with pageSet date`);
    messages.push(...errors);
}

class WorkflowBuilder {
    constructor(name, config, main, builder) {
        this.name = name;
        this.config = config;
        this.main = main;
        this.builder = builder;
        this._infoType = [];
        this.singleTypes = [];
        this.manyTypes = [];
        this.sequenceTypes = [];
        this.stopTypes = [];
        this.signedTypes = [];
        this.notifications = [];
        this.pageSetTypes = [];
    }
    get infoType() {
        return this._infoType[0];
    }
    home(name) {
        if (this._infoType.length)
            this._infoType[0] = name;
        else
            this._infoType.push(name);
        return this;
    }
    auxiliary(...names) {
        return this.n(...names);
    }
    initial(...names) {
        return this.seq(...names);
    }
    followUp(...names) {
        this.seq(...names);
        this.n(...names);
        return this;
    }
    terminal(...names) {
        return this.end(...names);
    }
    end(...names) {
        this.stopTypes.push(...names);
        return this;
    }
    one(...names) {
        this.singleTypes.push(...names);
        return this;
    }
    n(...names) {
        this.manyTypes.push(...names);
        return this;
    }
    seq(...names) {
        this.sequenceTypes.push(...names);
        return this;
    }
    notify(...events) {
        this.notifications.push(...events);
        return this;
    }
    signOn(...types) {
        this.signedTypes.push(...types);
        return this;
    }
    withPageSets(...types) {
        if (!this.main)
            throw "main workflow is missing";
        if (this.main._infoType.length && types.includes(this.main._infoType[0]))
            this.home(this.main._infoType[0]);
        this.n(...this.main.manyTypes.filter(n => types.includes(n)));
        this.seq(...this.main.sequenceTypes.filter(n => types.includes(n)));
        this.terminal(...this.main.stopTypes.filter(n => types.includes(n)));
        this.signOn(...this.main.signedTypes.filter(n => types.includes(n)));
        this.pageSetTypes.push(...types);
        return this;
    }
    build(pageSets) {
        var _a;
        if (this.built)
            return this.built;
        const keepPageSets = this.keep(pageSets);
        const { info, single, many, startsWith, endsWith } = this.getParts(keepPageSets);
        const main = (_a = this.main) === null || _a === void 0 ? void 0 : _a.build(pageSets);
        this.built = new Workflow(Object.assign(Object.assign({ name: this.name, info, single: DomainCollection(...single), many: DomainCollection(...many), sequence: DomainCollection(...startsWith), stop: DomainCollection(...endsWith) }, (this.main ? { main } : {})), { notifications: DomainCollection(...this.notifications) }));
        return this.built;
    }
    getParts({ keep, ref }) {
        const startsWith = this.buildSequence(keep, ref.sequenceTypes);
        const info = this.buildSequence(keep, ref._infoType)[0];
        const endsWith = this.buildSequence(keep, ref.stopTypes);
        const many = this.buildSequence(keep, ref.manyTypes);
        const single = this.singleTypes.length > 0
            ? this.buildSequence(keep, ref.singleTypes)
            : keep.filter(p => !many.includes(p) && p != info);
        return { info, single, many, startsWith, endsWith };
    }
    keep(pageSets) {
        if (this.name == "main")
            return { keep: pageSets, ref: this };
        if (this.pageSetTypes.length == 0)
            this.pageSetTypes = [
                ...this._infoType,
                ...this.singleTypes,
                ...this.manyTypes,
            ];
        if (this.pageSetTypes.length == 0)
            return { keep: pageSets, ref: this.main };
        return { keep: this.buildSequence(pageSets, this.pageSetTypes), ref: this };
    }
    buildSequence(pageSets, names) {
        return names
            .map(n => this.findPageSet(pageSets, n))
            .sort()
            .map(i => pageSets[i]);
    }
    findPageSet(pageSets, n) {
        const index = pageSets.findIndex(p => this.samePageSet(p, n));
        if (index == -1)
            this.notFound(n);
        return index;
    }
    notFound(t) {
        throw `page set ${t} not found`;
    }
    samePageSet(p, t) {
        return getTranslation(p.type, "__code__", this.config.defaultLang) == t;
    }
    copy(names) {
        return names.map(n => {
            const b = Object.create(WorkflowBuilder.prototype);
            Object.assign(b, Object.assign(Object.assign({}, this), { name: n }));
            return b;
        });
    }
}

class CrossRuleBuilder {
    constructor(variableNames, _rule, builder, strict = false) {
        this.variableNames = variableNames;
        this._rule = _rule;
        this.builder = builder;
        this.strict = strict;
        this.when = "always";
        this.name =
            _rule instanceof DynamicRule ? _rule.underlyingRule : _rule.name;
        this.precedence = _rule.precedence;
        this.args = getRuleArgs(_rule);
    }
    isUnitRule() {
        return this.variableNames.length == 1;
    }
    getRule() {
        return this._rule;
    }
    get target() {
        return this.variableNames[this.variableNames.length - 1];
    }
    trigger(when) {
        this.when = when;
        return this;
    }
    activateWhen(target, activator, ...values) {
        if (!this.builder)
            throw "builder is not fluent";
        return this.builder.activateWhen(target, activator, ...values);
    }
    visibleWhen(target, activator, ...values) {
        if (!this.builder)
            throw "builder is not fluent";
        return this.builder.visibleWhen(target, activator, ...values);
    }
    modifiableWhen(target, activator, ...values) {
        if (!this.builder)
            throw "builder is not fluent";
        return this.builder.activateWhen(target, activator, ...values);
    }
    computed(target, formula) {
        if (!this.builder)
            throw "builder is not fluent";
        return this.builder.computed(target, formula);
    }
    copy(target, source) {
        if (!this.builder)
            throw "builder is not fluent";
        return this.builder.copy(target, source);
    }
    dynamic(variableNames, rule, values, ...extra) {
        if (!this.builder)
            throw "builder is not fluent";
        return this.builder.dynamic(variableNames, rule, values, ...extra);
    }
    rule(variableNames, x, ...args) {
        if (!this.builder)
            throw "builder is not fluent";
        return typeof x == "string"
            ? this.builder.rule(variableNames, x, ...args)
            : this.builder.rule(variableNames, x);
    }
    build(pageItems) {
        const rule = link({ variableNames: this.variableNames, rule: this._rule }, [...pageItems, ...globalItems], this.when);
        if (this.strict)
            this.assertStrict(rule, pageItems);
        return rule;
    }
    assertStrict(rule, pageItems) {
        const indexes = rule.pageItems.map(i => {
            const pageItem = getScopedItem(i);
            return [pageItems.indexOf(pageItem), pageItem.variableName];
        });
        const last = indexes[indexes.length - 1];
        for (let i = 0; i < indexes.length - 1; i++) {
            if (indexes[i][0] > last[0])
                throw `Variable ${indexes[i][1]} used in ${last[1]} must be declared before`;
        }
    }
}

class SurveyBuilder {
    constructor() {
        this.name = "";
        this.workflows = [];
        this.pageSets = [];
        this.pages = [];
        this.config = new SurveyOptions();
        this.includeLower = limits.includeLower;
        this.includeUpper = limits.includeUpper;
        this.includeLimits = limits.includeBoth;
        this.includeBoth = limits.includeBoth;
        this.types = Object.assign(Object.assign({}, ItemTypes), { choice: (multiplicity, ...choices) => {
                var _a;
                return ItemTypes.choice(multiplicity, ...choices).lang((_a = this.config.defaultLang) !== null && _a !== void 0 ? _a : "en");
            }, glossary: (multiplicity, ...choices) => {
                var _a;
                return ItemTypes.glossary(multiplicity, ...choices).lang((_a = this.config.defaultLang) !== null && _a !== void 0 ? _a : "en");
            }, countries: (multiplicity) => { var _a; return ItemTypes.countries(multiplicity).lang((_a = this.config.defaultLang) !== null && _a !== void 0 ? _a : "en"); }, scale: (min, max) => { var _a; return ItemTypes.scale(min, max).lang((_a = this.config.defaultLang) !== null && _a !== void 0 ? _a : "en"); }, score: (...scores) => { var _a; return ItemTypes.score(...scores).lang((_a = this.config.defaultLang) !== null && _a !== void 0 ? _a : "en"); } });
        this.crossRules = [];
        this.emptySectionTitle = "";
        this.isStrict = false;
        this._currentRule = -1;
        this.get = this.build;
        this.pageId = 1;
    }
    options(options) {
        this.config = Object.assign(Object.assign(Object.assign({}, this.config), options), { inclusionVar: this.buildHideable(options, "inclusionVar") });
    }
    strict() {
        this.isStrict = true;
    }
    buildHideable(options, s) {
        return Object.assign(Object.assign({}, this.normalizeHideable(this.config[s])), this.normalizeHideable(options[s]));
    }
    normalizeHideable(hideable) {
        return typeof hideable == "string" ? { name: hideable } : hideable;
    }
    survey(name) {
        this.name = name;
        return this;
    }
    pageSet(type) {
        const pageSetBuilder = new PageSetBuilder(type, this.config, this);
        this.pageSets.push(pageSetBuilder);
        return pageSetBuilder;
    }
    page(name) {
        const pageBuilder = new PageBuilder(name, this.config, this, this);
        this.pages.push(pageBuilder);
        return pageBuilder;
    }
    workflow(w = "main", ...names) {
        const name = typeof w == "string" ? w : w.name;
        const workflowBuilder = new WorkflowBuilder(name, this.config, this.mainWorkflow, this);
        if (name == "main") {
            this.mainWorkflow = workflowBuilder;
        }
        this.workflows.push(workflowBuilder);
        this.workflows.push(...workflowBuilder.copy(names));
        return workflowBuilder;
    }
    activateWhen(target, activator, ...values) {
        return this.doWhen("enable", target, activator, ...values);
    }
    visibleWhen(target, activator, ...values) {
        return this.doWhen("show", target, activator, ...values);
    }
    doWhen(behavior, target, activator, ...values) {
        if (values.length == 0)
            return this.doWhen(behavior, target, "@ACK", this.computed(activator));
        const ix = this.getCrossRuleBuilderIndex("activation", target);
        if (ix > -1) {
            const [prevActivator, ...prevValues] = this.crossRules[ix]._memo;
            const prevFormula = this.activationFormula(prevActivator, prevValues);
            const formula = this.activationFormula(activator, values);
            return this.reallyDoWhen(behavior, target, "@ACK", this.computed(`(${prevFormula}) && (${formula})`));
        }
        return this.reallyDoWhen(behavior, target, activator, ...values);
    }
    activationFormula(activator, values) {
        return values
            .map(v => {
            const value = isComputed(v) ? v.formula : v;
            return activator != "@ACK"
                ? value !== true
                    ? `${activator}==${typeof value == "string" ? `'${value}'` : value}`
                    : activator
                : value;
        })
            .join(" || ");
    }
    reallyDoWhen(behavior, target, activator, ...values) {
        const crossRuleBuilder = values.some(isComputed)
            ? this.dynamic([activator, target], "activation", [values], behavior)
            : this.rule([activator, target], "activation", values, behavior);
        Object.assign(crossRuleBuilder, { _memo: [activator, ...values] });
        return crossRuleBuilder;
    }
    modifiableWhen(target, variableName, ...values) {
        if (values.length == 0)
            return this.computed(target, `${variableName}?${target}:$${target}`);
        else {
            const [v] = values;
            const f = typeof v == "object" && v && "formula" in v
                ? v.formula
                : JSON.stringify(values[0]);
            return this.modifiableWhen(target, `${variableName}==${f}`);
        }
    }
    computed(x, y) {
        if (typeof x == "string" && typeof y == "undefined")
            return { formula: x };
        else if (typeof x == "string") {
            const { variableNames, formula } = ComputedParser.parse(x, y);
            return this.rule(variableNames, "computed", formula, variableNames.length);
        }
        return this.rule(x, "computed", y, x.length);
    }
    copy(x, y) {
        if (typeof y == "undefined")
            return { source: x };
        return this.rule([y, x], "copy");
    }
    date(iso) {
        return this.computed(`#${iso}#`);
    }
    dynamic(variableNames, underlyingRule, values, ...extraArgs) {
        const { variableNames: parameterNames, formula } = ComputedParser.parse(undefined, this.dynamicFormula(values));
        const computedNames = [...parameterNames, ...variableNames].filter((v, x, arr) => arr.indexOf(v) == x);
        return this.rule(computedNames, "dynamic", underlyingRule, [formula, parameterNames.length], ...extraArgs);
    }
    rule(variableNames, x, ...args) {
        const crossRuleBuilder = new CrossRuleBuilder(variableNames, typeof x == "string" ? Rules.create(x, ...args) : Rules.create(x), this, this.isStrict);
        return crossRuleBuilder.isUnitRule()
            ? crossRuleBuilder
            : this.addCrossRuleBuilder(crossRuleBuilder);
    }
    addCrossRuleBuilder(crossRuleBuilder) {
        const ix = this.getCrossRuleBuilderIndex(crossRuleBuilder.name, crossRuleBuilder.target);
        if (ix == -1)
            this.crossRules.push(crossRuleBuilder);
        else
            this.crossRules[ix] = crossRuleBuilder;
        this._currentRule = ix;
        return crossRuleBuilder;
    }
    getCrossRuleBuilderIndex(name, target) {
        return this.crossRules.findIndex(r => r.name == name && r.target == target);
    }
    trigger(when) {
        var _a;
        (_a = this.crossRules[this._currentRule]) === null || _a === void 0 ? void 0 : _a.trigger(when);
        return this;
    }
    dynamicFormula(values) {
        return `[${values.map(v => isComputed(v)
            ? v.formula
            : Array.isArray(v)
                ? this.dynamicFormula(v)
                : v instanceof Date
                    ? this.date(v.toLocaleDateString("sv")).formula
                    : v)}]`;
    }
    build() {
        const pages = this.pages.map(b => b.build(this.pages));
        const pageSets = this.pageSets.map(b => b.build(pages));
        const workflows = this.workflows.map(b => b.build(pageSets));
        const crossRules = this.buildCrossRules(pages);
        return new Survey(this.name, {
            options: this.config,
            pages: DomainCollection(...pages),
            pageSets: DomainCollection(...pageSets),
            workflows: DomainCollection(...workflows),
            crossRules: DomainCollection(...crossRules),
        });
    }
    buildCrossRules(pages) {
        const items = pages.reduce((q, p) => q.concat(...p.includes.filter((i) => i instanceof PageItem)), []);
        return this.crossRules.map(b => b.build(items));
    }
    validate() {
        const messages = [];
        validate(this, messages);
        return messages;
    }
    mandatory(page) {
        return typeof page == "string"
            ? { name: page, mandatory: true }
            : Object.assign(Object.assign({}, page), { mandatory: true });
    }
    compose(name, includes) {
        var _a;
        const code = `Page${this.pageId++}`;
        const p = this.page(code).translate((_a = this.config.defaultLang) !== null && _a !== void 0 ? _a : "en", name);
        includes.forEach(i => {
            p.include(i);
        });
        return { name: code };
    }
    alias(to, from) {
        var _a;
        const code = `Page${this.pageId++}`;
        this.page(code)
            .exportTo(to)
            .translate((_a = this.config.defaultLang) !== null && _a !== void 0 ? _a : "en", to)
            .include(from);
        return { name: code };
    }
    emptySection() {
        this.emptySectionTitle += " ";
        return this.emptySectionTitle;
    }
    question(wording, variableName, type, section) {
        return new PageItemBuilder(wording, variableName, type, section, this.config, undefined, this);
    }
}
const builder = () => new SurveyBuilder();

const undefinedTag = {};
Object.freeze(undefinedTag);
class InterviewItemBuilder {
    constructor(survey, x, builder) {
        this.survey = survey;
        this.builder = builder;
        this._messages = {};
        if (x instanceof InterviewItem) {
            this._item = x;
            this._pageItem = x.pageItem;
        }
        else
            this._pageItem = x;
    }
    get variableName() {
        return this._pageItem.variableName;
    }
    get instance() {
        return this._pageItem.instance;
    }
    value(v) {
        if (v === undefinedTag)
            this._value = undefinedTag;
        else if (this._pageItem.type instanceof DateType &&
            !this._pageItem.type.incomplete &&
            typeof v !== "undefined")
            this._value = new Date(v);
        else
            this._value = v !== null && v !== void 0 ? v : undefinedTag;
        return this;
    }
    unit(u) {
        this._unit = u || undefinedTag;
        return this;
    }
    specialValue(s) {
        this._specialValue = s || undefinedTag;
        return this;
    }
    messages(msgs) {
        this._messages = Object.assign(Object.assign({}, this._messages), msgs);
        return this;
    }
    acknowledge(...ruleNames) {
        this._messages = acknowledge(this._messages, ...ruleNames);
        return this;
    }
    context(c) {
        this._context = c;
        return this;
    }
    item(item, instance) {
        if (!this.builder)
            throw "builder is not fluent";
        return typeof item == "string"
            ? this.builder.item(item, instance)
            : this.builder.item(item);
    }
    build() {
        var _a;
        const kwargs = Object.assign({}, this._context ? { context: this._context } : {}, this._unit ? { unit: this._unit } : {}, this._specialValue
            ? {
                specialValue: this._specialValue == undefinedTag
                    ? undefined
                    : this._specialValue,
            }
            : {}, this._unit
            ? {
                unit: this._unit == undefinedTag ? undefined : this._unit,
            }
            : {}, Object.keys(this._messages).length ? { messages: this._messages } : {});
        const value = this._value == undefinedTag ? undefined : this._value;
        if (!this._item)
            this._item = new InterviewItem(this._pageItem, value, Object.assign({}, kwargs));
        else {
            this._item = (_a = this._item) === null || _a === void 0 ? void 0 : _a.update(Object.assign(Object.assign({}, (typeof this._value != "undefined" ? { value } : {})), kwargs));
        }
        return this._item;
    }
}

class InterviewBuilder {
    constructor(survey, i) {
        this.survey = survey;
        this.interviewItems = [];
        this.nonce = 0;
        this.lastInput = new Date();
        if (i instanceof PageSet)
            this.pageSet = i;
        else {
            this.interview = i;
            this.pageSet = i.pageSet;
        }
    }
    init(nonce, lastInput) {
        this.nonce = nonce;
        this.lastInput = lastInput;
        return this;
    }
    item(item, instance) {
        if (item instanceof InterviewItem) {
            this.interviewItems.push(item);
            return this;
        }
        const itemBuilder = this.getItemBuilder(item, instance);
        this.addInterviewItem(itemBuilder);
        return itemBuilder;
    }
    addInterviewItem(itemBuilder) {
        const ix = this.interviewItems.findIndex(i => i instanceof InterviewItemBuilder &&
            i.variableName == itemBuilder.variableName &&
            i.instance == itemBuilder.instance);
        if (ix == -1)
            this.interviewItems.push(itemBuilder);
        else
            this.interviewItems[ix] = itemBuilder;
    }
    getItemBuilder(x, instance) {
        var _a;
        const { context, pageItem } = this.pageItem(x, instance);
        const item = (_a = this.interview) === null || _a === void 0 ? void 0 : _a.getItemForVariable(pageItem);
        const itemBuilder = new InterviewItemBuilder(this.survey, item !== null && item !== void 0 ? item : pageItem, this).context(context);
        if (typeof x == "object") {
            this.make(x, itemBuilder);
        }
        return itemBuilder;
    }
    make(x, itemBuilder) {
        if ("value" in x)
            itemBuilder.value(x.value);
        if ("unit" in x)
            itemBuilder.unit(x.unit);
        if ("specialValue" in x)
            itemBuilder.specialValue(x.specialValue);
        if ("messages" in x && x.messages)
            itemBuilder.messages(x.messages);
        if ("context" in x && x.context)
            itemBuilder.context(x.context);
    }
    pageItem(x, instance) {
        if (x instanceof PageItem)
            return { context: 0, pageItem: x };
        if (typeof x == "string")
            return this.getPageItemForVariable(x, instance);
        return hasContext(x.pageItem)
            ? x.pageItem
            : { context: 0, pageItem: x.pageItem };
    }
    items(items) {
        for (const item of items) {
            const { context, pageItem } = this.getPageItemForVariable(item.variableName, item.instance);
            const itemBuilder = new InterviewItemBuilder(this.survey, pageItem, this).context(context);
            this.make(item, itemBuilder);
            this.interviewItems.push(itemBuilder);
        }
        return this;
    }
    getPageItemForVariable(variableName, instance) {
        const item = this.pageSet.getItemForVariable(variableName);
        if (!item)
            throw `unknown variable ${variableName}`;
        const pageItem = PageItem.getInstance(getItem(item), instance !== null && instance !== void 0 ? instance : 1);
        return { context: hasContext(item) ? item.context : 0, pageItem };
    }
    build(outer) {
        const items = this.interviewItems.map(i => i instanceof InterviewItem ? i : i.build());
        if (typeof this.interview == "undefined" && !this.nonce)
            this.interview = this.initializeNew(items, outer);
        else if (typeof this.interview == "undefined")
            this.interview = this.rebuildExisting(items);
        else
            this.interview = this.updateExisting(items, outer);
        return this.interview;
    }
    initializeNew(items, outer) {
        const initialized = this.initialize(items, outer);
        return new Interview(this.pageSet, this.survey.options, {
            items: DomainCollection(...initialized),
            lastInput: this.lastInput,
        });
    }
    rebuildExisting(items) {
        return new Interview(this.pageSet, this.survey.options, {
            items: DomainCollection(...items),
            nonce: this.nonce,
            lastInput: this.lastInput,
        });
    }
    updateExisting(items, outer) {
        const synchronized = this.synchronize(items, outer);
        const updated = InterviewBuilder.update(this.interview, DomainCollection(...synchronized), this.lastInput);
        return updated.nonce == 0 && this.nonce
            ? updated.update({ nonce: this.nonce })
            : updated;
    }
    initialize(items, outer) {
        const uninitialized = this.pageSet.items.map(i => new InterviewItem(getItem(i), undefined, {
            context: getItemContext(i),
        }));
        const scope = this.getScope(uninitialized, items, outer);
        return execute(this.survey.rules, scope, ["initialization", "always"]).items;
    }
    synchronize(items, outer) {
        const initialized = this.interview.items;
        const scope = this.getScope(initialized, items, outer);
        return execute(this.survey.rules, scope, ["always"]).items;
    }
    getScope(initialized, items, outer) {
        const outerScope = { lastInput: this.lastInput, interviews: outer };
        const localScope = { items: initialized };
        return Scope.create(outerScope, localScope).with(items);
    }
    static update(current, items, lastInput) {
        const mergedItems = merge(current.items, items)
            .on((a1, a2) => a1.pageItem == a2.pageItem)
            .insert(m => m.map(a => new InterviewItem(a.pageItem, a.value, Object.assign({}, a))));
        return mergedItems == current.items
            ? current
            : current.update({
                items: mergedItems,
                lastInput,
            });
    }
}

class ParticipantBuilder {
    constructor(survey, p, sample) {
        this.survey = survey;
        this.sample = sample;
        this.interviews = [];
        this.participantCode = "";
        if (typeof p == "string")
            this.participantCode = p;
        else if (p instanceof Participant)
            this.participant = p;
        else
            this.samples = p;
    }
    init(participantCode, sampleCode) {
        var _a;
        this.sample = (_a = this.samples) === null || _a === void 0 ? void 0 : _a.find(s => s.sampleCode == sampleCode);
        if (this.sample == undefined)
            throw `unknown sample ${sampleCode}`;
        this.participantCode = participantCode;
        return this;
    }
    interview(i, nonce, lastInput) {
        var _a;
        if (i instanceof Interview) {
            this.interviews.push(i);
            return this;
        }
        else if (!(i instanceof PageSet)) {
            const lang = this.survey.options.defaultLang;
            const typeName = getTranslation(i, "__code__", lang);
            const pageSet = this.survey.pageSets.find(p => getTranslation(p.type, "__code__", lang) == typeName);
            if (!pageSet)
                throw `unknown pageSet ${getTranslation(i, typeName)}`;
            i = pageSet;
        }
        const interview = (_a = this.participant) === null || _a === void 0 ? void 0 : _a.interviews.find(w => w.pageSet == i && w.nonce == nonce);
        const builder = interview
            ? new InterviewBuilder(this.survey, interview)
            : new InterviewBuilder(this.survey, i);
        if (nonce)
            builder.init(nonce, lastInput !== null && lastInput !== void 0 ? lastInput : new Date());
        this.interviews.push(builder);
        return builder;
    }
    build() {
        const interviews = this.buildInterviews();
        if (typeof this.participant == "undefined")
            this.participant = new Participant(this.participantCode, this.sample, {
                interviews: DomainCollection(...interviews),
            });
        else {
            this.participant = updateParticipant(this.participant, DomainCollection(...interviews));
        }
        return this.participant;
    }
    buildInterviews() {
        return this.interviews.reduce((result, i) => {
            const interview = i instanceof Interview ? i : this.buildInterview(i, result);
            return [...result, interview];
        }, []);
    }
    buildInterview(i, preceding) {
        const outer = this.participant
            ? [...this.participant.interviews, ...preceding]
            : preceding;
        return i.build(outer);
    }
}
function updateParticipant(current, interviews) {
    const merged = merge(DomainCollection(...current.interviews), interviews)
        .on((i1, i2) => i1.pageSet == i2.pageSet && (i1.nonce == 0 || i1.nonce == i2.nonce))
        .insertAll();
    return current.update({ interviews: merged });
}

class Metadata {
    constructor(pageItem, crossRules) {
        this.pageItem = pageItem;
        this.crossRules = crossRules.filter(r => pageItem.isInstanceOf(r.target));
        this.activable = this.getActivable();
        this.showable = this.getShowable();
        this.computed = this.getComputed();
        [this.default, this.defaultType] = this.getDefault();
        this.memorized = this.getMemorized();
        this.maxLength = this.getMaxLength();
        this.min = this.getMinRange();
        this.max = this.getMaxRange();
        this.limits = this.getLimits();
        this.range = this.getRange();
        this.precision = this.getPrecision();
        this.required = this.getRequired();
        this.critical = this.getCritical();
        this.notification = this.getNotification();
        this.trigger = this.getTrigger();
        this.fixedLength = this.getFixedLength();
        this.letterCase = this.getLetterCase();
        this.properties = this.getProperties();
    }
    getProperties() {
        const type = this.pageItem.type;
        if (type instanceof DateType)
            return [
                "date",
                ...(type.incomplete ? ["incomplete"] : []),
                ...(type.month ? ["YYYY-MM"] : ["YYYY-MM-DD"]),
            ];
        if (type instanceof TimeType) {
            if (type.duration)
                return ["duration", "HH:MI"];
            else
                return ["time", "HH24:MI"];
        }
        if (type instanceof ChoiceType && type.multiplicity == "many")
            return ["choice", "multiple"];
        return [type.name];
    }
    getActivable() {
        return this.getActivation("enable");
    }
    getShowable() {
        return this.getActivation("show");
    }
    getActivation(behavior) {
        const rule = Rules.find(this.crossRules, "activation", behavior);
        if (typeof rule == "undefined")
            return undefined;
        return rule.name == "dynamic"
            ? this.rewriteFormula("dynamic", rule.pageItems, rule.args.formula[0])
            : this.rewriteFormula("activation", rule.pageItems, rule.args.values);
    }
    getComputed(when = "always") {
        const rule = Rules.find(this.crossRules.filter(r => r.when == when), "computed");
        if (typeof rule == "undefined")
            return undefined;
        return this.rewriteFormula("computed", rule.pageItems, rule.args.formula);
    }
    getDefault() {
        const prop = this.getProperty("constant", "value");
        if (isComputed(prop))
            return [prop.formula, "computed"];
        if (typeof prop != "undefined")
            return [prop, "constant"];
        const computed = this.getComputed("initialization");
        if (typeof computed != "undefined")
            return [computed, "computed"];
        const copy = Rules.find(this.crossRules, "copy");
        if (typeof copy != "undefined")
            return [getScopedItem(copy.pageItems[0]).variableName, "copy"];
        return [undefined, undefined];
    }
    getMemorized() {
        return this.computed == Macros.memorize(this.pageItem.variableName);
    }
    getFixedLength() {
        const prop = this.getProperty("fixedLength", "length");
        return isComputed(prop) ? prop.formula : prop;
    }
    getMaxLength() {
        const prop = this.getProperty("maxLength", "length");
        return isComputed(prop) ? prop.formula : prop;
    }
    getPrecision() {
        const prop = this.getProperty("decimalPrecision", "precision");
        return isComputed(prop) ? prop.formula : prop;
    }
    getMinRange() {
        const prop = this.getProperty("inRange", "min");
        return isComputed(prop) ? prop.formula.split(",")[0] : prop;
    }
    getMaxRange() {
        const prop = this.getProperty("inRange", "max");
        return isComputed(prop) ? prop.formula.split(",")[1] : prop;
    }
    getRequired() {
        const prop = this.getProperty("required");
        return isComputed(prop) ? prop.formula : !!prop;
    }
    getCritical() {
        const prop = this.getProperty("critical", "event");
        return isComputed(prop)
            ? this.splitArrayFormula(prop.formula)[0].replace(/^'([^']+)'$/, "$1")
            : prop;
    }
    getNotification() {
        const prop = this.getProperty("critical", "message");
        return isComputed(prop)
            ? this.splitArrayFormula(prop.formula)[1].replace(/^'([^']+)'$/, "$1")
            : prop;
    }
    getTrigger() {
        const rule = Rules.find(this.crossRules, "critical");
        if (typeof rule == "undefined")
            return undefined;
        return rule.name == "dynamic"
            ? this.rewriteDynamic(rule)[2]
            : this.rewriteFormula("critical", rule.pageItems, rule.args.values);
    }
    getLetterCase() {
        const prop = this.getProperty("letterCase", "letterCase");
        return isComputed(prop) ? prop.formula : prop;
    }
    getRange() {
        if (!this.limits)
            return undefined;
        const minLimit = this.limits.includeLower ? "[" : "]";
        const maxLimit = this.limits.includeUpper ? "]" : "[";
        return `${minLimit}${this.min}, ${this.max}${maxLimit}`;
    }
    getLimits() {
        const rule = Rules.find(this.crossRules, "inRange");
        if (!rule)
            return undefined;
        return (rule.name == "dynamic" ? rule.args.extraArgs : rule.args.limits);
    }
    getProperty(ruleName, prop) {
        const rule = Rules.find(this.crossRules, ruleName);
        if (typeof rule == "undefined")
            return undefined;
        return rule.name == "dynamic"
            ? {
                formula: this.rewriteFormula("dynamic", rule.pageItems, rule.args.formula[0]),
            }
            : prop
                ? rule.args[prop]
                : true;
    }
    rewriteDynamic(rule) {
        const array = this.rewriteFormula("dynamic", rule.pageItems, rule.args.formula[0]);
        return this.splitArrayFormula(array);
    }
    splitArrayFormula(array) {
        return array.match(/'[^']*'|[^,]+/g);
    }
    rewriteFormula(ruleName, pageItems, formula) {
        if (ruleName == "dynamic" && typeof formula == "string")
            formula = this.extractArrayContent(formula);
        if (["activation", "critical"].includes(ruleName) &&
            Array.isArray(formula)) {
            if (formula.length == 0)
                return undefined;
            formula = this.orValues(formula);
        }
        const variableNames = pageItems === null || pageItems === void 0 ? void 0 : pageItems.map(p => this.rewriteVariable(p));
        return variableNames === null || variableNames === void 0 ? void 0 : variableNames.reduce((expr, name, i) => this.replaceVariable(expr, i + 1, name), formula);
    }
    extractArrayContent(formula) {
        return formula.replace(/(\[|\])/g, "");
    }
    orValues(values) {
        return values
            .map(value => {
            return "$1 == " + value;
        })
            .join(" || ");
    }
    replaceVariable(formula, variableIndex, variableName) {
        const regex = new RegExp("\\$" + variableIndex, "g");
        return formula.replace(regex, variableName);
    }
    rewriteVariable(p) {
        if (p instanceof PageItem)
            return p.variableName;
        const variableName = p[0].variableName;
        const level = p[1];
        if (level == "global")
            return "@" + variableName;
        if (level == "outer")
            return "$" + variableName;
        return variableName;
    }
}

function groupByPageSet(interviews) {
    return interviews
        .reduce(groupSamePageSet, DomainCollection())
        .map(sortInterviews);
}
function groupSamePageSet(result, interview) {
    const pageSet = interview.pageSet;
    if (result.find(r => r.pageSet == pageSet))
        return result.update(r => r.pageSet == pageSet
            ? { pageSet, interviews: r.interviews.append(interview) }
            : r);
    return result.append({ pageSet, interviews: DomainCollection(interview) });
}
function sortInterviews(group) {
    return {
        pageSet: group.pageSet,
        interviews: group.interviews.sort((i, j) => {
            var _a;
            return (i.date ? (_a = new Date(i.date)) === null || _a === void 0 ? void 0 : _a.getTime() : 0) -
                (j.date ? new Date(j.date).getTime() : 0);
        }),
    };
}

function parseComment(comment) {
    const symbols = getSymbols(comment);
    return symbols.reduce((result, s) => {
        const { symbol } = s, others = __rest(s, ["symbol"]);
        switch (symbol) {
            case "doubleWording":
                result = parseDoubleWording(result, others.leftWording, others.rightWording);
                break;
            case "basicComment":
                result = parseBasicComment(result, others.comment);
                break;
            case "classes":
                result = parseClasses(result, others.classes);
                break;
        }
        return result;
    }, {});
}
function getSymbols(comment) {
    const s = [];
    const contentWordings = matchDoubleWording(comment);
    if (contentWordings)
        s.push(contentWordings);
    const contentClasses = matchClasses(comment);
    if (contentClasses)
        s.push(contentClasses);
    const contentComment = s.length > 0 ? matchBasicComment(comment) : undefined;
    if (contentComment)
        s.push(contentComment);
    return s;
}
function matchDoubleWording(comment, lang) {
    if (typeof comment == "string") {
        const matches = /<(.+) \| (.+)>/.exec(comment);
        if (matches && matches.length > 2)
            return {
                symbol: "doubleWording",
                leftWording: lang ? { [lang]: matches[1] } : matches[1],
                rightWording: lang ? { [lang]: matches[2] } : matches[2],
            };
    }
    else {
        const matches = Object.entries(comment)
            .map(([lang, label]) => matchDoubleWording(label, lang))
            .filter((m) => !!m);
        if (matches.length > 0)
            return matches.reduce((result, s) => {
                result.leftWording = Object.assign(Object.assign({}, result.leftWording), s.leftWording);
                result.rightWording = Object.assign(Object.assign({}, result.rightWording), s.rightWording);
                return result;
            });
    }
}
function matchBasicComment(comment, lang) {
    if (typeof comment == "string") {
        const matches = /^[^()]*\((.*)\)[^()]*$/.exec(comment.replace(/<.+ \| .+>/g, ""));
        if (matches)
            return {
                symbol: "basicComment",
                comment: lang ? { [lang]: matches[1] } : matches[1],
            };
    }
    else {
        const matches = Object.entries(comment)
            .map(([lang, label]) => matchBasicComment(label, lang))
            .filter((m) => !!m);
        if (matches.length > 0)
            return matches.reduce((result, s) => {
                result.comment = Object.assign(Object.assign({}, result.comment), s.comment);
                return result;
            });
    }
}
function matchClasses(comment, lang) {
    if (typeof comment == "string") {
        const matchClasses = /{(.+)}/.exec(comment);
        if (matchClasses) {
            const classes = matchClasses[1].match(/[^.]+/g);
            if (classes)
                return {
                    symbol: "classes",
                    classes: classes,
                };
        }
    }
    else {
        const matches = Object.entries(comment)
            .map(([lang, label]) => matchClasses(label))
            .filter((m) => !!m);
        if (matches.length > 0)
            return matches.reduce((result, s) => {
                var _a;
                if (result.classes)
                    (_a = s.classes) === null || _a === void 0 ? void 0 : _a.map(c => {
                        var _a, _b;
                        if (!((_a = result.classes) === null || _a === void 0 ? void 0 : _a.includes(c)))
                            (_b = result.classes) === null || _b === void 0 ? void 0 : _b.push(c);
                    });
                else
                    result.classes = s.classes;
                return result;
            });
    }
}
function parseDoubleWording(modifier, leftWording, rightWording) {
    return Object.assign(modifier, { leftWording, rightWording });
}
function parseBasicComment(modifier, comment) {
    return Object.assign(modifier, { comment });
}
function parseClasses(modifier, classes) {
    return Object.assign(modifier, { classes });
}

function matchRecordsetItem(wording, lang) {
    if (typeof wording == "string") {
        return matchStringRecordItem(wording, lang);
    }
    else {
        return matchMLStringRecordItem(wording);
    }
}
function matchStringRecordItem(wording, lang) {
    const matches = /^\s*(->) (.+)$/.exec(wording);
    if (matches && matches.length > 1) {
        return {
            symbol: "recordItem",
            column: lang ? { [lang]: matches[2] } : matches[2],
        };
    }
}
function matchMLStringRecordItem(wording) {
    const matches = Object.entries(wording)
        .map(([lang, label]) => matchRecordsetItem(label, lang))
        .filter((m) => !!m);
    if (matches.length > 0)
        return reduceMLStringRecordItem(matches);
}
function reduceMLStringRecordItem(matches) {
    return matches.reduce((result, s) => {
        result.column = Object.assign(Object.assign({}, result.column), s.column);
        return result;
    });
}
function matchTableItem(wording, lang) {
    if (typeof wording == "string") {
        return matchStringTableItem(wording, lang);
    }
    else {
        return matchMLStringTableItem(wording);
    }
}
function matchStringTableItem(wording, lang) {
    const matches = /(\w.+) -> (.+)$/.exec(wording);
    if (matches && matches.length > 2) {
        return {
            symbol: "tableItem",
            wording: lang ? { [lang]: matches[1] } : matches[1],
            column: lang ? { [lang]: matches[2] } : matches[2],
        };
    }
}
function matchMLStringTableItem(wording) {
    const matches = Object.entries(wording)
        .map(([lang, label]) => matchTableItem(label, lang))
        .filter((m) => !!m);
    if (matches.length > 0)
        return reduceMLStringTableItem(matches);
}
function reduceMLStringTableItem(matches) {
    return matches.reduce((result, s) => {
        result.wording = Object.assign(Object.assign({}, result.wording), s.wording);
        result.column = Object.assign(Object.assign({}, result.column), s.column);
        return result;
    });
}
function getMainSymbols(layout, item) {
    const symbols = [];
    const isSectionStart = addSectionSymbol(layout, item, symbols);
    const isRecordSet = addRecordsetItemSymbol(item, layout, symbols, isSectionStart);
    if (!isRecordSet) {
        addInnerSymbol(item, layout, symbols, isSectionStart);
    }
    return symbols;
}
function getNestedSymbols(wording) {
    return (layout, item) => {
        const symbols = [];
        const isSectionStart = addSectionSymbol(layout, item, symbols);
        addInnerSymbol(item, layout, symbols, isSectionStart);
        return symbols.map(s => (s.wording ? Object.assign(s, { wording }) : s));
    };
}
function addInnerSymbol(item, layout, symbols, isSectionStart) {
    const isTable = addTableItemSymbol(item, layout, symbols, isSectionStart);
    if (!isTable) {
        const isRich = addRichItemSymbol(item, symbols);
        if (!isRich)
            addSingleItem(item, symbols);
    }
}
function addSectionSymbol(layout, item, symbols) {
    var _a, _b, _c;
    const lastSectionTitle = getTranslation((_a = layout.sections.last) === null || _a === void 0 ? void 0 : _a.title);
    const currentSectionTitle = (_b = getTranslation(getItem(item).section)) !== null && _b !== void 0 ? _b : "";
    const startSection = layout.sections.length == 0 || lastSectionTitle != currentSectionTitle;
    if (startSection)
        symbols.push({
            symbol: "section",
            title: (_c = getItem(item).section) !== null && _c !== void 0 ? _c : "",
        });
    return startSection;
}
function addTableItemSymbol(item, layout, symbols, startSection) {
    const modifiers = getModifier(getItem(item).comment);
    const contentSymbols = matchTableItem(getItemWording(item));
    if (contentSymbols) {
        addTableSymbol(layout, symbols, startSection);
        symbols.push(Object.assign(Object.assign({}, (contentSymbols !== null && contentSymbols !== void 0 ? contentSymbols : {})), (modifiers !== null && modifiers !== void 0 ? modifiers : {})));
    }
    return !!contentSymbols;
}
function addTableSymbol(layout, symbols, startSection) {
    if (startSection)
        symbols.push({ symbol: "table" });
    else if (!lastContentIsTable(layout))
        symbols.push({ symbol: "table" });
}
function lastContentIsTable(layout) {
    var _a;
    const lastContent = (_a = layout.sections.last) === null || _a === void 0 ? void 0 : _a.content;
    return lastContent && lastContent[lastContent.length - 1].behavior == "table";
}
function addRecordsetItemSymbol(item, layout, symbols, startSection) {
    const modifiers = getModifier(getItem(item).comment);
    const contentSymbols = matchRecordsetItem(getItemWording(item));
    if (typeof contentSymbols != "undefined") {
        addRecordSymbol(layout, symbols, startSection);
        symbols.push(Object.assign(Object.assign({}, contentSymbols), (modifiers !== null && modifiers !== void 0 ? modifiers : {})));
    }
    return !!contentSymbols;
}
function addRecordSymbol(layout, symbols, startSection) {
    if (startSection)
        symbols.push({ symbol: "recordset" });
    else if (!lastContentIsRecord(layout))
        symbols.push({ symbol: "recordset" });
}
function lastContentIsRecord(layout) {
    var _a;
    const lastContent = (_a = layout.sections.last) === null || _a === void 0 ? void 0 : _a.content;
    return (lastContent && lastContent[lastContent.length - 1].behavior == "recordset");
}
function addRichItemSymbol(item, symbols) {
    const modifiers = getModifier(getItem(item).comment);
    const isRich = isRichItem(modifiers);
    if (isRich) {
        symbols.push(Object.assign(Object.assign({ symbol: "richItem" }, (modifiers !== null && modifiers !== void 0 ? modifiers : {})), { wording: getItemWording(item) }));
    }
    return isRich;
}
function isRichItem(modifiers) {
    return modifiers && (modifiers.leftWording || modifiers.rightWording);
}
function addSingleItem(item, symbols) {
    var _a;
    const comment = getItem(item).comment;
    const modifiers = getModifier(comment);
    symbols.push(Object.assign(Object.assign({ symbol: "item" }, (modifiers !== null && modifiers !== void 0 ? modifiers : {})), { wording: (_a = getItemWording(item)) !== null && _a !== void 0 ? _a : "" }));
}
function getModifier(comment) {
    if (typeof comment == "undefined")
        return undefined;
    return parseComment(comment);
}
function parseLayout(pageItems) {
    const layout = {
        sections: DomainCollection(),
        getSymbols: getMainSymbols,
    };
    return pageItems.reduce((result, q) => parse(result, q), layout).sections;
}
function parse(result, q) {
    const symbols = result.getSymbols(result, q);
    return symbols.reduce((result, s) => parseSymbol(result, q, s), result);
}
function parseSymbol(result, q, s) {
    const { symbol } = s, others = __rest(s, ["symbol"]);
    switch (symbol) {
        case "section":
            return parseSection(result, others.title);
        case "item":
            return parseSingleItem(result, q, others.wording, others.comment, others.classes);
        case "richItem":
            return parseRichItem(result, q, others.wording, others.leftWording, others.rightWording, others.comment, others.classes);
        case "table":
            return parseTable(result);
        case "tableItem":
            return parseTableItem(result, q, others.wording, others.column, others.classes);
        case "recordset":
            return parseRecordset(result);
        case "recordItem":
            return parseRecordsetItem(result, q, others.column, others.classes);
    }
}
function parseSection({ sections, getSymbols }, title) {
    return {
        sections: sections.append({ title, content: [] }),
        getSymbols,
    };
}
function parseSingleItem({ sections, getSymbols }, item, wording, comment, classes) {
    return {
        sections: sections.update(r => {
            if (r != sections.last)
                return r;
            r.content.push(singleItem(item, wording, comment, classes));
            return r;
        }),
        getSymbols,
    };
}
function singleItem(item, wording, comment, classes) {
    return {
        behavior: "item",
        item,
        labels: { comment, wording },
        modifiers: { classes },
    };
}
function parseTable({ sections, getSymbols, }) {
    return {
        sections: sections.update(r => {
            if (r != sections.last)
                return r;
            r.content.push({
                behavior: "table",
                columns: [],
                items: [],
            });
            return r;
        }),
        getSymbols,
    };
}
function parseRecordset({ sections, getSymbols, }) {
    return {
        sections: sections.update(r => {
            if (r != sections.last)
                return r;
            r.content.push({
                behavior: "recordset",
                columns: [],
                items: [],
            });
            return r;
        }),
        getSymbols,
    };
}
function parseTableItem({ sections, getSymbols }, q, wording, column, classes) {
    return {
        sections: sections.update(r => {
            if (r != sections.last)
                return r;
            const { array, lastRow, colIndex } = getArray(r, column);
            if (isNewRow(lastRow, wording))
                parseRow(array, wording, colIndex, q, classes);
            else
                parseCell(lastRow, colIndex, q, classes);
            return r;
        }),
        getSymbols,
    };
}
function parseRecordsetItem({ sections, getSymbols }, q, column, classes) {
    return {
        sections: sections.update(r => {
            if (r != sections.last)
                return r;
            const header = { wording: column, modifiers: { classes } };
            const { array, colIndex } = getArray(r, header);
            if (isNewRecord(array.items, q))
                parseRecord(array, column, colIndex, q);
            else
                parseMember(array, column, colIndex, q);
            return r;
        }),
        getSymbols,
    };
}
function getArray(r, column) {
    const array = r.content[r.content.length - 1];
    const lastRow = array.items[array.items.length - 1];
    const colIndex = findColumn(array.columns, column);
    return { array, lastRow, colIndex };
}
function findColumn(columns, column) {
    const col = columns.findIndex((c) => getTranslation(isMLstring(c) ? c : c.wording) ==
        getTranslation(isMLstring(column) ? column : column.wording));
    if (col > -1)
        return col;
    columns.push(column);
    return columns.length - 1;
}
function parseRichItem({ sections, getSymbols }, item, wording, leftWording, rightWording, comment, classes) {
    return {
        sections: sections.update(r => {
            if (r != sections.last)
                return r;
            r.content.push(richItem(item, leftWording, rightWording, comment, wording, classes));
            return r;
        }),
        getSymbols,
    };
}
function richItem(item, leftWording, rightWording, comment, wording, classes) {
    return {
        behavior: "richItem",
        item,
        labels: {
            leftWording,
            rightWording,
            comment,
            wording,
        },
        modifiers: { classes },
    };
}
function isNewRow(lastContent, wording) {
    return (!lastContent ||
        getTranslation(lastContent.wording) != getTranslation(wording));
}
function isNewRecord(items, item) {
    return getItem(item).instance > items.length;
}
function parseRow(table, wording, colIndex, q, classes) {
    const row = { wording, row: new Array(table.columns.length).fill(null) };
    row.row[colIndex] = {
        item: q,
        modifiers: { classes },
    };
    table.items.push(row);
}
function parseRecord(table, wording, colIndex, q) {
    const item = getItem(q);
    while (table.items.length < item.instance) {
        const row = new Array(table.columns.length).fill(null);
        table.items.push(row);
    }
    parseMember(table, wording, colIndex, q);
}
function parseCell(lastContent, colIndex, q, classes) {
    while (colIndex >= lastContent.row.length)
        lastContent.row.push(null);
    lastContent.row[colIndex] = {
        item: q,
        modifiers: { classes },
    };
}
function parseMember(array, wording, colIndex, q) {
    const item = getItem(q);
    const sections = getNestedSections(array, colIndex, item);
    const nestedLayout = getNestedLayout(sections, wording);
    const result = parse(nestedLayout, q);
    const section = result.sections[0];
    array.items[item.instance - 1][colIndex] = section.content[0];
}
function getNestedSections(array, colIndex, item) {
    var _a, _b;
    return colIndex > 0 &&
        ((_a = array.items[item.instance - 1][colIndex - 1]) === null || _a === void 0 ? void 0 : _a.behavior) == "table"
        ? DomainCollection({
            title: (_b = item.section) !== null && _b !== void 0 ? _b : "",
            content: [array.items[item.instance - 1][colIndex - 1]],
        })
        : DomainCollection();
}
function getNestedLayout(sections, wording) {
    var _a, _b;
    const word = (_b = (_a = matchTableItem(wording)) === null || _a === void 0 ? void 0 : _a.wording) !== null && _b !== void 0 ? _b : wording;
    return {
        sections,
        getSymbols: getNestedSymbols(word),
    };
}

function getColumnSums(values) {
    return [values.reduce((s, row) => s.map((v, i) => v + row[i]))];
}
function getRowSums(values) {
    return values.map(row => [row.reduce((s, v) => s + v, 0)]);
}
class InclusionsBySamples {
    constructor(survey, samples, participants, title = {
        en: "Inclusions by samples",
        fr: "Inclusions par centres",
    }, rowLabel = { en: "Dates", fr: "Dates" }, columnLabel = {
        en: "Number of inclusions by samples",
        fr: "Nombre d'inclusions par centres",
    }) {
        this.survey = survey;
        this.samples = samples;
        this.participants = participants;
        this.title = title;
        const columnIndexes = [...this.samples.map(s => s.sampleCode)];
        const rowIndexes = this.getRowIndexes();
        this.datasource = {
            row: {
                variableName: "@INDATE",
                label: rowLabel,
                values: rowIndexes,
                type: { name: "date", nature: "numerical" },
            },
            column: {
                variableName: "@SAMPLE",
                label: columnLabel,
                values: columnIndexes,
                type: { name: "text", nature: "categorical" },
            },
        };
        this.values = this.getValues();
    }
    getRowIndexes() {
        const rowIndexes = [];
        for (const p of this.participants) {
            const d = this.getInclusionDate(p);
            if (typeof d == "number")
                rowIndexes.push(d);
        }
        rowIndexes.sort((a, b) => a - b);
        return rowIndexes.filter((v, i, arr) => i == 0 || v != arr[i - 1]);
    }
    getInclusionDate(p) {
        return typeof p.inclusionDate == "number"
            ? p.inclusionDate
            : p.inclusionDate != undefined
                ? new Date(p.inclusionDate).getTime()
                : undefined;
    }
    getValues() {
        return this.datasource.row.values.map(ri => this.datasource.column.values.map(ci => this.participants.filter(p => p.sampleCode == ci &&
            new Date(p.inclusionDate).getTime() == ri).length));
    }
    get columnSums() {
        return getColumnSums(this.values);
    }
    get rowSums() {
        return getRowSums(this.values);
    }
}

function percentiles(data, segments = 4) {
    data = data.slice().sort((a, b) => a - b);
    const index = partition(data.length, segments);
    return index.map(i => {
        const p = i % 1;
        if (p == 0)
            return data[i];
        i = i - p;
        return (1 - p) * data[i] + p * data[i + 1];
    });
}
function partition(length, segments) {
    return Array.from(new Array(segments + 1), (_, i) => (i * (length - 1)) / segments);
}

function splitRow(r) {
    return {
        values: r.slice(0, -1),
        count: r[r.length - 1],
    };
}
const defaultKpiSetOptions = {
    sample: false,
};
class KPISet {
    constructor(survey, summaries, options = {}) {
        this.survey = survey;
        options = Object.assign({}, defaultKpiSetOptions, options);
        this.margins = this.getMargins(summaries, options);
        this.data = this.getData(summaries);
    }
    get variableNames() {
        return [...this.margins.keys()];
    }
    select(...variableNames) {
        const { indexes, margins } = this.selectMargins(variableNames);
        const data = this.selectData(indexes);
        const projected = Object.create(KPISet.prototype);
        Object.assign(projected, { survey: this.survey, margins, data });
        return projected;
    }
    getMatrix(rowVariable, colVariable) {
        const rowMargin = this.margins.get(rowVariable);
        const colMargin = this.margins.get(colVariable);
        if (colMargin.nature == "categorical")
            return new CategoricalDistribution(rowMargin, colMargin, this.select(rowVariable, colVariable).data);
        return new NumericalDistribution(rowMargin, colMargin);
    }
    getData(summaries) {
        const data = new Map();
        for (let i = 0; i < summaries.length; i++) {
            const values = this.getValuesFromMargins(i);
            this.pushOrIncr(data, values);
        }
        return [...data.values()].sort((a, b) => this.compareRows(a, b));
    }
    getMargins(summaries, options) {
        const margins = new Map();
        this.setRawValues(summaries, margins, options);
        this.setValues(margins);
        return margins;
    }
    selectData(indexes) {
        const data = new Map();
        for (const row of this.data) {
            const { values, count } = splitRow(row);
            const projected = indexes.map(i => values[i]);
            this.pushOrIncr(data, projected, count);
        }
        return [...data.values()].sort((a, b) => this.compareRows(a, b));
    }
    selectMargins(variableNames) {
        const margins = new Map();
        const indexes = [];
        const indexedMargins = Object.entries([...this.margins.entries()]);
        const filteredMargins = variableNames.map(v => indexedMargins.find(([, [m]]) => m == v));
        for (const [i, [variableName, margin]] of filteredMargins)
            if (variableNames.includes(variableName)) {
                indexes.push(Number(i));
                margins.set(variableName, margin);
            }
        return { indexes, margins };
    }
    getValuesFromMargins(i) {
        const values = [];
        for (const margin of this.margins.values()) {
            values.push(margin.values[i]);
        }
        return values;
    }
    pushOrIncr(data, values, count = 1) {
        const key = JSON.stringify(values);
        const row = data.get(key);
        if (typeof row == "undefined")
            data.set(key, this.initRow(values, count));
        else
            data.set(key, this.incrRow(row, count));
    }
    initRow(values, count = 1) {
        return [...values, count];
    }
    incrRow(row, incr = 1) {
        const { values, count } = splitRow(row);
        return [...values, count + incr];
    }
    compareRows(a, b) {
        const aValues = splitRow(a).values;
        const bValues = splitRow(b).values;
        return aValues.reduce((r, v, i) => r || this.compareValue(v, bValues[i]), 0);
    }
    compareValue(a, b) {
        if (typeof a == "undefined")
            return typeof b == "undefined" ? 0 : -1;
        if (typeof b == "undefined")
            return 1;
        return a.localeCompare(b);
    }
    setRawValues(summaries, margins, options) {
        var _a;
        if (options.sample) {
            for (const [i, summary] of Object.entries(summaries)) {
                this.addRawValue(margins, "@SAMPLE", Number(i), { en: "sample", fr: "centre" }, summary.sampleCode);
            }
        }
        for (const [i, summary] of Object.entries(summaries)) {
            for (const variableName in summary.kpis) {
                this.addRawValue(margins, variableName, Number(i), summary.kpis[variableName].kpi, (_a = summary.kpis[variableName].value) !== null && _a !== void 0 ? _a : summary.kpis[variableName].specialValue);
            }
        }
        for (const margin of margins.values()) {
            const missing = Array(summaries.length - margin.rawValues.length).fill(undefined);
            margin.rawValues.push(...missing);
        }
    }
    addRawValue(margins, variableName, index, label, value) {
        var _a;
        const margin = (_a = margins.get(variableName)) !== null && _a !== void 0 ? _a : {
            rawValues: [],
            values: [],
            modalities: [],
            variableName,
            label,
            type: {},
            nature: "categorical",
        };
        const missing = Array(index - margin.rawValues.length).fill(undefined);
        margin.rawValues.push(...missing, value);
        margins.set(variableName, margin);
    }
    setValues(margins) {
        var _a;
        for (const [variableName, margin] of margins.entries()) {
            const [mainVariable] = variableName.split("|");
            const pageItem = this.survey.getItemForVariable(mainVariable);
            margin.type = Object.assign({}, ((_a = pageItem === null || pageItem === void 0 ? void 0 : pageItem.type) !== null && _a !== void 0 ? _a : { name: "text" }));
            margin.nature = (pageItem === null || pageItem === void 0 ? void 0 : pageItem.type.nature) || "categorical";
            if (margin.nature == "numerical")
                this.setNumericalValues(margin);
            else
                this.setCategoricalValues(margin, pageItem);
        }
    }
    setCategoricalValues(margin, pageItem) {
        margin.values = margin.rawValues.map(v => typeof v == "undefined" ? undefined : String(v));
        if (pageItem && hasFixedLabels(pageItem.type))
            this.setFixedModalities(margin, pageItem);
        else
            this.setComputedModalities(margin);
        margin.type.nature = "categorical";
    }
    setComputedModalities(margin) {
        margin.modalities = margin.values
            .filter((v) => typeof v != "undefined")
            .sort((a, b) => a.localeCompare(b))
            .filter((v, i, arr) => i == 0 || arr[i - 1] != v);
    }
    setFixedModalities(margin, pageItem) {
        margin.modalities = pageItem.type.rawValues.map(v => String(v));
        if (!new Metadata(pageItem, this.survey.rules).required)
            margin.modalities.push("notApplicable", "notDone", "unknown");
    }
    setNumericalValues(margin) {
        const quartiles = percentiles(margin.rawValues.filter((v) => typeof v == "number"));
        margin.modalities = this.getModalities(quartiles);
        margin.values = this.getValues(margin.rawValues, margin.modalities, quartiles);
        margin.percentiles = quartiles;
        margin.type.nature = "numerical";
    }
    getValues(rawValues, modalities, quartiles) {
        return rawValues.map(v => {
            if (typeof v == "undefined")
                return undefined;
            const index = quartiles.slice(1).findIndex(i => i > v);
            return modalities[index > -1 ? index : modalities.length - 1];
        });
    }
    getModalities(indexes) {
        return indexes
            .map((q, i, arr) => (i > 0 ? [arr[i - 1], q] : []))
            .slice(1)
            .map((limits, i) => this.getModality(limits, i, indexes.length - 2));
    }
    getModality(limits, quantile, last) {
        const interval = `${limits[0]}, ${limits[1]}`;
        const closing = quantile == last ? "]" : ")";
        return `Q${quantile + 1}: [${interval}${closing}`;
    }
}
class AbstractKpi {
    constructor(rowMargin, colMargin) {
        this.rowMargin = rowMargin;
        this.colMargin = colMargin;
        this.title = colMargin.label;
        this.datasource = {
            row: {
                variableName: rowMargin.variableName,
                label: rowMargin.label,
                values: rowMargin.modalities,
                type: rowMargin.type,
            },
            column: {
                variableName: colMargin.variableName,
                label: colMargin.label,
                values: colMargin.modalities,
                type: colMargin.type,
            },
        };
    }
}
class CategoricalDistribution extends AbstractKpi {
    constructor(rowMargin, colMargin, data) {
        super(rowMargin, colMargin);
        this.values = this.rowMargin.modalities.map(r => this.colMargin.modalities.map(c => {
            const row = data.find(d => d[0] == r && d[1] == c);
            return row ? splitRow(row).count : 0;
        }));
        this.rowSums = getRowSums(this.values);
        this.columnSums = getColumnSums(this.values);
    }
}
class NumericalDistribution extends AbstractKpi {
    constructor(rowMargin, colMargin) {
        super(rowMargin, colMargin);
        this.values = rowMargin.modalities.map(mod => {
            const values = colMargin.rawValues.filter((v, i) => rowMargin.rawValues[i] == mod && typeof v == "number");
            return percentiles(values);
        });
        this.rowSums = this.values.map(v => [v[2]]);
        this.columnSums = [colMargin.percentiles];
        this.datasource.column.values = ["min", "Q1", "median", "Q3", "max"];
    }
}

function isDomainProxy(adapter) {
    const adaptee = adapter.value;
    return (typeof adaptee != "undefined" &&
        Object.getPrototypeOf(adapter) == Object.getPrototypeOf(adaptee));
}
function DomainProxy(adapter, adaptee) {
    const { proto, descrs } = getPrototype(adapter, adaptee);
    const target = Object.create(proto, descrs);
    const handlers = gtHandlers(adapter);
    return new Proxy(target, handlers);
}
function getPrototype(adapter, adaptee) {
    const proto = Object.getPrototypeOf(adaptee);
    const descrs = getDesriptors(adapter, adaptee);
    return { proto, descrs };
}
function getDesriptors(adapter, adaptee) {
    const descrs = Object.getOwnPropertyDescriptors(adaptee);
    const target = {
        value: {
            configurable: true,
            enumerable: false,
            get: function () {
                return adapter.value;
            },
            set: function (value) {
                adapter.value = value;
            },
        },
    };
    for (const [prop, descr] of Object.entries(descrs)) {
        const d = {};
        d.enumerable = descr.enumerable;
        d.get = function () {
            return this.value[prop];
        };
        target[prop] = d;
    }
    return target;
}
function gtHandlers(adapter) {
    return {
        get: (t, p, r) => proxyGet(adapter, t, p, r),
        set: (t, p, v) => proxySet(adapter, p, v),
    };
}
function proxyGet(adapter, target, p, receiver) {
    return p in adapter
        ? Reflect.get(adapter, p, receiver)
        : Reflect.get(target, p, receiver);
}
function proxySet(adapter, p, value) {
    if (p in adapter.value) {
        return false;
    }
    Reflect.set(adapter, p, value);
    return true;
}
function isProxyEqual(a, b) {
    return (a == b ||
        (isDomainProxy(a) && a.value == b) ||
        (isDomainProxy(b) && a == b.value) ||
        (isDomainProxy(a) && isDomainProxy(b) && a.value == b.value));
}

class MutableSurvey {
    constructor(value) {
        this.value = value;
        return DomainProxy(this, value);
    }
    update(kwargs) {
        this.value = this.value.update(kwargs);
        return this;
    }
    updateItem(pageIndex, index, item, rules) {
        const page = this.value.pages[pageIndex];
        const targetItem = getItem(page.items[index]);
        const updatedRules = updateItemInCrossRules(DomainCollection(...rules), targetItem, item);
        const { targetPage, updatedPage, crossRules } = updateItemInSurvey(this.value, targetItem, item, updatedRules);
        const { pageSets, pages, workflows } = updatePageInSurvey(this.value, targetPage, updatedPage);
        return this.update({ pageSets, pages, crossRules, workflows });
    }
    deleteItem(pageIndex, index) {
        const page = this.pages[pageIndex];
        const targetItem = getItem(page.items[index]);
        const { targetPage, updatedPage, crossRules } = deleteItemInSurvey(this.value, targetItem);
        const { pageSets, pages, workflows } = updatePageInSurvey(this.value, targetPage, updatedPage);
        return this.update({ pageSets, pages, crossRules, workflows });
    }
    insertItem(pageIndex, index, item, rules) {
        return this.insertItems(pageIndex, index, [item], rules);
    }
    insertItems(pageIndex, index, items, rules) {
        const page = this.value.pages[pageIndex];
        const { targetPage, updatedPage, crossRules } = insertItemInSurvey(this.value, page, index, items, DomainCollection(...rules));
        const { pageSets, pages, workflows } = updatePageInSurvey(this.value, targetPage, updatedPage);
        return this.update({ pageSets, pages, crossRules, workflows });
    }
    updatePage(pageIndex, page) {
        const targetPage = this.value.pages[pageIndex];
        const { pageSets, pages, workflows } = updatePageInSurvey(this.value, targetPage, page);
        return this.update({ pageSets, pages, workflows });
    }
    insertPage(pageSetIndex, index, page) {
        const pages = insertPageInPages(this.value, page);
        const pageSet = this.value.pageSets[pageSetIndex];
        const { pageSets, workflows } = insertPageSetInSurvey(this.value, pageSet, index, page);
        return this.update({ pages, pageSets, workflows });
    }
    deletePage(pageSetIndex, index) {
        const targetPageSet = this.value.pageSets[pageSetIndex];
        const targetPage = targetPageSet.pages[index];
        const { pageSets, workflows } = deletePageInOnePageSet(this.value, targetPageSet, targetPage);
        return this.update({ pageSets, workflows });
    }
    updateInclude(pageIndex, index, include) {
        const targetPage = this.value.pages[pageIndex];
        const targetInclude = targetPage.includes[index];
        const updatedPage = updateIncludeInPage(targetPage, targetInclude, include);
        const { pageSets, pages, workflows } = updatePageInSurvey(this.value, targetPage, updatedPage);
        return this.update({ pageSets, pages, workflows });
    }
    insertInclude(pageIndex, index, include) {
        const targetPage = this.value.pages[pageIndex];
        const { updatedPage } = insertIncludeInPage(targetPage, index, include);
        const { pageSets, pages, workflows } = updatePageInSurvey(this.value, targetPage, updatedPage);
        return this.update({ pageSets, pages, workflows });
    }
    deleteInclude(pageIndex, index) {
        const targetPage = this.value.pages[pageIndex];
        const targetInclude = targetPage.includes[index];
        const updatedPage = deleteIncludeInPage(targetPage, targetInclude);
        const { pageSets, pages, workflows } = updatePageInSurvey(this.value, targetPage, updatedPage);
        return this.update({ pageSets, pages, workflows });
    }
    updatePageSet(pageSetIndex, pageSet) {
        const targetPageSet = this.value.pageSets[pageSetIndex];
        const { pageSets, workflows } = updatePageSetInSurvey(this.value, targetPageSet, pageSet);
        return this.update({ pageSets, workflows });
    }
    insertPageSet(pageSet) {
        const { pageSets, workflows } = addPageSetInSurvey(this.value, pageSet);
        return this.update({ pageSets, workflows });
    }
    deletePageSet(pageSetIndex) {
        const targetPageSet = this.value.pageSets[pageSetIndex];
        const { pageSets, workflows } = removePageSetInSurvey(this.value, targetPageSet);
        return this.update({ pageSets, workflows });
    }
    updateWorkflow(workflowIndex, workflow) {
        const targetWorkflow = this.value.workflows[workflowIndex];
        const { workflows } = updateWorkflowInSurvey(this.value, targetWorkflow, workflow);
        return this.update({ workflows });
    }
    insertWorkflow(workflow) {
        const { workflows } = insertWorkflowInSurvey(this.value, workflow);
        return this.update({ workflows });
    }
    deleteWorkflow(workflowIndex) {
        const targetWorkflow = this.value.workflows[workflowIndex];
        if (targetWorkflow.name == this.value.mainWorkflow.name)
            throw "Main workflow can't be deleted.";
        const { workflows } = deleteWorkflowInSurvey(this.value, targetWorkflow);
        return this.update({ workflows });
    }
    updateOptions(surveyOptions) {
        return this.update({ options: surveyOptions });
    }
}
function insertWorkflowInSurvey(survey, workflow) {
    const workflows = survey.workflows.concat([workflow]);
    return { workflows };
}
function updateWorkflowInSurvey(survey, targetWorkflow, updatedWorkflow) {
    const workflows = survey.workflows.update(w => {
        return w == targetWorkflow ? updatedWorkflow : w;
    });
    return { workflows };
}
function deleteWorkflowInSurvey(survey, targetWorkflow) {
    return { workflows: survey.workflows.delete(w => w == targetWorkflow) };
}
function updatePageSetInSurvey(survey, targetPageSet, updatedPageSet) {
    const pageSets = survey.pageSets.update(ps => {
        if (ps == targetPageSet)
            return updatedPageSet;
        else
            return ps;
    });
    const workflows = updatePageSetsInWorkflows(survey.workflows, survey.pageSets, pageSets);
    return { pageSets, workflows };
}
function removePageSetInSurvey(survey, targetPageSet) {
    const pageSets = removePageSetInPageSets(survey.pageSets, targetPageSet);
    const workflows = removePageSetInWorkflows(survey.workflows, targetPageSet);
    return { pageSets, workflows };
}
function addPageSetInSurvey(survey, insertedPageSet) {
    const pageSets = survey.pageSets.concat([insertedPageSet]);
    const many = survey.mainWorkflow.many.concat([insertedPageSet]);
    const updatedMainWorkflow = survey.mainWorkflow.update({ many });
    const workflows = survey.workflows.map(w => w == survey.mainWorkflow ? updatedMainWorkflow : w);
    return { pageSets, workflows };
}
function insertItemInSurvey(survey, page, index, insertedItems, insertedRules) {
    const { targetPage, updatedPage } = insertItemInPage(page, index, insertedItems);
    const crossRules = mergeCrossRules(survey.crossRules, insertedItems, insertedRules);
    return { targetPage, updatedPage, crossRules };
}
function insertItemInPage(page, index, insertedItems) {
    const { includeAfter, includeAt } = getIncludeIndices(page, index);
    if (includeAfter < includeAt) {
        return includeItemInPage(page, includeAt, insertedItems);
    }
    const { nestedPage, nestedIndex } = getNestedIndices(page, index, includeAt);
    return insertItemInPage(nestedPage, nestedIndex, insertedItems);
}
function getIncludeIndices(page, index) {
    const includeAt = index == page.items.length
        ? page.items.length
        : getIncludeForItem(page, page.items[index]);
    const includeAfter = index == 0 ? -1 : getIncludeForItem(page, page.items[index - 1]);
    return { includeAfter, includeAt };
}
function includeItemInPage(page, includeAt, items) {
    const targetPage = page;
    const updatedPage = page.update({
        includes: DomainCollection(...page.includes.slice(0, includeAt), ...items, ...page.includes.slice(includeAt)),
    });
    return { targetPage, updatedPage };
}
function insertIncludeInPage(page, includeAt, include) {
    const targetPage = page;
    const updatedPage = page.update({
        includes: DomainCollection(...page.includes.slice(0, includeAt), include, ...page.includes.slice(includeAt)),
    });
    return { targetPage, updatedPage };
}
function getNestedIndices(page, index, includeAt) {
    const nestedPage = page.includes[includeAt].page;
    const nestedIndex = nestedPage.items.findIndex(i => getItem(i) == getItem(page.items[index]));
    return { nestedPage, nestedIndex };
}
function getIncludeForItem(page, item) {
    return page.includes.findIndex(i => i instanceof PageItem ? i == getItem(item) : i.items.includes(item));
}
function updateItemInSurvey(survey, targetItem, updatedItem, updatedRules) {
    const targetPage = survey.pages.find(p => p.includes.includes(targetItem));
    const updatedPage = updateItemInPage(targetPage, targetItem, updatedItem);
    const crossRules = updateItemInCrossRules(mergeCrossRules(survey.crossRules, [targetItem], updatedRules), targetItem, updatedItem);
    return { targetPage, updatedPage, crossRules };
}
function deleteItemInSurvey(survey, targetItem) {
    const targetPage = survey.pages.find(p => p.includes.includes(targetItem));
    const updatedPage = excludeItemInPage(targetPage, targetItem);
    const crossRules = deleteItemInCrossRules(survey.crossRules, targetItem);
    return { targetPage, updatedPage, crossRules };
}
function excludeItemInPage(page, targetItem) {
    return page.update({
        includes: page.includes.delete(pi => pi == targetItem),
    });
}
function deleteIncludeInPage(page, targetInclude) {
    return page.update({
        includes: page.includes.delete(pi => pi == targetInclude),
    });
}
function mergeCrossRules(crossRules, targetItems, updatedRules) {
    return crossRules
        .delete(r => targetItems.includes(r.target))
        .append(...updatedRules);
}
function updatePageInSurvey(survey, targetPage, updatedPage) {
    const pages = updatePageInPages(survey.pages, targetPage, updatedPage);
    const pageSets = updatePagesInPageSets(survey.pageSets, survey.pages, pages);
    const workflows = updatePageSetsInWorkflows(survey.workflows, survey.pageSets, pageSets);
    return { pageSets, pages, workflows };
}
function updatePagesInPageSets(pageSets, targetPages, updatedPages) {
    return pageSets.update(s => updatePagesInPageSet(s, targetPages, updatedPages));
}
function updatePagesInPageSet(pageSet, targetPages, updatedPages) {
    return pageSet.update({
        pages: pageSet.pages.update(p => updatedPages[targetPages.indexOf(p)]),
    });
}
function updateItemInPage(page, targetItem, updatedItem) {
    return page.update({
        includes: page.includes.update(i => (i == targetItem ? updatedItem : i)),
    });
}
function updateIncludeInPage(page, targetInclude, updatedInclude) {
    return page.update({
        includes: page.includes.update(i => i == targetInclude ? updatedInclude : i),
    });
}
function updatePageInPages(pages, targetPage, updatedPage) {
    return pages.update(p => {
        if (p == targetPage)
            return updatedPage;
        return p.update({
            includes: p.includes.update(i => i instanceof Library && i.page == targetPage
                ? updatePageInLibrary(i, targetPage, updatedPage)
                : i),
        });
    });
}
function updatePageInLibrary(library, targetPage, updatedPage) {
    const pageItems = library.items.length == library.page.items.length
        ? updatedPage.items.map(getItem)
        : updatedPage.items
            .map(i => { var _a; return (_a = library.pageItems) === null || _a === void 0 ? void 0 : _a.find(t => t == getItem(i)); })
            .filter((i) => typeof i != "undefined");
    const contexts = targetPage.items.length == updatedPage.items.length
        ? updateContextInLibrary(library, targetPage, updatedPage)
        : updatedPage.items
            .map(i => { var _a; return (_a = library.contexts) === null || _a === void 0 ? void 0 : _a.find(c => c.pageItem == getItem(i)); })
            .filter((c) => typeof c != "undefined");
    return new Library(updatedPage, pageItems, contexts);
}
function updateContextInLibrary(library, targetPage, updatedPage) {
    return updatedPage.items
        .map((i, x) => {
        var _a;
        const ctx = (_a = library.contexts) === null || _a === void 0 ? void 0 : _a.find(c => c.pageItem == getItem(targetPage.items[x]));
        return ctx ? { pageItem: i, context: ctx.context } : undefined;
    })
        .filter((c) => typeof c != "undefined");
}
function updateItemInCrossRules(crossRules, targetItem, updatedItem) {
    return crossRules.update(r => isamplemInRule(r, targetItem)
        ? updateItemInRule(r, targetItem, updatedItem)
        : r);
}
function deleteItemInCrossRules(crossRules, targetItem) {
    return crossRules.delete(cr => cr.pageItems.some(pi => getScopedItem(pi) == targetItem));
}
function isamplemInRule(rule, targetItem) {
    return rule.pageItems.map(getScopedItem).includes(targetItem);
}
function updateItemInRule(rule, targetItem, updatedItem) {
    return new CrossItemRule(rule.pageItems.update(i => updateItemInScope(i, targetItem, updatedItem)), Rules.create(Object.assign({ name: rule.name }, rule.args)), rule.when);
}
function updateItemInScope(item, targetItem, updatedItem) {
    return item == targetItem
        ? updatedItem
        : getScopedItem(item) == targetItem
            ? [updatedItem, getScope(item)]
            : item;
}
function updatePageSetsInWorkflows(workflows, targetPageSets, updatedPageSets) {
    return workflows.update(w => updatePageSetsInWorkflow(w, targetPageSets, updatedPageSets));
}
function removePageSetInWorkflows(workflows, targetPageSet) {
    return workflows.update(w => removePageSetInWorkflow(w, targetPageSet));
}
function removePageSetInWorkflow(w, targetPageSet) {
    const info = w.info && w.info == targetPageSet ? { info: undefined } : { info: w.info };
    const many = removePageSetInPageSets(w.many, targetPageSet);
    const single = removePageSetInPageSets(w.single, targetPageSet);
    const sequence = removePageSetInPageSets(w.sequence, targetPageSet);
    const stop = removePageSetInPageSets(w.stop, targetPageSet);
    return w.update(Object.assign(Object.assign({}, info), { many,
        single,
        sequence,
        stop }));
}
function removePageSetInPageSets(pageSets, targetPageSet) {
    return pageSets.reduce((acc, ps) => (ps != targetPageSet ? acc.concat(ps) : acc), DomainCollection());
}
function updatePageSetsInWorkflow(w, targetPageSets, updatedPageSets) {
    const info = w.info
        ? { info: updatePageSet(w.info, targetPageSets, updatedPageSets) }
        : {};
    const many = updatePageSetInPageSets(w.many, targetPageSets, updatedPageSets);
    const one = updatePageSetInPageSets(w.single, targetPageSets, updatedPageSets);
    const startsWith = updatePageSetInPageSets(w.sequence, targetPageSets, updatedPageSets);
    const endsWith = updatePageSetInPageSets(w.stop, targetPageSets, updatedPageSets);
    return w.update(Object.assign(Object.assign({}, info), { many, single: one, sequence: startsWith, stop: endsWith }));
}
function updatePageSetInPageSets(pageSets, targetPageSets, updatedPageSets) {
    return pageSets.map(s => updatePageSet(s, targetPageSets, updatedPageSets));
}
function updatePageSet(pageSet, targetPageSets, updatedPageSets) {
    return updatedPageSets[targetPageSets.indexOf(pageSet)];
}
function insertPageSetInSurvey(survey, targetPageSet, index, page) {
    const updatedPageSet = insertPageInPageSet(targetPageSet, index, page);
    const pageSets = survey.pageSets.update(s => s == targetPageSet ? updatedPageSet : s);
    const workflows = updatePageSetsInWorkflows(survey.workflows, survey.pageSets, pageSets);
    return { pageSets, workflows };
}
function insertPageInPages(survey, page) {
    return survey.pages.append(page);
}
function insertPageInPageSet(targetPageSet, index, page) {
    return targetPageSet.update({
        pages: DomainCollection(...targetPageSet.pages.slice(0, index), page, ...targetPageSet.pages.slice(index)),
    });
}
function deletePageInOnePageSet(survey, targetPageSet, targetPage) {
    const pageSet = deletePageInPageSet(targetPageSet, targetPage);
    const { pageSets, workflows } = updatePageSetInSurvey(survey, targetPageSet, pageSet);
    return { pageSets, workflows };
}
function deletePageInPageSet(targetPageSet, targetPage) {
    return targetPageSet.update({
        pages: targetPageSet.pages.delete(page => page == targetPage),
    });
}

class MutableParticipant {
    constructor(value) {
        this.value = value;
        return DomainProxy(this, value);
    }
    update(kwargs) {
        this.value = this.value.update(kwargs);
        return this;
    }
    updateItem(item) {
        return this.updateItems(DomainCollection(item));
    }
    updateItems(items) {
        const interviews = this.interviews.update(i => this.updateItemsInInterview(i, items));
        return this.update({ interviews });
    }
    updatePageSet(pageSet) {
        return this.updatePageSets(DomainCollection(pageSet));
    }
    updatePageSets(pageSets) {
        const interviews = this.interviews.update(i => {
            const pageSet = pageSets.find(p => this.samePageSet(i.pageSet, p, i.options));
            return pageSet ? i.update({ pageSet }) : i;
        });
        return this.update({ interviews });
    }
    insertItem(item) {
        return this.insertItems(DomainCollection(item));
    }
    insertItems(items) {
        const interviewItems = items.map(i => i instanceof InterviewItem ? i : new InterviewItem(getItem(i), undefined));
        const interviews = this.interviews.update(i => this.insertItemsInInterview(i, interviewItems.filter(t => this.interviewHasamplem(i, t))));
        return this.update({ interviews });
    }
    insertPageSet(pageSet, options) {
        return this.insertPageSets(DomainCollection(pageSet), options);
    }
    insertPageSets(pageSets, options) {
        const interviews = this.interviews.append(...this.insertInterviews(pageSets, options));
        return this.update({ interviews });
    }
    deleteItem(item) {
        return this.deleteItems(DomainCollection(item));
    }
    deleteItems(items) {
        const interviews = this.interviews.update(i => this.deleteItemsInInterview(i, items));
        return this.update({ interviews });
    }
    deletePageSet(pageSet) {
        return this.deletePageSets(DomainCollection(pageSet));
    }
    deletePageSets(pageSets) {
        const interviews = this.interviews.delete(i => pageSets.some(p => this.samePageSet(i.pageSet, p, i.options)));
        return this.update({ interviews });
    }
    updateItemsInInterview(interview, items) {
        return interview.update({
            items: interview.items.update(t => {
                const item = items.find(i => this.sameItem(t, i));
                return item ? this.updateItemInInterviewItem(t, item) : t;
            }),
        });
    }
    updateItemInInterviewItem(interviewItem, item) {
        return item instanceof InterviewItem
            ? item
            : interviewItem.update({ pageItem: getItem(item) });
    }
    insertItemsInInterview(interview, interviewItems) {
        return interview.update({
            items: interview.items.concat(interviewItems),
        });
    }
    insertInterviews(pageSets, options) {
        return pageSets.map(pageSet => this.insertInterview(pageSet, options));
    }
    insertInterview(pageSet, options) {
        return new Interview(pageSet, options, {
            items: pageSet.items.map(i => new InterviewItem(getItem(i), undefined)),
        });
    }
    deleteItemsInInterview(i, items) {
        return items.reduce((i, t) => this.deleteItemInInterview(i, t), i);
    }
    deleteItemInInterview(interview, item) {
        return interview.update({
            items: interview.items.delete(t => this.sameItem(t, item)),
        });
    }
    sameItem(i1, i2) {
        return getItem(i1).variableName == getItem(i2).variableName;
    }
    samePageSet(ps1, ps2, options) {
        return (getTranslation(ps1.type, "__code__", options.defaultLang) ==
            getTranslation(ps2.type, "__code__", options.defaultLang));
    }
    interviewHasamplem(interview, item) {
        return (!interview.items.some(tt => this.sameItem(tt, item)) &&
            interview.pageSet.items.some(tt => this.sameItem(tt, item)));
    }
}

class Row {
    constructor(participant, interview, source, ...prepend) {
        this.participant = participant;
        this.interview = interview;
        this.participantCode = participant.participantCode;
        this.nonce = interview.nonce;
        const page = source instanceof Page ? source : source.page;
        const instance = source instanceof Page ? 1 : source.instance;
        this.elements = [
            ...prepend,
            interview.date,
            ...page.items
                .filter(i => isExported(i))
                .map(i => interview.getItemForVariable(getItem(i).variableName, instance))
                .reduce((res, i) => {
                var _a;
                const units = i ? getItemUnits(i) : [];
                return res.concat(units.length > 0
                    ? [
                        Row.format(interview, page, i),
                        ((_a = i === null || i === void 0 ? void 0 : i.unit) !== null && _a !== void 0 ? _a : units.length == 1) ? units[0] : "",
                    ]
                    : Row.format(interview, page, i));
            }, []),
        ];
    }
    static format(interview, page, item) {
        if ((item === null || item === void 0 ? void 0 : item.pageItem.array) && !page.array)
            return Row.formatArray(item, interview);
        return Row.formatSingle(item);
    }
    static formatArray(item, interview) {
        const result = [Row.formatSingle(item)];
        while (interview.hasNextInstance(item)) {
            item = interview.nextInstance(item);
            result.push(Row.formatSingle(item));
        }
        return JSON.stringify(result);
    }
    static formatSingle(item) {
        if (typeof (item === null || item === void 0 ? void 0 : item.value) == "undefined")
            return item === null || item === void 0 ? void 0 : item.specialValue;
        return item.type.rawValue(item.value);
    }
}
class RowSet {
    constructor(participant, page, options) {
        this.participant = participant;
        this.rows = [
            ...participant.interviews
                .filter(i => i.pageSet.pages.includes(page))
                .flatMap((i, x) => this.getRows(participant, i, page, x, options)),
        ];
        this.header = getHeader(page, options === null || options === void 0 ? void 0 : options.unitSuffix);
    }
    getRows(participant, interview, page, x, options) {
        const code = getTranslation(interview.pageSet.type, "__code__", options === null || options === void 0 ? void 0 : options.defaultLang);
        if (!page.array)
            return [
                new Row(participant, interview, page, participant.sample.sampleCode, formatCode(participant, options), x, code),
            ];
        const count = Math.max(...interview.getItemsForPage(page).map(i => i.pageItem.instance));
        const rows = new Array();
        for (let instance = 1; instance <= count; instance++)
            rows.push(new Row(participant, interview, { page, instance }, participant.sample.sampleCode, formatCode(participant, options), x, code, instance));
        return rows;
    }
    union(other) {
        const header = unionHeader(this.header, other.header);
        const rows = this.mapToHeader(header).concat(other.mapToHeader(header, this.rows.length));
        const result = Object.create(RowSet.prototype);
        return Object.assign(result, { rows, header });
    }
    mapToHeader(header, offset = 0) {
        return this.rows.map((r, x) => {
            const elements = header.map(h => {
                const i = this.header.indexOf(h);
                return i > -1 ? (i == 2 ? offset + x : r.elements[i]) : undefined;
            });
            const row = Object.create(Row.prototype);
            return Object.assign(row, Object.assign(Object.assign({}, r), { elements }));
        });
    }
}
class Table {
    constructor(participants, page, options) {
        var _a, _b;
        this.participants = participants;
        this.rowSets = [].concat(...participants.map(p => new RowSet(p, page, options)));
        this.name =
            (_b = (_a = page.exportConfig) === null || _a === void 0 ? void 0 : _a.fileName) !== null && _b !== void 0 ? _b : getTranslation(page.name, "__code__", options === null || options === void 0 ? void 0 : options.defaultLang);
        this.header = getHeader(page, options === null || options === void 0 ? void 0 : options.unitSuffix);
    }
    zip(other) {
        const header = unionHeader(this.header, other.header);
        const rowSets = this.rowSets.map((s, i) => s.union(other.rowSets[i]));
        const result = Object.create(Table.prototype);
        return Object.assign(result, {
            participants: this.participants,
            rowSets,
            name: this.name,
            header,
        });
    }
    get rows() {
        return [].concat(...this.rowSets.map(r => r.rows));
    }
}
class SurveyTableSet {
    constructor(survey, participants, lang = survey.options.defaultLang) {
        this.survey = survey;
        this.participants = participants;
        this.locale = lang;
        const pages = this.getPages();
        const tables = pages.map(p => new Table(this.participants, p, Object.assign(Object.assign({}, this.survey.options), { defaultLang: lang })));
        this.tables = this.zipSets(tables);
        this.name = survey.name;
    }
    getPages() {
        const sets = this.survey.pageSets.reduce((s, p) => new Set([...s, ...p.pages]), new Set());
        return [...sets];
    }
    zipSets(tables) {
        const sets = tables.reduce((m, t) => {
            var _a;
            if (m.has(t.name))
                (_a = m.get(t.name)) === null || _a === void 0 ? void 0 : _a.push(t);
            else
                m.set(t.name, [t]);
            return m;
        }, new Map());
        return [...sets.values()].map(a => a.reduce((b, t) => b.zip(t)));
    }
}
function getHeader(page, unitSuffix) {
    return [
        "SAMPLECODE",
        "PATCODE",
        "OCCURRENCE",
        "VTYPE",
        ...(page.array ? ["RECORD"] : []),
        "VDATE",
        ...page.items
            .filter(i => getItemType(i).name != "info" &&
            getItem(i).variableName != "VDATE" &&
            isExported(i))
            .reduce((res, i) => {
            var _a;
            const item = getItem(i);
            return res.concat(((_a = item.units) === null || _a === void 0 ? void 0 : _a.values.length) > 0
                ? [
                    item.variableName,
                    `${item.variableName}${unitSuffix !== null && unitSuffix !== void 0 ? unitSuffix : "_UNIT"}`,
                ]
                : item.variableName);
        }, []),
    ];
}
function unionHeader(header0, header1) {
    return header0.concat(header1.filter(h => !header0.includes(h)));
}
function isExported(i) {
    return (getItemType(i).name != "info" &&
        getItem(i).variableName != "VDATE" &&
        !/^__.+/.test(getItem(i).variableName));
}

export { AcknowledgeType, CategoricalDistribution, CheckAlert, ChoiceType, ComputedParser, ContextType, CountryType, CrossItemRule, CrossRuleBuilder, DateType, DomainCollection, DomainCollectionImpl, DomainProxy, GlobalScope, GlossaryType, ImageType, InclusionsBySamples, InfoType, IntegerType, Interview, InterviewBuilder, InterviewItem, InterviewItemBuilder, ItemTypes, KPISet, Library, LibraryBuilder, Macros, Metadata, MutableParticipant, MutableSurvey, NumericalDistribution, Page, PageBuilder, PageItem, PageItemBuilder, PageSet, PageSetBuilder, Participant, ParticipantBuilder, QueryAlert, RealType, RuleAlert, Rules, Sample, ScaleType, Scope, ScoreType, Survey, SurveyBuilder, SurveyOptions, SurveyTableSet, TextType, TimeType, User, Workflow, WorkflowBuilder, YesNoType, acknowledge, acknowledgeItem, acknowledgements, alerts, areMessagesEqual, builder, comparePrecedences, compareRules, execute, formatCode, getColumnSums, getItem, getItemContext, getItemMemento, getItemType, getItemUnits, getItemWording, getLastItems, getMessage, getRowSums, getRuleArgs, getScope, getScopedItem, getTranslation, getVariableName, globalItems, groupByPageSet, groupBySection, hasContext, hasFixedLabels, hasMemento, hasMessages, hasPivot, inDateItem, isAcknowledged, isComputed, isContextual, isCopy, isDomainProxy, isML, isMLstring, isMissing, isProxyEqual, isScopedItem, isVariableHidden, isamplem, isamplemMessages, isamplemType, limits, link, messageEntries, messageNames, parseComment, parseLayout, parseVariableName, parseVariableNames, reiterate, ruleSequence, sampleItem, setMessage, setMessageIf, setTranslation, status, thisYearItem, todayItem, undefinedItem, undefinedTag, unitToCrossRules, unsetMessage, update };
