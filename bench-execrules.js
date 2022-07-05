"use strict";
exports.__esModule = true;
var spiral_1 = require("./dist/spiral");
for (var i = 0; i < 5000; i++) {
    spiral_1.exampleParticipants.forEach(function (p) {
        p.interviews.reduce(function (a, i) {
            var scope = spiral_1.Scope.create({ lastInput: p.lastInput, interviews: a }, i);
            spiral_1.execute(spiral_1.exampleSurvey.rules, scope);
            a.push(i);
            return a;
        }, new Array());
    });
}
