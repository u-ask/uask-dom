import {
  DomainCollection,
  IDomainCollection,
  Interview,
  PageSet,
} from "../domain/index.js";

type PIGroup = {
  pageSet: PageSet;
  interviews: IDomainCollection<Interview>;
};

export function groupByPageSet(
  interviews: IDomainCollection<Interview>
): IDomainCollection<PIGroup> {
  return interviews
    .reduce(groupSamePageSet, DomainCollection<PIGroup>())
    .map(sortInterviews);
}

function groupSamePageSet(
  result: IDomainCollection<PIGroup>,
  interview: Interview
): IDomainCollection<PIGroup> {
  const pageSet = interview.pageSet;
  if (result.find(r => r.pageSet == pageSet))
    return result.update(r =>
      r.pageSet == pageSet
        ? { pageSet, interviews: r.interviews.append(interview) }
        : r
    );
  return result.append({ pageSet, interviews: DomainCollection(interview) });
}

function sortInterviews(group: PIGroup): PIGroup {
  return {
    pageSet: group.pageSet,
    interviews: group.interviews.sort(
      (i, j) =>
        (i.date ? new Date(i.date)?.getTime() : 0) -
        (j.date ? new Date(j.date).getTime() : 0)
    ),
  };
}
