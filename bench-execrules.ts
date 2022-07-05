import { exampleSurvey, exampleParticipants, execute, Interview, Scope } from "./dist/spiral";

for(let i=0; i<5000; i++) {
  exampleParticipants.forEach(p => {
    p.interviews.reduce((a, i) => {
      const scope = Scope.create({lastInput: p.lastInput, interviews: a}, i);
      execute(exampleSurvey.rules, scope);
      a.push(i);
      return a;
    }, new Array<Interview>());
  });
}