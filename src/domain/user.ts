import { Domain } from "./domain.js";
import { DomainCollection } from "./domaincollection.js";
import { IDomainCollection } from "./domaincollectiondef.js";
import { PageItem } from "./pageitem.js";
import { Participant } from "./participant.js";
import { Sample } from "./sample.js";
import { Survey, SurveyOptions } from "./survey.js";

function isParticipantLike(o: unknown): o is { participantCode: string } {
  return typeof o == "object" && o != null && "participantCode" in o;
}

function isSurveyLike(o: unknown): o is { name: string } {
  return typeof o == "object" && o != null && "name" in o;
}

class User {
  readonly [k: string]: unknown;
  readonly name: string = "";
  readonly firstName: string = "";
  readonly title: string = "";
  readonly role: string;
  readonly workflow: string;
  readonly email?: string;
  readonly phone?: string;
  readonly samples?: IDomainCollection<Sample>;
  readonly participantIds?: IDomainCollection<string>;

  constructor(
    survey: Survey | { name: string },
    participant: Participant | { participantCode: string }
  );
  constructor(
    workflow: string,
    email?: string,
    phone?: string,
    samples?: IDomainCollection<Sample>,
    participantIds?: IDomainCollection<string>
  );
  constructor(
    name: string | undefined | null,
    firstName: string | undefined | null,
    title: string | undefined | null,
    workflow: string,
    email?: string,
    phone?: string,
    samples?: IDomainCollection<Sample>,
    participantIds?: IDomainCollection<string>,
    kwargs?: { [k: string]: unknown }
  );
  constructor(
    x: string | Survey | { name: string } | undefined | null,
    y?: string | Participant | { participantCode: string } | undefined | null,
    z?: string | undefined | null,
    t?: string | IDomainCollection<Sample>,
    u?: string | IDomainCollection<string>,
    phone?: string,
    samples?: IDomainCollection<Sample>,
    participantIds?: IDomainCollection<string>,
    kwargs?: { [k: string]: unknown }
  ) {
    if (isSurveyLike(x) && isParticipantLike(y)) {
      this.workflow = "participant";
      this.participantIds = DomainCollection(y.participantCode);
      Object.assign(this, {
        userid: `${x.name}_${y.participantCode}`.toLocaleLowerCase(),
      });
      if (x instanceof Survey && y instanceof Participant) {
        const options = x.options as Required<SurveyOptions>;
        const emailItem = x.getItemForVariable(options?.emailVar) as PageItem;
        const phoneItem = x.getItemForVariable(options?.phoneVar) as PageItem;
        const [email, phone] = y.getValues(emailItem, phoneItem);
        this.email = email as string;
        this.phone = phone as string;
      }
    } else if (typeof t == "string") {
      this.name = x as string;
      this.firstName = y as string;
      this.title = z as string;
      this.workflow = t;
      this.email = u as string;
      this.phone = phone;
      this.samples = samples;
      this.participantIds = participantIds;
      Object.assign(this, kwargs);
    } else {
      this.workflow = x as string;
      this.email = (y ?? undefined) as string | undefined;
      this.phone = (z ?? undefined) as string | undefined;
      this.samples = t;
      this.participantIds = u as IDomainCollection<string>;
    }
    [this.role] = this.workflow?.split(":");
    Object.freeze(this);
  }

  update(kwargs: Partial<User>): User {
    return Domain.update(this, kwargs, [
      User,
      this.name,
      this.firstName,
      this.title,
      this.workflow,
      this.email,
      this.phone,
      this.samples,
      this.participantIds,
    ]);
  }
}

export { User };
