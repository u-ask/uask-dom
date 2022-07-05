import { getLastItems, Interview } from "./interview.js";
import { Sample } from "./sample.js";
import { DomainCollection } from "./domaincollection.js";
import { Domain } from "./domain.js";
import { IDomainCollection } from "./domaincollectiondef.js";
import { InterviewItem } from "./interviewitem.js";
import { PageItem } from "./pageitem.js";
import { PageSet } from "./pageSet.js";
import { Workflow } from "./workflow.js";
import { Alert } from "./alert.js";
import { SurveyOptions } from "./survey.js";

export class Participant {
  readonly participantCode: string;
  readonly sample: Sample;
  readonly interviews = DomainCollection<Interview>();

  constructor(
    participantCode: string,
    sample: Sample,
    kwargs?: Partial<Participant>
  ) {
    this.participantCode = participantCode;
    this.sample = sample;
    Object.assign(this, kwargs);
    Domain.extend(this);
  }

  get inclusionDate(): Date | undefined {
    return this.interviews.find(i => i.included)?.date;
  }

  get firstDate(): Date | undefined {
    const minTime = Math.min(
      ...this.interviews.map(i => i.date?.getTime() ?? Infinity)
    );
    return isFinite(minTime) ? new Date(minTime) : undefined;
  }

  currentInterview(workflow: Workflow): Interview {
    const available = this.availableInterviews(workflow);
    const currentinterview =
      available.find(interview => interview.status == "insufficient") ??
      available.find(interview => interview.status == "incomplete");
    if (currentinterview != undefined) return currentinterview;
    return available[available.length - 1];
  }

  get lastInput(): Date {
    return this.interviews.reduce((acc: Date, interview) => {
      return acc > interview.lastInput ? acc : interview.lastInput;
    }, new Date(0));
  }

  get workflow(): string | undefined {
    return this.interviews.reduce(
      (w, i) => i.workflow ?? w,
      undefined as string | undefined
    );
  }

  get included(): boolean {
    return this.interviews.some(i => i.included);
  }

  getValues(...pageItems: PageItem<"prototype">[]): IDomainCollection<unknown> {
    return this.currentItems(DomainCollection(...pageItems)).map(i => i?.value);
  }

  currentItems(
    pageItems: IDomainCollection<PageItem<"prototype">>,
    interview?: Interview
  ): IDomainCollection<InterviewItem | undefined> {
    const interviews = this.soFar(interview);
    return getLastItems(interviews, pageItems);
  }

  private soFar(interview: Interview | undefined) {
    return interview == undefined
      ? this.interviews
      : this.interviews.takeWhile(i => i != interview);
  }

  get alerts(): IDomainCollection<Alert> {
    return this.interviews.reduce(
      (r, i) => r.append(...i.alerts),
      DomainCollection()
    );
  }

  availablePageSets(workflow: Workflow): IDomainCollection<PageSet> {
    if (this.currentInterview(workflow)?.status == "insufficient")
      return DomainCollection();
    return workflow.available(...this.interviews.map(i => i.pageSet));
  }

  availableInterviews(workflow: Workflow): IDomainCollection<Interview> {
    return this.interviews.filter(i => workflow.pageSets.includes(i.pageSet));
  }

  next(
    workflow: Workflow,
    interview: Interview
  ): Interview | PageSet | undefined {
    const sofar = [
      ...this.soFar(interview).map(i => i.pageSet),
      interview.pageSet,
    ];
    const nextPageSet = workflow.next(...sofar);
    if (nextPageSet == undefined) return undefined;
    if (sofar.length == this.interviews.length) return nextPageSet;
    if (this.interviews[sofar.length].pageSet == nextPageSet)
      return this.interviews[sofar.length];
    return undefined;
  }

  first(workflow: Workflow): PageSet {
    return workflow.first;
  }

  update(kwargs: Partial<Participant>): Participant {
    return Domain.update(this, kwargs, [
      Participant,
      this.participantCode,
      this.sample,
    ]);
  }
}

export function formatCode(
  participant: Pick<Participant, "participantCode">,
  options?: SurveyOptions
): string {
  const len = options?.participantCodeStrategy?.length ?? 5;
  return participant.participantCode.slice(-len);
}
