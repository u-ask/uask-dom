import { getTranslation, Page, Survey } from "../domain/index.js";
import { DNode } from "./abstracttree.js";

export function validate(root: DNode<Survey>, messages: string[]): void {
  const page1 = validateDatePagesExist(root, messages);
  if (page1.length > 0) {
    validatePageSetsHaveDate(root, page1, messages);
  }
}

export function validateDatePagesExist(
  root: DNode<Survey>,
  messages: string[]
): DNode<Page>[] {
  const page1 = root.pages.filter(p =>
    p.includes.find(
      q =>
        (Array.isArray(q) ? q[0] : q).variableName == root.config.interviewDateVar
    )
  );
  if (page1.length == 0) {
    messages.push(
      `question with pageSet date variable '${root.config.interviewDateVar}' is missing`
    );
  }
  return page1;
}

export function validatePageSetsHaveDate(
  root: DNode<Survey>,
  page1: DNode<Page>[],
  messages: string[]
): void {
  const errors = root.pageSets
    .filter(
      v =>
        v.pageNames.length == 0 ||
        !page1.find(
          p =>
            getTranslation(p.name, "__code__", root.config.defaultLang) ==
            v.pageNames[0]
        )
    )
    .map(
      v =>
        `pageSet '${getTranslation(
          v.type,
          "__code__",
          root.config.defaultLang
        )}' must have first page with pageSet date`
    );
  messages.push(...errors);
}
