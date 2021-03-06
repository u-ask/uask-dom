/* eslint-disable prettier/prettier */

import { Sample, Survey, Participant } from "../domain/index.js";
import { builder, ParticipantBuilder } from "../dsl/index.js";

const b = builder();

b.options({
  defaultLang: "en"
});

b
  .workflow()
  .home("Synthesis")
  .initial("Inclusion")
  .followUp("Follow Up");
  
b.workflow("administrator")
  .notify("Inclusion", "Dyspnea");

b.workflow("writer:external")
  .withPageSets("Follow Up");

b.survey("P11-05")
  .pageSet("Synthesis")
  .translate("fr", "Synthèse")
  .pages("Home")
  .pageSet("Inclusion")
  .translate("fr", "Inclusion")
  .pages(b.mandatory("INCL"), b.mandatory("General"), "Risks", "Symptoms")
  .pageSet("Follow Up")
  .translate("fr", "Suivi")
  .pages("General", "Symptoms", "Status", "Side effects")
  .pageSet("Table example")
  .translate("fr", "Example de tableau")
  .pages("Table example", "Heap example")
  .pageSet("Page array")
  .pages("Page array example")
  .pageSet("Array")
  .datevariable("SDATE")
  .pages("Array example");

b.page("Home")
  .translate("fr", "Synthèse")
  .question("B date:", "PDATE", b.types.date(false))
  .translate("fr", "Date b:")
  .question("Last info:", "LDT", b.types.date(false))
  .translate("fr", "Dernière info:")
  .computed("@INDATE");
b.page("INCL")
  .translate("en", "Inclusion Criteria")
  .translate("fr", "Critère d'inclusion")
  .question("Is the participant older than 18 ?", "AGE", b.types.yesno)
  .translate("fr", "Le participant a t-il plus de 18 ans ?")
  .required()
  .pin({ en: "Adult:", fr: "Adulte:" })
  .kpi({ en: "Legal Age", fr: "Majorité"})
  .question("Email", "__EMAIL", b.types.text)
  .translate("fr", "Adresse électronique")
  .question("Phone", "__PHONE", b.types.text)
  .translate("fr", "Téléphone")
  .question("Is the participant included ?", "__INCLUDED", b.types.acknowledge)
  .translate("fr", "Le participant est-il inclus dans l'étude?")
  .required()
  .critical("Inclusion", "A participant has been included in sample @SAMPLE (code: @PARTICIPANT)")
  .computed("AGE ? @ACK : @UNDEF");
b.page("General")
  .translate("fr", "Général")
  .startSection("Information")
  .info("Welcome in our demo", "WDEMO")
  .translate("fr", "Bienvenue dans notre démo")
  .endSection()
  .startSection("General")
  .translate("fr", "Général")
  .question("Visit date :", "VDATE", b.types.date(false))
  .translate("fr", "Date de la visample")
  .required()
  .question("Country:", "COU", b.types.countries("one"))
  .translate("fr", "Pays :")
  .defaultValue(b.copy("$COU"))
  .pin({ en: "Country:", fr: "Pays:" })
  .kpi({ en: "Country", fr: "Pays"})
  .question("Weight", "WEIGHT", b.types.integer)
  .translate("fr", "Poids")
  .defaultValue(b.copy("$WEIGHT"))
  .comment("Your weight in kg")
  .translate("fr", "Votre poids en kg")
  .question("Height", "HEIGHT", b.types.real)
  .defaultValue(b.copy("$HEIGHT"))
  .translate("fr", "Taille")
  .comment("Your height in meters (m)")
  .translate("fr", "votre taille en metres (m)")
  .decimalPrecision(2)
  .inRange(1.2, 2.5, b.includeLimits)
  .question("BMI", "BMI", b.types.real)
  .translate("fr", "IMC")
  .computed("WEIGHT / (HEIGHT * HEIGHT)")
  .decimalPrecision(2)
  .endSection()
  .question("Participant initials", "PINIT", b.types.text)
  .translate("fr", "Initiales du participant")
  .defaultValue(b.computed("$PINIT ?? @TODAY"))
  .required()
  .fixedLength(2)
  .letterCase("upper")
  .comment("First letter of your first name and first letter of your last name")
  .translate(
    "fr",
    "La première lettre de votre prénom et la première lettre de votre nom de famille"
  );

b.page("Risks")
  .translate("fr", "Risques")
  .question(
    "Is the participant exposed to gases, fumes, vapors, dust ?",
    "EXP",
    b.types.yesno
  )
  .translate(
    "fr",
    "Le participant est-il exposé à des gaz, fumées, vapeurs, poussières"
  )
  .question("Is the participant a smoker ?", "SMOKE", b.types.yesno)
  .defaultValue(false)
  .translate("fr", "Le participant est-il fumeur ?")
  .question("If yes, since when ?", "SMOWHEN", b.types.date(true, true))
  .translate("fr", "Si oui depuis quand ?")
  .pin("smowhen")
  .activateWhen("SMOKE", true)
  .inRange(b.date("2000-01-01"), b.computed("@TODAY"))
  .question("If yes, date of the last take ?", "SMOLAST", b.types.date(false))
  .required()
  .translate("fr", "Date de la derniere prise de cigarette ?")
  .activateWhen("SMOKE", true)
  .question("DLCO", "DLCO", b.types.integer)
  .unit("ml", "mmHg", "mn")
  .extendable()
  .inRange(0, 1000);

b.page("Symptoms")
  .translate("fr", "Symptomes")
  .question("Dyspnea", "DYSP", b.types.scale(1, 4))
  .translate("fr", "Dyspnée")
  .comment("<Except strenuous exercise | When dressing>")
  .translate("fr", "<Dyspnée pour efforts soutenus | Dyspnée au repos>")
  .critical("Dyspnea", "Dyspnea has been reported for participant @PARTICIPANT", b.computed("DYSP >= 3"))
  .question("Cough", "COUGH", b.types.yesno, b.types.text)
  .translate("fr", "Toux");

b.page("Status")
  .exportTo("Symptoms")
  .translate("fr", "Statut")
  .question(
    "Status of the malignancy",
    "MALSTATUS",
    b.types
      .choice("one", "RECOVERED", "RECOVERING", "REMISSION", "ONGOING")
      .wording("Completely recovered", "Recovering", "Remission", "Ongoing")
      .translate(
        "fr",
        "Completement guéri",
        "guérison en cours",
        "rémission",
        "stationnaire"
      )
  )
  .translate("fr", "Statut de la tumeur")
  .required()
  .question(
    "Status of the leg ulcer",
    "LEGSTATUS",
    b.types.choice(
      "many",
      "Completely recovery",
      "Recovering",
      "Remission",
      "Ongoing"
    )
  )
  .translate("fr", "Statut de l'ulcère de jambe")
  .kpi({en: "Leg ulcer status", fr: "Status de la tumeur"})
  .required()
  .question(
    "Localization of the leg ulcer",
    "LEGLOC",
    b.types.choice(
      "one",
      "Internal malleolus",
      "External malleolus",
      "Suspended",
      "Other"
    )
  )
  .translate("fr", "Localisation de l'ulcère de jambe")
  .kpi({en: "Leg ulcer localization", fr: "Localisation de la tumeur"})
  .required()
  .question("If other, which localization ?", "LEGLOCOTHER", b.types.text)
  .visibleWhen("LEGLOC", "Other")
  .include("Symptoms")
  .select("COUGH")
  .context("COUGH", 1);

b.page("Side effects")
  .translate("fr", "Effets secondaires")
  .question(
    "Other side effects that have been experienced ?",
    "SIDEF",
    b.types.text
  )
  .translate("fr", "D'autres effets secondaires ont-ils été ressentis ?")
  .required()
  .maxLength(30)
  .question("Pain scale rating :", "SIDSC", b.types.scale(1, 5))
  .translate("fr", "Evaluation sur l'échelle de douleur :")
  .required()
  .inRange(1, 5)
  .comment("<Not (very) painful | Very painful>(EVA)")
  .translate("fr", "<Douleur (presque) absente | Douleur maximale>(EVA)");

b.page("EL")
  .question("V11", b.types.integer)
  .wordings("row 1, col 1", "row 1 -> col1")
  .translate("fr", "ligne1, col1", "ligne1 ->  col1")
  .question("V12", b.types.yesno)
  .wordings("row 1, col 2", "row 1 -> col2")
  .translate("fr", "ligne1, col2", "ligne1 ->  col2")
  .question("V21", b.types.text)
  .wordings("row 2, col 1", "row 2 -> col1")
  .translate("fr", "ligne2, col1", "ligne2 ->  col1")
  .question("V22", b.types.info)
  .wordings("row 2, col 2", "row 2 -> col2")
  .translate("fr", "ligne2, col2", "ligne2 ->  col2")
  .computed("V11 + 1");

b.page("Table example")
  .include("EL")
  .context("V11", 1)
  .context("V12", 1)
  .context("V21", 1)
  .context("V22", 1);

b.page("Heap example").include("EL");

b.page("Page array example")
    .question("-> Work", "WORK", b.types.choice("one", "Cuisinier", "Secrétaire"))
    .translate("fr", "-> Profession")
    .question("-> Year", "YEAR", b.types.integer)
    .translate("fr", "-> Année")
    .kpi("Year", "WORK")
    .translate("fr", "Année");
    
b.page("Array example")
    .question("Single", "SDATE", b.types.date())
    .include("Page array example");

const exampleSurvey: Survey = b.build();

const exampleSamples: Sample[] = [new Sample("001"), new Sample("002")];

const p1 = new ParticipantBuilder(exampleSurvey, "000001", exampleSamples[0]);
p1.interview(exampleSurvey.pageSets[0])
  .init(Math.ceil(Math.random() * 1e16), new Date())
  .item("PDATE")
  .value(new Date("2020-01-10"))
  .item("LDT")
  .value(new Date());
const i1 = p1.interview(exampleSurvey.pageSets[1]);
i1.init(Math.ceil(Math.random() * 1e16), new Date())
  .item("__EMAIL")
  .value("example@arone.com")
  .item("__PHONE")
  .specialValue("unknown")
  .item("AGE")
  .value(true)
  .item("__INCLUDED")
  .value(true)
  .item("VDATE")
  .value(new Date("2020-01-10"))
  .item("COU")
  .value("ESP")
  .item("WEIGHT")
  .value(65)
  .item("HEIGHT")
  .value(1.75)
  .item("BMI")
  .value(21.22)
  .item("PINIT")
  .value("P1")
  .item({
    pageItem: exampleSurvey.pageSets[1].pages[2].items[0],
    specialValue: "notDone"
  })
  .item("SMOKE")
  .value(true)
  .item("SMOWHEN")
  .value("2007")
  .item("SMOLAST")
  .value(
    new Date(
      "Tue Dec 03 2019 01:00:00 GMT+0100 (heure normale d’Europe centrale)"
    )
  )
  .item({
    pageItem: exampleSurvey.pageSets[1].pages[2].items[4],
    value: "6",
    unit: "ml"
  })
  .item("DYSP")
  .value(4)
  .item("COUGH")
  .value(true);

p1.interview(exampleSurvey.pageSets[2])
  .init(Math.ceil(Math.random() * 1e16), new Date())
  .item("VDATE")
  .value(new Date("2020-02-02"))
  .item("COU")
  .value("ESP")
  .item("WEIGHT")
  .value(65)
  .item("HEIGHT")
  .value(1.75)
  .item("BMI")
  .value(21.22)
  .item("PINIT")
  .value("P1")
  .item("DYSP")
  .value(4)
  .item("COUGH")
  .value(true)
  .item("MALSTATUS")
  .messages({ required: "value is required" })
  .acknowledge("required")
  .item("LEGSTATUS")
  .messages({ required: "value is required" })
  .item("LEGLOC")
  .value("Other")
  .item("SIDEF")
  .value("pain")
  .item("SIDSC")
  .value(3);
p1.interview(exampleSurvey.pageSets[3])
  .init(Math.ceil(Math.random() * 1e16), new Date())
  .item("V11")
  .value(1)
  .item("V12")
  .value(true)
  .item("V21")
  .value("T")
  .item("V22")
  .value(0.22);
p1.interview(exampleSurvey.pageSets[4])
  .init(Math.ceil(Math.random() * 1e16), new Date())
  .item("WORK", 1)
  .value("Cuisinier")
  .item("WORK", 2)
  .value("Secrétaire")
  .item("YEAR", 1)
  .value(1996)
  .item("YEAR", 2)
  .value(2002)
p1.interview(exampleSurvey.pageSets[5])
  .init(Math.ceil(Math.random() * 1e16), new Date())
  .item("SDATE")
  .value(new Date())
  .item("WORK", 1)
  .value("Cuisinier")
  .item("WORK", 2)
  .value("Secrétaire")
  .item("YEAR", 1)
  .value(1996)
  .item("YEAR", 2)
  .value(2002);

const p3 = new ParticipantBuilder(exampleSurvey, "000003", exampleSamples[0]);
p3.interview(exampleSurvey.pageSets[0])
  .init(Math.ceil(Math.random() * 1e16), new Date())
  .item("PDATE")
  .value(new Date("2020-01-10"))
  .item("LDT")
  .value(new Date());
const i3 = p3.interview(exampleSurvey.pageSets[1]);
i3.init(Math.ceil(Math.random() * 1e16), new Date())
  .item("AGE")
  .value(true)
  .item("__INCLUDED")
  .value(true)
  .item("VDATE")
  .value(new Date("2020-01-10"))
  .item("COU")
  .value("FRA")
  .item("WEIGHT")
  .value(80)
  .item("HEIGHT")
  .value(1.8)
  .item("BMI")
  .value(24.69)
  .item("PINIT")
  .value("PAT3")
  .messages({ fixedLength: "text length must be 2" })
  .item("EXP")
  .value(true)
  .item("SMOKE")
  .value(true)
  .item("SMOWHEN")
  .value("2007")
  .item("SMOLAST")
  .value(
    new Date(
      "Tue Dec 03 2019 01:00:00 GMT+0100 (heure normale d’Europe centrale)"
    )
  )
  .item({
    pageItem: exampleSurvey.pageSets[1].pages[2].items[4],
    value: "1006",
    unit: "ml"
  })
  .messages({ inRange: "value must be in range [0, 1000]" })
  .acknowledge("inRange")
  .item("DYSP")
  .value(4)
  .item("COUGH")
  .value(true);

p3.interview(exampleSurvey.pageSets[2])
  .init(Math.ceil(Math.random() * 1e16), new Date())
  .item("VDATE")
  .value(new Date("2020-02-02"))
  .item("COU")
  .value("FRA")
  .item("WEIGHT")
  .value(80)
  .item("HEIGHT")
  .value(1.8)
  .item("BMI")
  .value(24.69)
  .item("PINIT")
  .value("P3")
  .item("DYSP")
  .value(4)
  .item("COUGH")
  .value(true)
  .item("LEGLOC")
  .value("Other")
  .item("SIDEF")
  .value("pain")
  .item("SIDSC")
  .value(3);

const p5 = new ParticipantBuilder(exampleSurvey, "000005", exampleSamples[0]);
p5.interview(exampleSurvey.pageSets[0])
  .init(Math.ceil(Math.random() * 1e16), new Date())
  .item("PDATE")
  .value(new Date("2020-01-10"))
  .item("LDT")
  .value(new Date());
p5.interview(exampleSurvey.pageSets[1])
  .init(Math.ceil(Math.random() * 1e16), new Date())
  .item("AGE")
  .value(true)
  .item("__INCLUDED")
  .value(true)
  .item("VDATE")
  .value(new Date("2020-01-10"))
  .item("COU")
  .value("ITA")
  .item("WEIGHT")
  .value(36)
  .item("HEIGHT")
  .value(1.1)
  .messages({ inRange: "value must be in range [1.2, 2.5]" })
  .item("BMI")
  .value(29.75)
  .item("PINIT")
  .value("P5")
  .item("EXP")
  .value(true)
  .item("SMOKE")
  .value(true)
  .item("SMOWHEN")
  .value("2007-08")
  .item("SMOLAST")
  .value(
    new Date(
      "Tue Dec 03 2019 01:00:00 GMT+0100 (heure normale d’Europe centrale)"
    )
  )
  .item({
    pageItem: exampleSurvey.pageSets[1].pages[2].items[4],
    value: "1",
    unit: "mn"
  })
  .item("DYSP")
  .value(4)
  .item("COUGH")
  .value(true);
p5.interview(exampleSurvey.pageSets[2])
  .init(Math.ceil(Math.random() * 1e16), new Date())
  .item("VDATE")
  .value(new Date("2020-02-02"))
  .item("DYSP")
  .value(4)
  .item("COUGH")
  .value(true)
  .item("LEGLOC")
  .value("Suspended")
  .item({
    pageItem: exampleSurvey.pageSets[2].pages[2].items[3],
    specialValue: "notApplicable"
  })
  .item("SIDEF")
  .value("pain")
  .item("SIDSC")
  .value(3);

const p2 = new ParticipantBuilder(exampleSurvey, "000002", exampleSamples[0]);
p2.interview(exampleSurvey.pageSets[0])
  .init(Math.ceil(Math.random() * 1e16), new Date())
  .item("PDATE")
  .value(new Date("2020-01-12"))
  .item("LDT")
  .value(new Date());
p2.interview(exampleSurvey.pageSets[1])
  .init(Math.ceil(Math.random() * 1e16), new Date())
  .item("__EMAIL")
  .value("example@arone.com")
  .item("__PHONE")
  .specialValue("unknown")
  .item("AGE")
  .value(true)
  .item("__INCLUDED")
  .value(true)
  .item("VDATE")
  .value(new Date("2020-01-12"))
  .item("COU")
  .value("FRA")
  .item("WEIGHT")
  .value(57)
  .item("HEIGHT")
  .value(1.67)
  .item("BMI")
  .value(20.43)
  .item({
    pageItem: exampleSurvey.pageSets[1].pages[1].items[6],
    specialValue: "notApplicable"
  })
  .item("EXP")
  .value(true)
  .item("SMOKE")
  .value(true)
  .item("SMOWHEN")
  .value("2007-10-25")
  .item("SMOLAST")
  .value(
    new Date(
      "Tue Dec 03 2019 01:00:00 GMT+0100 (heure normale d’Europe centrale)"
    )
  )
  .item({
    pageItem: exampleSurvey.pageSets[1].pages[2].items[4],
    value: "3",
    unit: "ml"
  })
  .item("DYSP")
  .value(4)
  .item("COUGH")
  .value(true);

const p13 = new ParticipantBuilder(exampleSurvey, "000013", exampleSamples[0]);
p13
  .interview(exampleSurvey.pageSets[0])
  .init(Math.ceil(Math.random() * 1e16), new Date())
  .item("PDATE")
  .value(new Date("2021-01-01"))
  .item("LDT")
  .value(new Date());
p13
  .interview(exampleSurvey.pageSets[1])
  .init(Math.ceil(Math.random() * 1e16), new Date())
  .item("AGE")
  .value(true)
  .item("__INCLUDED")
  .value(true)
  .item("VDATE")
  .value(new Date("2021-01-01"))
  .item("COU")
  .value("ITA")
  .item("WEIGHT")
  .value(68)
  .item("HEIGHT")
  .value(1.76)
  .item("BMI")
  .value(23);

const p10 = new ParticipantBuilder(exampleSurvey, "000010", exampleSamples[1]);
p10
  .interview(exampleSurvey.pageSets[0])
  .init(Math.ceil(Math.random() * 1e16), new Date())
  .item("PDATE")
  .value(new Date("2021-01-01"))
  .item("LDT")
  .value(new Date());
const i10 = p10.interview(exampleSurvey.pageSets[1]);
  i10.init(Math.ceil(Math.random() * 1e16), new Date())
  .item("AGE")
  .value(true)
  .item("__INCLUDED")
  .value(true)
  .item("VDATE")
  .value(new Date("2020-01-12"))
  .item("COU")
  .value("FRA")
  .item("WEIGHT")
  .value(57)
  .item("HEIGHT")
  .value(1.67)
  .item("BMI")
  .value(20.43)
  .item({
    pageItem: exampleSurvey.pageSets[1].pages[1].items[6],
    specialValue: "notApplicable"
  })
  .item("EXP")
  .value(true)
  .item("SMOKE")
  .value(true)
  .item("SMOWHEN")
  .value("2007-10-25")
  .item("SMOLAST")
  .value(
    new Date(
      "Tue Dec 03 2019 01:00:00 GMT+0100 (heure normale d’Europe centrale)"
    )
  )
  .item({
    pageItem: exampleSurvey.pageSets[1].pages[2].items[4],
    value: "3",
    unit: "ml"
  })
  .item("DYSP")
  .value(4)
  .item("COUGH")
  .value(true);

p10
  .interview(exampleSurvey.pageSets[2])
  .init(Math.ceil(Math.random() * 1e16), new Date())
  .item("VDATE")
  .value(new Date("2020-02-02"))
  .item("COU")
  .value("ESP")
  .item("WEIGHT")
  .value(65)
  .item("HEIGHT")
  .value(1.75)
  .item("BMI")
  .value(21.22)
  .item("PINIT")
  .value("P1")
  .item("DYSP")
  .value(4)
  .item("COUGH")
  .value(true)
  .item("MALSTATUS")
  .messages({ required: "value is required" })
  .item("LEGSTATUS")
  .messages({ required: "value is required" })
  .item("LEGLOC")
  .value("Other")
  .item("SIDEF")
  .value("pain")
  .item("SIDSC")
  .value(3);

const p11 = new ParticipantBuilder(exampleSurvey, "000011", exampleSamples[1]);
p11
  .interview(exampleSurvey.pageSets[0])
  .init(Math.ceil(Math.random() * 1e16), new Date())
  .item("PDATE")
  .value(new Date("2021-01-01"))
  .item("LDT")
  .value(new Date());
p11
  .interview(exampleSurvey.pageSets[1])
  .init(Math.ceil(Math.random() * 1e16), new Date())
  .item("AGE")
  .value(true)
  .item("__INCLUDED")
  .value(true)
  .item("VDATE")
  .value(new Date("2021-01-01"))
  .item("COU")
  .value("ITA")
  .item("WEIGHT")
  .value(75)
  .item("HEIGHT")
  .value(1.85)
  .item("BMI")
  .value(21.91);

const exampleParticipants: Participant[] = [
  p1.build(),
  p2.build(),
  p3.build(),
  new Participant("000004", exampleSamples[0]),
  p5.build(),
  new Participant("000006", exampleSamples[0]),
  new Participant("000007", exampleSamples[0]),
  new Participant("000008", exampleSamples[0]),
  new Participant("000009", exampleSamples[0]),
  p10.build(),
  p11.build(),
  new Participant("000012", exampleSamples[1]),
  p13.build(),
  new Participant("000014", exampleSamples[1]),
  new Participant("000015", exampleSamples[1])
];

export { exampleSurvey, exampleSamples, exampleParticipants };
