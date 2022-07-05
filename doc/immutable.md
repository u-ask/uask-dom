# Immutable domain objects

## Introduction

Immutable objects are objects that cannot be modified. In TypeScript or JavaScript they are implemented thanks to
`Object.freeze` (plus keyword `readonly` to help the TypeScript compiler). When an immutable object field must be changed, a new immutable object is created with the new field value.

Immutable objects have multiple advantages but also counterparts that we will survey in this documentation,
applied to the Spiral project.

In the [Spiral library](https://github.com/invarture-arone/Spiral) all domain classes are immutable.
Collection of domain objects also are immutable, such collections implements the
[IDomainCollection](https://github.com/invarture-arone/Spiral/blob/master/src/domain/domaincollectiondef.ts) interface.

## Immutability implementation
Domain objects and collections have inteerfaces that contains no mutator. Domain objects interface depends on the object it represents. Domain collections implement the
[IDomainCollection](https://github.com/invarture-arone/Spiral/blob/master/src/domain/domaincollectiondef.ts) interface.

Domain collection are actually implemented by the
[DomainCollectionImpl](https://github.com/invarture-arone/Spiral/blob/master/src/domain/domaincollection.ts) class, that extends Javascript Array type, thus is mutable.

Domain collection must be constructed using the 
[DomainCollection](https://github.com/invarture-arone/Spiral/blob/master/src/domain/domaincollection.ts) function that freezes the collection instance and only exposes the immutable interface :
```typescript
export function DomainCollection<T>(...args: T[]): IDomainCollection<T> {
  const coll = new DomainCollectionImpl(...args);
  Object.freeze(coll);
  return coll;
}
```

[DomainCollectionImpl](https://github.com/invarture-arone/Spiral/blob/master/src/domain/domaincollection.ts) may only be used for inheritance, and the constructor must eventually freeze the instance :
```typescript
class ParticipantSchema extends DomainCollectionImpl<ConcreteType> {
  constructor(...args: ConcreteType[]) {
    super(...args);
    Object.freeze(this);
  }
}
```

## Object updates

When a domain object needs an update in some business logic, a new version of the domain object is produced :

```typescript
const pageItem = new PageItem("Are you OK ?", "OK", QuestionTypes.yesno);
const interviewItem = new InterviewItem(pageItem, true);
//...
const updatedInterviewItem = interviewItem.update({ value: false });
```

If this object is part of a domain immutable collection, this collection may be updated as well :

```typescript
const interviewItems = DomainCollection(interviewItem, ...);
//...
const updatedInterviewItems = interviewItems.update(
  a => a == interviewItem ? updatedInterviewItem : a
);
```

In the example above, for each interviewItem `a` in the collection `interviewItems`, we check if it is the `interviewItem` to be updated, then return the new version `updatedInterviewItem` otherwise return `a` unchanged.

The same pattern applies from botton to top in the object hierarchy. For instance, if the interview items were part of an interview :

```typescript
const surveyBuilder = builder();
//...
const survey = surveyBuilder.get();
//...
const visit = survey.visits[0];
const interview = new Interview(visit, { defaultLang: "fr" }, { interviewItems });
//...
const updatedInterview = interview.update({ items: updatedInterviewItems });
```

And the modifications flow up to the participant :

```typescript
const interviews = DomainCollection(interview, ...);
const sample = new Sample("AAA");
const participant = new Participant("11A", sample, { interviews });
//...
const updatedParticipant = participant.update({
  interviews: participant.interviews.update(
    i => i == interview ? updatedInterview : i
  )
})
```

**Important :** instance unicity is the rule ; this means that if an object does not change, its reference must not change either. This is garanteed by the `update` methods. In the following examples, the `update` method does not change the calling instances, thus they return the calling instance references.

```typescript
const interviewItem0 = new InterviewItem(pageItem, "Yes");
const interviewItem1 = interviewItem0.update({});
const interviewItem2 = interviewItem1.update({ value: "Yes" });
// interviewItem0 == interviewItem1 == interviewItem2

const coll0 = DomainCollection(new InterviewItem(pageItem, "Yes"), ...);
const coll1 = coll0.update(a => a);
const coll2 = coll1.update(
    a => a.pageItem == pageItem ? a.update({ value: "Yes" }) : a
);
// coll0 == coll1 == coll2
```
This rule has two major advantages :
 - if `a != b` then `a` and `b` hold different values. This simplifies and enhance performance of equality and inequality tests ;
 - when listening for object changes in the UI, no unnecessary events are raised due to reference changes although the values ​​remain the same.

The pattern for implementing domain objects in regard to this rule is :
```typescript
import { hasChanges } from "./domain";

class Domain {
  readonly prop: PropType;
  /* other properties */

  constructor(/* mandatory args */, kwargs?: Partial<Domain>) {
    /* process mandatory args */
    Object.assign(this, kwargs);
    Object.freeze(this);
  }

  update(kwargs: Partial<Domain>): Domain {
    if (!hasChanges(this, kwargs)) return this;
    return new Domain(/* mandatory args */, { ...this, ...kwargs });
  }
}
```
Where `hasChanges` is a helper function that detects changes between current object and the given update.

## Builders

The operations shown in the previous section examples can be done gracefuly thanks to fluent builders :

```typescript
const participant = new ParticipantBuilder(survey, "11A", sample);
  .interview(visit)
  .items(interviewItems)
  .get();
//...
const updatedParticipant = new ParticipantBuilder(survey, participant)
  .interview(visit)
  .item({ pageItem, value: false })
  .get();
```

The code above will update the interview related to the given visit with the new interview item for the given quetion.

## Discussion

Let's start with the drawbacks of this pattern.

### More code needed in some cases

This is obvious : more code is needed to update the `InterviewItem` objects as
the modifications must flow up to the root state which is mutable.

This complexity is isolated in builders that provides a fluent API that flows to to bottom.
Furthermore writing objects is generally a small part of the business logic.

Object construction code is reusable : `ParticipantBuilder` uses `InterviewBuilder` which in turn uses `InterviewItemBuilder`.
All this functions are necessary.

So while it is true that data modification code can be a little more complex to write,
it is small, reusable and easy to maintain.

### More garbage collection

Immutable objects are discarded and replaced by new ones.
Thus more objects are created and discarded affecting memory management and garbage collection.

This is not so obvious. JavaScript and Node.js use generational garbage collection algorithm
and immutable objects have good properties for such algorithm to work efficiently :

- new objects reference older ones rather than the oposample (when mutating objects the opposample happens) ;
- there is no circular dependencies such as A -> B -> A ;
- many immutable objects are allocated on the stack rather than on the heap (for instance locale mutable versions).

There is a lot of well written articles about this matter on the Internet.
Interested readers should use their favorite search engine !

### More operations

Replacing an object in a collection and producing a new collection
requires to scan entirely the old collection.

In Spiral, we deals with small data and collection. The extra cost is not really expensive.
_Developping software is always about tradeoffs_ and in many cases
implementation correctness and good design are more important than pure performance.
However, flawed implementation and bad design often leads to worst performance.

Anyway local optimizations can be written if necessary.

Now let's talk about the advantages of immutability.

### No side effects

It is common when modifying an object that the modifications are more extensive than one thinks.
With immutability this never happens and it may save hours of debugging.

### Easy undo

As we saw in the example pattern above, canceling modifications and returning to previous state is
very simple. No complex undo or memoization pattern is necessary.

### Less state management

When the state can be deeply mutated it must be deeply observed to track changes and fires relative events.
This is very commons in user interfaces which must be reactive to changes.
This requires many listeners objects that has to be properly allocated and disallocated.
This also implies CPU operations, memory management and garbage collection.

### Data flow

Immutability forces the developper to think differently about how data flow in the application.
As we have seen in the example above,
the data moves up together from the bottom to the top in the object hierarchy.
This is the opposample of the mutable approach which tends to iterate sequentially
from parent objects to underlying ones.

When used to these concepts developpers may write better and more generic code as they
position their vision at a higher level.
This overcomes the little extra complexity needed to produce new versions of immutable objects.
This is somehow subjective but I strongly beleive it leads to better code design.
