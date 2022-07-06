# Spiral

U-ASK domain model classes and builders. This library implement an internal domain specific language as described in [Martin Fowler's Domain Specific Languages](https://martinfowler.com/dsl.html).

This library is intended to be used with [U-ASK Management System](https://github.com/u-ask/uask-sys) and [U-ASK Web Application](https://github.com/u-ask/uask-app).

# Install
```bash
npm Install uask-dom
```

# Usage

## `Survey` construction

A `Survey` is composed of `Page` objects. `Page` objects are hierarchical, they include other `Page` objects or `PageItems` leaf objects.

`Page` objects are grouped in `PageSet` objects that represent questionnaires. A `Survey` may have multiple questionnaires.

`PageItem` represent a question, they have a `wording` and a `type`. They may be involved in `Rule` objects that control the value of question answers.

![Survey class diagram](uml/survey.svg)

`Survey` objects are complex graphes, construction is easier with fluent builders :

```ts
import builder from "uask-dom"

const b = builder();

b.options({
  defaultLang: "en",
});

b.survey("P11-05")
  .pageSet("Inclusion").pages("General", "Risks", "Symptoms")
  .pageSet("Follow Up").pages("General", "Symptoms", "Status", "Side effects");

b.page("General").translate("fr", "Général")
  .question("Visit date :", "VDATE", b.types.date)
    .translate("fr", "Date de la visample");

b.page("Risks").translate("fr", "Risques")
  .question("Is the participant exposed to gases, fumes, vapors, dust ?", "EXP", b.types.yesno)
    .translate("fr", "Le participant est-il exposé à des gaz, fumées, vapeurs, poussières")
  .question("Is the participant a smoker ?", "SMOKE", b.types.yesno)
    .translate("fr", "Le participant est-il fumeur ?")
  .question("If yes, since when ?", "SMOWHEN", b.types.date)
    .translate("fr", "Si oui depuis quand ?");

b.page("Symptoms").translate("fr", "Symptomes")
  .question("Dyspnea", "DYSP", b.types.scale(1, 5))
    .translate("fr", "Dyspnée")
  .question("Cough", "COUGH", b.types.yesno)
    .translate("fr", "Toux");

b.page("Status").translate("fr", "Statut")
  .question("Status of the malignancy", "MALSTATUS", b.types.choice(
      "one",
      "Completely recovery",
      "Recovering",
      "Remission",
      "Ongoing"
    )
  )
  .translate("fr", "Statut de la tumeur");

b.page("Side effects").translate("fr", "Effets secondaires")
  .question("Other side effects that have been experienced ?", "SIDEF", b.types.text)
    .translate("fr", "D'autres effets secondaires ont-ils été ressentis ?")
  .question("Pain scale rating :", "SIDSC", b.types.scale(1, 5))
    .translate("fr", "Evaluation sur l'échelle de douleur :");

const survey = b.build();
```

The result is a `Survey` object with `PageSet`, `Page` and `PageItem` objects that reflects the stucture of the fluent program above.

## `Participant` construction
A `Participant` participes to a `Survey` ; it belongs to a `Sample`.

`Participant` contains `Interview` objects that reference a `PageSet` and contains `InterviewItem` objects.

`InterviewItem` holds a value and represent an answer to a `PageItem` (a question).

`Participant` may also be build using fluent buiders. See [./src/example/index.ts]() for more information.

# DSL reference

## Study and visit construction

| instruction                           |                |
|:--------------------------------------|:---------------|
|`.study(name)`                         | creates a study with given name
| &emsp; `.options(opt)`                | declares options for the study
| &emsp; `.visit(name)`                 | creates a page set (or visit) with given name
| &emsp;&emsp; `.translate(lang, name)` | add a translation for visit name
| &emsp;&emsp; `.dateVariable(name)`    | declares the variable which holds the visit date
| &emsp;&emsp; `.pages(names...)`       | adds pages with given names to the visit
| |
| `.mandatory(name)`                    | declares that a page is mandatory in a visit, result is passed to `.pages` 

### Study options

| option          | default value   |                    |
|:----------------|:----------------|:-------------------|
|`languages`      | `['en', 'fr']`  | languages supported by the study
|`defaultLang`    | `'en'`          | fallback language if browser language is not supported
|`showFillRate`   | `true`          | show fill rate for visits
|`visitDateVar`   | `'VDATE'`       | default variable that holds the visit date
|`phoneVar`       | `'__PHONE'`     | patient phone number if any
|`emailVar`       | `'__EMAIL'`     | patient email if any
|`inclusionVar`   | `'__INCLUDED'`  | variable that holds whether the patient is included or not
|`unitSuffix`     | `'_UNIT'`       | suffix used for exporting data units if applicable

###### Example
```
b.study('Demo-eCRF')
  .defaultLang('fr')
  .visit('INCL')
    .translate('fr', 'Inclusion')
    .translate('en', 'Inclusion')
    .dateVariable('DATE_VIS')
    .pages(b.mandatory('PATIENT_INFO'), 'ANTECED')
```

## Page and question construction

| instruction                                         |                |
|:--------------------------------------------------  |:---------------|
|`.page(name)`                                        | creates a page with given name
| &emsp; `.translate(lang, name)`                     | adds a translation for page name
| &emsp; `.startSection(name)`                        | declares a section with given name
| &emsp;&emsp; `.translate(lang, name)`               | adds a translation for section name
| &emsp; `.question(wording, variable, types...)`     | adds a question with given wording, variable and types (type can change with context, see below)
| &emsp;&emsp; `.translate(lang, wording)`            | adds a translation for question wording
| &emsp;&emsp; `.comment(info)`                       | adds information about the variable
| &emsp;&emsp;&emsp; `.translate(lang, info)`         | adds a translation for question comment
| &emsp;&emsp; `.unit(units...)`                      | declares that the variable value may be expressed in one of the given units
| &emsp;&emsp;&emsp; `.extendable()`                  | declares that custom units may be used for the variable
| &emsp;&emsp; `.defaultValue(value)`                 | declares that a new variable instance is filled with given value
| &emsp;&emsp; `.required()`                          | declares that the variable cannot be filled by a special value
| &emsp;&emsp; `.decimalPrecision(precision)`         | decrares that the variable is a number with at most given precision decimal digits
| &emsp;&emsp; `.inRange(min, max, limits)`           | decrares that the variable value must be between given values, limits may or may not be included (see below)
| &emsp;&emsp; `.maxLength(length)`                   | decrares that the variable value is a text which lenght is at most given length
| &emsp;&emsp; `.fixedLength(length)`                 | decrares that the variable value is a text which lenght is exactly given length
| &emsp;&emsp; `.letterCase(case)`                    | decrares that the variable value is a text which case is 'upper' or 'lower'
| &emsp;&emsp; `.computed(formula)`                   | apply the given formula to the variable
| &emsp;&emsp; `.visibleWhen(formula, results...)`    | shows this question only when the given formula is true or if any equal to one of the given results
| &emsp;&emsp; `.activatedWhen(formula, results...)`  | activates this question only when the given formula is true or if any equal to one of the given results
| &emsp;&emsp; `.modifiableWhen(formula, results...)` | allows modifications on this question only when the given formula is true or if any equal to one of the given results
| &emsp; `.question(variable, types...)`              | adds a question with given variable and types (type can change with context, see below), allow multiple wordings
| &emsp;&emsp; `.wordings(wordings...)`               | adds multiple, contextual wordings (see below)
| &emsp;&emsp; `.translate(lang, wordings...)`        | adds a translation for multiple wordings
| &emsp; `.include(name)`                             | includes all the question of the given page
| &emsp;&emsp; `.context(variable, num)`              | switch included variable to context num (i.e. with corresponding wording and type if multiple are declared)
| &emsp;&emsp; `.context(num)`                        | switch all included variables to context num (i.e. with corresponding wording and type if multiple are declared)
| &emsp;&emsp; `.visibleWhen(formula, results...)`    | shows the included questions only when the given formula is true or if any equal to one of the given results
| &emsp;&emsp; `.activatedWhen(formula, results...)`  | activates the included questions only when the given formula is true or if any equal to one of the given results
| &emsp;&emsp; `.modifiableWhen(formula, results...)` | allows modifications on the included questions only when the given formula is true or if any equal to one of the given results
| |
| `.computed(formula)`                                | declares a dynamic constraint, result is passed `inRange`, `activatedWhen`, etc. 
| `.copy(variable)`                                   | declares a copy an existing variable values, result is passed `defaultValue`
| `.includeLimits`                                    | declares that an in range constraint must include limits, result is passed to `inRange`
| `.includeUpper`                                     | declares that an in range constraint must include upper limit, result is passed to `inRange`
| `.includeLower`                                     | declares that an in range constraint must include lower limit, result is passed to `inRange`

### Variable types
The third argument of `.question(wording, variable, type)` is the result of one of


| instruction                                         | Variable type  |
|:--------------------------------------------------  |:---------------|
|`.types.acknowledge`                                 | true or undefined
|`.types.yesno`                                       | Yes or No (translated to user language)
|`.types.integer`                                     | a natural number
|`.types.real`                                        | a real number
|`.types.text`                                        | a text
|`.types.info`                                        | no value
|`.types.date(incomplete?, month?)`                   | a date optionally incomplete and truncted to month
|`.types.scale(min, max)`                             | an integer value between min and max
|`.types.score(scores...)`                            | an integer that is used to compute scores
|&emsp;`.wording(lang, wordings...)`                  | declares wording for scores
|&emsp;`.translate(lang, wordings...)`                | adds a translation for score wordings
|`.types.choice('one' | 'many', choices...)`          | a set of categories that can be exclusive (`one`) or not (`many`)
|&emsp;`.wording(lang, wordings...)`                  | declares wording for categories
|&emsp;`.translate(lang, wordings...)`                | adds a translation for category wordings
|`.types.glossary('one' | 'many', choices...)`        | a set of categories that allows custom values and can be exclusive (`one`) or not (`many`)
|&emsp;`.wording(lang, wordings...)`                  | declares wording for categories
|&emsp;`.translate(lang, wordings...)`                | adds a translation for category wordings

###### Example
```
b.page('INCL')
  .translate('fr', 'Inclusion')
  .translate('en', 'English')
  .question('Date de la visite', 'DATE_VIS', b.types.date())
    .translate('en', 'Visit date')
    .required()
    .inRange('#2000-01-01#', b.computed('@TODAY'))
  .question('Sexe', 'SEX',
    b.types.choice('one', 'H', 'F', 'ND')
      .wording('Homme', 'Femme', 'Non déterminé')
      .translate('en', 'Male', 'Female', 'Undetermined'))
    )
    .translate('en', 'Sex')
```

## Computed formulas
A formula are composed of :

 - operators

 | operator         |                          |
 |:-----------------|:-------------------------|
 |`+ - * /`         | arithmetic operators
 |`< > <= >= == !=` | comparison operators
 |`? ... : ...`     | ternary operator
 |`&& || == !=`     | logical operators
 |`(...)`           | sub expressions

 - values

 | value            |                          |
 |:-----------------|:-------------------------|
 | `0, 1, 2 ...`    | numbers (may be decimals)
 |`'...'`or `"..."` | texts
 |`#YYYY-MM-DD#`     | dates

 - variables

 | variable         |                          |
 |:-----------------|:-------------------------|
 | `X, Y, Z ...`    | current value of a variable declared in the questions
 | `$X, $Y, $Z ...` | previous value of a variable declared in the questions
 | `@LASTIN`        | last input date for the patient
 | `@UNDEF`         | undefined value
 | `@ACK`           | acknowledged or true value
 | `@THISYEAR`      | current year
 | `@TODAY`         | current date

 - functions

 | function          |                          |
 |:------------------|:-------------------------|
 | `~IN(VAR, value)` | returns `@ACK` if given variable of type `.choice('many')` contains the given value
 
###### Examples
```
b.page('...')
 .question('Où souffrez-vous ?', 'LOC', b.types.choice('many', 'MAIN', 'DOS', 'JAMBE', 'TÊTE', 'AUTRE')
 .question('Si AUTRE, précisez', 'LOC_AUTRE', b.types.text)
   .activatedWhen(~IN('LOC, "Autre")')
```
```
b.page('...')
  question('Date de la visite', 'DATE_VIS', b.types.date())
 .question('Confirmez que la date est postérieure à ce jour', '__DATE_POST', b.types.acknowledge)
   .required()
   .visibleWhen('DATE_VIS>@TODAY')
```

## Question layouts
Questions that are related may be viewed as tables or recordsets

A table represents variables that can be arranged as

>|      | column A | colmumn B |
>|:-----|:---------|:----------|
>| row1 | A1       | B1
>| row2 | A2       | B2

A recordset represents variables that can have multiple instances in the same form

>| column A | colmumn B |
>|:---------|:----------|
>| A(1)     | B(1)
>| A(2)     | B(2)
>| ...      | ...

This is achieved by using DSL syntax in the question wordings :

| wording            | layout  |
|:-------------------|:--------|
| `row -> column`    | table
| `-> column`        | recordset
| `-> row -> column` | a table nested in a recordset

###### Examples
```
b.page('...')
  .question('Red cells -> Result', 'RES_BLOOD', b.types.real)
  .question('Red cells -> Interpretation', 'INT_BLOOD', b.choice('one', 'normal', 'abnormal'))
  .question('Haemoglobin -> Result', 'RES_BLOOD', b.types.real)
  .question('Haemoglobin -> Interpretation', 'INT_HAEMO', b.choice('one', 'normal', 'abnormal'))
```

>|                     | Résult    | Interpretation 
>|:--------------------|:----------|:---------------
>| **Red cells**       | RES_BLOOD | INT_BLOOD
>| **Haemoglobin**     | RES_BLOOD | INT_HAEMO

```
b.page('...')
  .question('-> Year', 'YEAR', b.types.integer)
  .question('-> Treatment', 'TREAT', b.types.text)
  .question('-> Dosage', 'DOS', b.types.text)
```

>| YEAR    | Treatment | Dosage 
>|:--------|:----------|:------
>| YEAR(1) | TREAT(1)  | DOS(1)
>| YEAR(2) | TREAT(2)  | DOS(2)
>| ...     | ...       | ...     

## Informationnal classes and directives
The question comments can be used to add information to a question.
Directives gives richer wording capabilities and classes are question categories indications.
Comment can be written as : `directives...{classes...}`. Classes begins with a dot `.`

| directive or class            |        |
|:------------------------------|:-------|
| `(...)`                       | simple information
| <code><... &vert; ...></code> | left and right labels
| `.row`                        | the categories should be disposed on a row
| `.column`                     | the categories should be disposed on a column
| `.pad` or `.pad1`             | pad the question on the left
| `.pad2`                       | pad the question on the left with 2 levels
| `.pad3`                       | pad the question on the left with 3 levels
| `.no-specials`                | the field won't be modifiable, thus do not display specials

###### Example
```
b.page(' ')
 .question('Pain scale', 'PAIN', b.types.scale(1, 10))
 .comment('<No pain | Maximum pain>{.row}')
```

> Pain scale<br/>
> &emsp; No pain &nbsp; 1 &emsp; 2 &emsp; 3 &emsp; 4 &emsp; 5 &emsp; 6 &emsp; 7 &emsp; 8 &emsp; 9 &emsp; 10 &nbsp; Maximum pain


## Rule execution order

Rules are executed in order of appearance of their target `PageItem` in the DSL ; for a given target they are executed in order of deacreasing precedence.

| rule name        | precedence
|:-----------------|:-----------
| copy             |        110
| computed         |        100
| constant         |        100
| critical         |         70
| required         |         70
| activation       |         50
| decimalPrecision |         10
| fixedLength      |         10
| inRange          |         10
| letterCase       |         10
| maxLength        |         10