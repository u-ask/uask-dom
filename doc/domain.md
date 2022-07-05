# Domain

Domain objects belong to three categories :
 - the declarative model,
 - the operation model,
 - the glossary model

## Survey related types
This is the declarative part of the domain model : it is used to describe the survey with its pages and visits. It seldom changes, only during survey development phases and is subject to version management. All these types are immutable.

![Survey related types (declarative model)](./images/survey.svg "Survey related types (declarative model)")

## Participant related types
This is the operational part of the domain model : it is use to collect data on participant, relative to the questions described in the stufy. It is updated regularly by users. All these types are immutable.

![Participant related types (operational model)](./images/participant.svg "Participant related types (operational model)")

## Glossary model
It contains various kind of objects, generally defined in the administrative part or the application :
 - `Sample`
 - `User`
 - etc.


