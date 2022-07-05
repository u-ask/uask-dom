import test from "tape";
import {
  getMainSymbols as getSymbols,
  matchTableItem,
  parseLayout,
  parseSection,
  parseSingleItem,
  parseTableItem,
  parseTable,
  parseRichItem,
  ItemContent,
  matchRecordsetItem,
  parseRecordsetItem,
  parseRecordset,
  RecordsetContent,
} from "./layout.js";
import { ItemTypes } from "../domain/itemtypes.js";
import {
  DomainCollection,
  getItem,
  InterviewItem,
  Library,
  Page,
  PageItem,
} from "../domain/index.js";

test("Get item symbols", t => {
  const pageItem = new PageItem("Single item", "VAR", ItemTypes.yesno, {
    section: "this is a section",
    comment: "(comment){.class1.class2}",
  });
  const [s1, s2] = getSymbols(
    { sections: DomainCollection(), getSymbols },
    pageItem
  );
  t.equal(s1.symbol, "section");
  t.equal(s1.title, "this is a section");
  t.equal(s2.symbol, "item");
  t.deepEquals(s2.classes, ["class1", "class2"]);
  t.end();
});

test("Match array symbols", t => {
  t.deepEqual(matchTableItem("row 1 -> col 2"), {
    symbol: "tableItem",
    wording: "row 1",
    column: "col 2",
  });
  t.deepEqual(
    matchTableItem({ en: "row 1 -> col 2", fr: "ligne 1 -> col 2" }),
    {
      symbol: "tableItem",
      wording: { en: "row 1", fr: "ligne 1" },
      column: { en: "col 2", fr: "col 2" },
    }
  );
  t.end();
});

test("Get array symbols", t => {
  const pageItem = new PageItem("row -> column", "VAR", ItemTypes.yesno, {
    comment: "(comment){.class1.class2}",
  });
  const [s1, s2, s3] = getSymbols(
    { sections: DomainCollection(), getSymbols },
    pageItem
  );
  t.equal(s1.symbol, "section");
  t.equal(s1.title, "");
  t.equal(s2.symbol, "table");
  t.equal(s3.symbol, "tableItem");
  t.equal(s3.wording, "row");
  t.equal(s3.column, "column");
  t.deepEquals(s3.classes, ["class1", "class2"]);
  t.end();
});

test("Parse section", t => {
  const layout = parseSection(
    { sections: DomainCollection(), getSymbols },
    "this is a section"
  ).sections;
  t.equal(layout[0].title, "this is a section");
  t.end();
});

test("Parse single item", t => {
  let layout = parseSection(
    { sections: DomainCollection(), getSymbols },
    "this is a section"
  );
  const item = {
    pageItem: new PageItem("", "", ItemTypes.yesno, { comment: "(comment)" }),
    context: 0,
  };
  layout = parseSingleItem(layout, item, "", "comment", []);
  t.deepEqual(layout.sections[0].content, [
    {
      behavior: "item",
      item,
      labels: { comment: "comment", wording: item.pageItem.wording },
      modifiers: { classes: [] },
    },
  ]);
  t.end();
});

test("Parse table", t => {
  let layout = parseSection(
    { sections: DomainCollection(), getSymbols },
    "this is a section"
  );
  const item1 = { pageItem: new PageItem("", "", ItemTypes.yesno), context: 0 };
  layout = parseTable(layout);
  layout = parseTableItem(layout, item1, "row 1", "col 1", []);
  t.deepEqual(layout.sections[0].content[0], {
    behavior: "table",
    columns: ["col 1"],
    items: [
      { wording: "row 1", row: [{ item: item1, modifiers: { classes: [] } }] },
    ],
  });
  t.end();
});

test("Composample page with context grouped by section", t => {
  const type0 = ItemTypes.yesno;
  const type1 = ItemTypes.choice("one", "1", "2", "3");
  const pageItem = new PageItem(
    "Symptom ?",
    "SYM",
    ItemTypes.context([type0, type1]),
    { section: "group" }
  );
  const page1 = new Page("Included", { includes: DomainCollection(pageItem) });
  const page2 = new Page("Composample", {
    includes: DomainCollection(
      new Library(page1, undefined, DomainCollection({ pageItem, context: 1 }))
    ),
  });
  const items = page2.items.map(p => ({ pageItem: getItem(p), context: 0 }));
  const groups = parseLayout(items);
  t.deepLooseEqual(groups, [
    {
      title: "group",
      content: items.map(item => ({
        behavior: "item",
        item,
        labels: { comment: undefined, wording: "Symptom ?" },
        modifiers: { classes: undefined },
      })),
    },
  ]);
  t.end();
});

test("Page item grouped by section", t => {
  const q1 = { pageItem: new PageItem("", "", ItemTypes.text), context: 0 };
  const q2 = { pageItem: new PageItem("", "", ItemTypes.text), context: 0 };
  const q3 = {
    pageItem: new PageItem("", "", ItemTypes.text, { section: "1" }),
    context: 0,
  };
  const q4 = {
    pageItem: new PageItem("", "", ItemTypes.text, { section: "1" }),
    context: 0,
  };
  const q5 = {
    pageItem: new PageItem("", "", ItemTypes.text, { section: "2" }),
    context: 0,
  };
  const q6 = {
    pageItem: new PageItem("", "", ItemTypes.text, { section: "2" }),
    context: 0,
  };
  const coll = DomainCollection(q1, q2, q3, q4, q5, q6);
  const s = parseLayout(coll);
  const toi = (q: { pageItem: PageItem }) => ({
    behavior: "item",
    item: q,
    labels: { comment: undefined, wording: q.pageItem.wording },
    modifiers: { classes: undefined },
  });
  t.deepLooseEqual(s[0], { title: "", content: [q1, q2].map(toi) });
  t.deepLooseEqual(s[1], { title: "1", content: [q3, q4].map(toi) });
  t.deepLooseEqual(s[2], { title: "2", content: [q5, q6].map(toi) });
  t.end();
});

test("Page items grouped by arrays", t => {
  const q1 = {
    pageItem: new PageItem("", "", ItemTypes.text, { section: "1" }),
    context: 0,
  };
  const q2 = {
    pageItem: new PageItem(
      { en: "row 1 -> column 1", fr: "ligne 1 -> colonne 1" },
      "",
      ItemTypes.text,
      {
        section: "1",
      }
    ),
    context: 0,
  };
  const q3 = {
    pageItem: new PageItem(
      { en: "row 1 -> column 2", fr: "ligne 1 -> colonne 2" },
      "",
      ItemTypes.text,
      {
        section: "1",
      }
    ),
    context: 0,
  };
  const q4 = {
    pageItem: new PageItem(
      { en: "row 2 -> column 2", fr: "ligne 2 -> colonne 2" },
      "",
      ItemTypes.text,
      {
        section: "1",
      }
    ),
    context: 0,
  };
  const q5 = {
    pageItem: new PageItem(
      { en: "row 3 -> column 1", fr: "ligne 3 -> colonne 1" },
      "",
      ItemTypes.text,
      {
        section: "1",
      }
    ),
    context: 0,
  };
  const q6 = {
    pageItem: new PageItem(
      { en: "row 3 -> column 2", fr: "ligne 3 -> colonne 2" },
      "",
      ItemTypes.text,
      {
        section: "1",
      }
    ),
    context: 0,
  };
  const q7 = {
    pageItem: new PageItem("", "", ItemTypes.text, { section: "1" }),
    context: 0,
  };
  const coll = DomainCollection(q1, q2, q3, q4, q5, q6, q7);
  const s = parseLayout(coll);
  const expected = [
    {
      title: "1",
      content: [
        {
          behavior: "item",
          item: q1,
          labels: { comment: undefined, wording: q1.pageItem.wording },
          modifiers: { classes: undefined },
        },
        {
          behavior: "table",
          columns: [
            { en: "column 1", fr: "colonne 1" },
            { en: "column 2", fr: "colonne 2" },
          ],
          items: [
            {
              wording: { en: "row 1", fr: "ligne 1" },
              row: [
                {
                  item: q2,
                  modifiers: { classes: undefined },
                },
                {
                  item: q3,
                  modifiers: { classes: undefined },
                },
              ],
            },
            {
              wording: { en: "row 2", fr: "ligne 2" },
              row: [
                null,
                {
                  item: q4,
                  modifiers: { classes: undefined },
                },
              ],
            },
            {
              wording: { en: "row 3", fr: "ligne 3" },
              row: [
                {
                  item: q5,
                  modifiers: { classes: undefined },
                },
                {
                  item: q6,
                  modifiers: { classes: undefined },
                },
              ],
            },
          ],
        },
        {
          behavior: "item",
          item: q7,
          labels: { comment: undefined, wording: q1.pageItem.wording },
          modifiers: { classes: undefined },
        },
      ],
    },
  ];
  t.deepLooseEqual(s, expected);
  t.end();
});

test("Parse contextual wording", t => {
  const pageItem = new PageItem(["W1", "W2 -> A"], "V", ItemTypes.yesno);
  const p1 = parseLayout(DomainCollection({ pageItem, context: 0 }));
  t.equal(p1[0].content[0].behavior, "item");
  const p2 = parseLayout(DomainCollection({ pageItem, context: 1 }));
  t.equal(p2[0].content[0].behavior, "table");
  t.end();
});

test("Parse with multiple reference to equivalent mlstring", t => {
  const items = DomainCollection(
    new InterviewItem(
      new PageItem("Q1", "Q1", ItemTypes.integer, { section: { en: "S" } }),
      1
    ),
    new InterviewItem(
      new PageItem("Q2", "Q2", ItemTypes.text, { section: { en: "S" } }),
      "A"
    )
  );
  const layout = parseLayout(items);
  t.equal(layout.length, 1);
  t.end();
});

test("Match rich item", t => {
  const pageItem = new PageItem("I am rich", "RICH", ItemTypes.scale(1, 5), {
    comment: "<small | big>{.row.class2}",
  });
  const [s1, s2] = getSymbols(
    { sections: DomainCollection(), getSymbols },
    pageItem
  );
  t.equal(s1.symbol, "section");
  t.equal(s1.title, "");
  t.equal(s2.symbol, "richItem");
  t.equal(s2.leftWording, "small");
  t.equal(s2.rightWording, "big");
  t.equal(s2.wording, "I am rich");
  t.deepEquals(s2.classes, ["row", "class2"]);
  t.end();
});

test("Parse rich item", t => {
  let layout = parseSection(
    { sections: DomainCollection(), getSymbols },
    "this is a section"
  );
  const pageItem = new PageItem("I am rich", "RICH", ItemTypes.scale(1, 5), {
    comment: "<small | big>{.row.class2}",
  });
  const item = { pageItem, context: 0 };
  layout = parseRichItem(layout, item, "I am rich", "small", "big", "", [
    "row",
    "class2",
  ]);
  t.deepEqual(layout.sections[0].content, [
    {
      behavior: "richItem",
      labels: {
        leftWording: "small",
        rightWording: "big",
        comment: "",
        wording: "I am rich",
      },
      modifiers: {
        classes: ["row", "class2"],
      },
      item,
    },
  ]);
  t.end();
});

test("Parse layout with rich item", t => {
  const items = DomainCollection(
    new InterviewItem(
      new PageItem("Single", "Q1", ItemTypes.integer, { section: { en: "S" } }),
      1
    ),
    new InterviewItem(
      new PageItem("Rich", "Q2", ItemTypes.text, {
        section: { en: "S" },
        comment: "<l | r>",
      }),
      "A"
    )
  );
  const layout = parseLayout(items);
  t.equal(layout.length, 1);
  t.equal(layout[0].content.length, 2);
  t.equal(layout[0].content[0].behavior, "item");
  t.equal(layout[0].content[1].behavior, "richItem");
  t.end();
});

test("Parse layout with single item", t => {
  const items = DomainCollection(
    new InterviewItem(
      new PageItem("Q1", "Q1", ItemTypes.integer, {
        comment: "(comment) {.class1.class2}",
      }),
      1
    )
  );
  const layout = parseLayout(items);
  const contentLayout = layout[0].content[0] as ItemContent<InterviewItem>;
  t.deepEquals(contentLayout.behavior, "item");
  t.deepEquals(contentLayout.labels, { comment: "comment", wording: "Q1" });
  t.deepEquals(contentLayout.modifiers, { classes: ["class1", "class2"] });
  t.end();
});

test("Match recordset string wording", t => {
  const s = matchRecordsetItem(" -> column");
  t.equal(s?.symbol, "recordItem");
  t.equal(s?.column, "column");
  t.end();
});

test("Match recordset mlstring wording", t => {
  const s = matchRecordsetItem({ en: " -> column", fr: " -> colonne" });
  t.equal(s?.symbol, "recordItem");
  t.deepEqual(s?.column, { en: "column", fr: "colonne" });
  t.end();
});

test("Match recordset #168", t => {
  const pageItem = new PageItem(" -> column", "COL", ItemTypes.scale(1, 5), {
    comment: "{.c1.c2}",
    section: "recordset",
    array: true,
  }).nextInstance();
  const [s1, s2, s3] = getSymbols(
    { sections: DomainCollection(), getSymbols },
    pageItem
  );
  t.equal(s1.symbol, "section");
  t.equal(s1.title, "recordset");
  t.equal(s2.symbol, "recordset");
  t.equal(s3.symbol, "recordItem");
  t.equal(s3.column, "column");
  t.deepEquals(s3.classes, ["c1", "c2"]);
  t.end();
});

test("Parse recordset #168", t => {
  let layout = parseSection(
    { sections: DomainCollection(), getSymbols },
    "this is a section"
  );
  layout = parseRecordset(layout);
  t.deepEqual(layout.sections[0], {
    title: "this is a section",
    content: [{ behavior: "recordset", columns: [], items: [] }],
  });
  t.end();
});

test("Parse recordset item #168", t => {
  let layout = parseSection(
    { sections: DomainCollection(), getSymbols },
    "this is a section"
  );
  layout = parseRecordset(layout);
  const pageItem = new PageItem(" -> column", "COL", ItemTypes.scale(1, 5), {
    comment: "{.c1.c2}",
    section: "recordset",
    array: true,
  });
  const item = { pageItem, context: 0 };
  layout = parseRecordsetItem(layout, item, "column", ["c1", "c2"]);
  t.deepEqual(layout.sections[0].content[0], {
    behavior: "recordset",
    columns: [{ wording: "column", modifiers: { classes: ["c1", "c2"] } }],
    items: [
      [
        {
          behavior: "item",
          item: item,
          labels: { comment: undefined, wording: "column" },
          modifiers: { classes: ["c1", "c2"] },
        },
      ],
    ],
  });
  t.end();
});

test("Layout recordset #168", t => {
  const section = "recordset";
  const pageItem1 = new PageItem(" -> col1", "COL1", ItemTypes.text, {
    section,
    array: true,
  });
  const pageItem2 = new PageItem(" -> col2", "COL2", ItemTypes.text, {
    section,
    array: true,
  });
  const item1a = new InterviewItem(pageItem1, "A1");
  const item2a = new InterviewItem(pageItem2, "A2");
  const item1b = new InterviewItem(pageItem1.nextInstance(), "B1");
  const item2b = new InterviewItem(pageItem2.nextInstance(), "B2");
  const items = DomainCollection(item1a, item1b, item2a, item2b);
  const layout = parseLayout(items);
  t.deepEqual(layout[0], {
    title: "recordset",
    content: [
      {
        behavior: "recordset",
        columns: [
          { wording: "col1", modifiers: { classes: undefined } },
          { wording: "col2", modifiers: { classes: undefined } },
        ],
        items: [
          [
            {
              behavior: "item",
              item: item1a,
              labels: { comment: undefined, wording: "col1" },
              modifiers: { classes: undefined },
            },
            {
              behavior: "item",
              item: item2a,
              labels: { comment: undefined, wording: "col2" },
              modifiers: { classes: undefined },
            },
          ],
          [
            {
              behavior: "item",
              item: item1b,
              labels: { comment: undefined, wording: "col1" },
              modifiers: { classes: undefined },
            },
            {
              behavior: "item",
              item: item2b,
              labels: { comment: undefined, wording: "col2" },
              modifiers: { classes: undefined },
            },
          ],
        ],
      },
    ],
  });
  t.end();
});

test("Parse recordset item #176", t => {
  let layout = parseSection(
    { sections: DomainCollection(), getSymbols },
    "this is a section"
  );
  layout = parseRecordset(layout);
  const pageItem = new PageItem(" -> column", "COL", ItemTypes.scale(1, 5), {
    comment: "(comment){.c1.c2}",
    section: "recordset",
    array: true,
  });
  const item = { pageItem, context: 0 };
  layout = parseRecordsetItem(layout, item, "column", ["c1", "c2"]);
  t.deepEqual(layout.sections[0].content[0], {
    behavior: "recordset",
    columns: [{ wording: "column", modifiers: { classes: ["c1", "c2"] } }],
    items: [
      [
        {
          behavior: "item",
          item: item,
          labels: { comment: "comment", wording: "column" },
          modifiers: { classes: ["c1", "c2"] },
        },
      ],
    ],
  });
  t.end();
});

test("Layout recordset with nested tables #168", t => {
  const section = "recordset";
  const pageItem1 = new PageItem(" -> row -> col1", "COL1", ItemTypes.text, {
    section,
    array: true,
  });
  const pageItem2 = new PageItem(" -> row -> col2", "COL2", ItemTypes.text, {
    section,
    array: true,
  });
  const item1a = new InterviewItem(pageItem1, "A1");
  const item2a = new InterviewItem(pageItem2, "A2");
  const item1b = new InterviewItem(pageItem1.nextInstance(), "B1");
  const item2b = new InterviewItem(pageItem2.nextInstance(), "B2");
  const items = DomainCollection(item1a, item1b, item2a, item2b);
  const layout = parseLayout(items);
  t.equal(layout[0].title, "recordset");
  const recordset = layout[0].content[0] as RecordsetContent<InterviewItem>;
  t.equal(recordset.items[0][0].behavior, "table");
  t.equal(recordset.items[0][0], recordset.items[0][1]);
  t.equal(recordset.items[1][0].behavior, "table");
  t.equal(recordset.items[1][0], recordset.items[1][1]);
  t.end();
});
