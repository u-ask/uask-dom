import { Interview, Participant, Sample } from "../domain/index.js";
import { builder } from "./surveybuilder.js";

const b = builder();

b.survey("P11-05")
  .pageSet("Inclusion")
  .pages("Risks", "Symptoms")
  .pageSet("Follow Up")
  .pages("Symptoms", "Side effects");

b.page("Risks")
  .question(
    " -> Is the participant exposed to gases, fumes, vapors, dust ?",
    "EXP",
    b.types.yesno
  )
  .question("Is the participant a smoker ?", "SMOKE", b.types.yesno)
  .question("If yes, since when ?", "SMOWHEN", b.types.date(true));

b.page("Symptoms")
  .question("Dyspnea", "DYSP", b.types.scale(0, 5))
  .defaultValue(b.computed("$DYSP"))
  .question("Cough", "COUGH", b.types.yesno);

b.page("Side effects")
  .question(
    "Other side effects that have been experienced ?",
    "SIDEF",
    b.types.text
  )
  .question("Pain scale assessment :", "SIDSC", b.types.scale(0, 5));

const survey = b.get();

const participant = new Participant("0001", new Sample("AZ"));

export const currentSurvey = survey;
export const currentPageSet = survey.pageSets[0];
export const currentPage = survey.pageSets[0].pages[0];
export const currentParticipant = participant;
export const currentInterview = (<unknown>undefined) as Interview;
