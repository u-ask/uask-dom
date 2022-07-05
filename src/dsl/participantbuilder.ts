import {
  DomainCollection,
  IDomainCollection,
  Interview,
  Participant,
  Sample,
  Survey,
  PageSet,
} from "../domain/index.js";
import { getTranslation, merge, mlstring } from "../domain/domain.js";
import { InterviewBuilder } from "./interviewbuilder.js";

export class ParticipantBuilder {
  interviews: (Interview | InterviewBuilder)[] = [];
  participantCode = "";
  private participant: Participant | undefined;
  private samples?: IDomainCollection<Sample>;

  constructor(survey: Survey, samples?: IDomainCollection<Sample>);
  constructor(survey: Survey, participant?: Participant);
  constructor(survey: Survey, participantCode: string, sample: Sample);
  constructor(
    public survey: Survey,
    p?: Participant | string | IDomainCollection<Sample>,
    public sample?: Sample
  ) {
    if (typeof p == "string") this.participantCode = p;
    else if (p instanceof Participant) this.participant = p;
    else this.samples = p;
  }

  init(participantCode: string, sampleCode: string): ParticipantBuilder {
    this.sample = this.samples?.find(s => s.sampleCode == sampleCode);
    if (this.sample == undefined) throw `unknown sample ${sampleCode}`;
    this.participantCode = participantCode;
    return this;
  }

  interview(
    pageSet: PageSet,
    nonce?: number,
    lastInput?: Date
  ): InterviewBuilder;
  interview(
    pageSet: mlstring,
    nonce?: number,
    lastInput?: Date
  ): InterviewBuilder;
  interview(interview: Interview): this;
  interview(
    i: Interview | PageSet | mlstring,
    nonce?: number,
    lastInput?: Date
  ): this | InterviewBuilder {
    if (i instanceof Interview) {
      this.interviews.push(i);
      return this;
    } else if (!(i instanceof PageSet)) {
      const lang = this.survey.options.defaultLang;
      const typeName = getTranslation(i, "__code__", lang);
      const pageSet = this.survey.pageSets.find(
        p => getTranslation(p.type, "__code__", lang) == typeName
      );
      if (!pageSet) throw `unknown pageSet ${getTranslation(i, typeName)}`;
      i = pageSet;
    }
    const interview = this.participant?.interviews.find(
      w => w.pageSet == i && w.nonce == nonce
    );
    const builder = interview
      ? new InterviewBuilder(this.survey, interview)
      : new InterviewBuilder(this.survey, i);
    if (nonce) builder.init(nonce, lastInput ?? new Date());
    this.interviews.push(builder);
    return builder;
  }

  build(): Participant {
    const interviews: Interview[] = this.buildInterviews();
    if (typeof this.participant == "undefined")
      this.participant = new Participant(
        this.participantCode,
        this.sample as Sample,
        {
          interviews: DomainCollection(...interviews),
        }
      );
    else {
      this.participant = updateParticipant(
        this.participant,
        DomainCollection(...interviews)
      );
    }
    return this.participant;
  }

  private buildInterviews() {
    return this.interviews.reduce((result, i) => {
      const interview =
        i instanceof Interview ? i : this.buildInterview(i, result);
      return [...result, interview];
    }, <Interview[]>[]);
  }

  private buildInterview(i: InterviewBuilder, preceding: Interview[]) {
    const outer = this.participant
      ? [...this.participant.interviews, ...preceding]
      : preceding;
    return i.build(outer);
  }
}

function updateParticipant(
  current: Participant,
  interviews: IDomainCollection<Interview>
): Participant {
  const merged = merge(DomainCollection(...current.interviews), interviews)
    .on(
      (i1, i2) =>
        i1.pageSet == i2.pageSet && (i1.nonce == 0 || i1.nonce == i2.nonce)
    )
    .insertAll();
  return current.update({ interviews: merged });
}
