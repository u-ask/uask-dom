import { IDomainCollection } from "../domain/index.js";
import { ItemJson, Json } from "./kpi.js";

export interface IParticipantSummary {
  participantCode: string;
  sampleCode: string;
  kpis: ItemJson;
  pins: ItemJson;
  alerts: IDomainCollection<Json>;
  inclusionDate: Date | number | undefined;
}
