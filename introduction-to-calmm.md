[![Gitter](https://img.shields.io/gitter/room/calmm-js/chat.js.svg?style=flat-square)](https://gitter.im/calmm-js/chat)

# Introduction to Calm^2

Calmm or Calm^2, pronounced *"calm squared"*, is an architecture and a concrete
collection of libraries for implementing reactive UIs with JavaScript and
[React](https://facebook.github.io/react/).  It was born when we started a
project to implement a custom CMS for a customer.  To help with writing UI code
we wrote a few small libraries (a few hundred lines of code total):

* [`bacon.react.html`](https://github.com/calmm-js/bacon.react.html)
* [`bacon.atom`](https://github.com/calmm-js/bacon.atom)
* [`partial.lenses`](https://github.com/calmm-js/partial.lenses)
* [`atom.undo`](https://github.com/calmm-js/atom.undo)
* [`atom.storage`](https://github.com/calmm-js/atom.storage)

And we also use [Bacon](https://github.com/baconjs/bacon.js) and
[Ramda](http://ramdajs.com/).  Later, as an alternative to Bacon, we ported the
relevant libraries to [Kefir](http://rpominov.github.io/kefir/):

* [`kefir.react.html`](https://github.com/calmm-js/kefir.react.html)
* [`kefir.atom`](https://github.com/calmm-js/kefir.atom)

This document introduces the concepts behind those libraries and explains how
those libraries can be used to write concise, reactive UI code.

**Contents**

* [Imagine...](#imagine)
* [Goals](#goals)
* [The ingredients](#the-ingredients)
  * [Atoms](#atoms)
  * [Dependent computations](#dependent-computations)
    * [Observables](#observables)
    * [Combining properties](#combining-properties)
  * [Embedding Observables into VDOM](#embedding-observables-into-vdom)
    * [Dispelling the Magic](#dispelling-the-magic)
    * [Taking toll](#taking-toll)
  * [Lists of items](#lists-of-items)
  * [Lenses](#lenses)
    * [Lenses 101](#lenses-101)
    * [Combining Atoms and Lenses](#combining-atoms-and-lenses)
    * [Editable lists](#editable-lists)
* [The architecture](#the-architecture)
  * [Model :: JSON](#model--json)
  * [Meta :: JSON \-&gt; JSON](#meta--json---json)
  * [Atom :: Atom model :&gt; AbstractMutable model](#atom--atom-model--abstractmutable-model)
  * [LensedAtom :: AbstractMutable whole \-&gt; PLens whole part \-&gt; LensedAtom part](#lensedatom--abstractmutable-whole---plens-whole-part---lensedatom-part)
  * [&lt;Control/&gt; :: [Observable prop | AbstractMutable model | data]\* \-&gt; VDOM](#control--observable-prop--abstractmutable-model--data---vdom)
* [Related work](#related-work)
* [Going further](#going-further)

## Imagine...

Imagine that you could design and implement UI components in isolation as if
they were the root of the UI component hierarchy.  Such components would just
*play* on their own and you could just *plug* them into more complex
applications.  For real?  You are probably skeptic, because you have no doubt
seen many UI frameworks promise to give you such plug-and-play, but fail to
deliver.  Why did they fail?  They failed because they were not based on solid
means of *composition* and *decomposition*.

It is widely appreciated that being able to *compose* UI components from
primitive components, to containers, and all the way to whole apps is highly
desirable.  However, composition is not enough.  In order to make plug-and-play
possible, one must also have a truly effective solution to the problem of
*decomposing* state.  It must be possible to write individual components so that
they do not need to know about the whole application state.  Having both a means
of decomposing application state and composing UI components it is possible to
implement the desired composite components and just plug them into any app.

<p align="center"><img width="30%" height="30%" src="http://calmm-js.github.io/documentation/images/decompose-and-compose.svg"></p>

UI code is by no means trivial, so being able to modularize parts of UI code
into truly reusable components that play on their own and can be just plugged
in, without writing copious amounts of glue code, is highly desirable.  The term
[plug-and-play](https://en.wikipedia.org/wiki/Plug_and_play) was used to refer
to the idea that one could, essentially, compose a computer by plugging in
hardware modules without having to perform manual configuration.  That is very
much like what we want for UIs.

In this document we'll introduce the ingredients and the architecture of our
approach to reach the age old vision of making plug-and-play UI components.

## Goals

Before going into the details of our approach, let's articulate some criteria
based on which we've developed our approach.  Here are some of the things we
desire from our solution(s):

* Eliminate boilerplate and glue
* Avoid all-or-nothing or lock-in
* Be declarative where it matters
* Avoid unnecessary encoding of effects
* Structural programming
* Testability
* Efficiency

Let's open up those a little bit.

Copious amounts of boilerplate and glue code are indicators that there is in
fact scope for improvement.  More code tends to mean more details and more
places to make small oversights and introduce bugs.  Furthermore, eliminating
boilerplate and glue often leads to the discovery of useful abstractions.  So,
clearly, we want to avoid boilerplate and glue as much as possible.

An approach that has an all-or-nothing or lock-in effect is a hard sell.  Most
experienced programmers can probably tell a horror story or two based on having
to use a particular framework that they had to workaround in the most hideous
ways.  That is clearly something we want to avoid.  We want our approach to be
able to work both as subordinate and as a master in conjunction with other
approaches.

By declarative programming we refer to the idea of writing
[referentially transparent](https://en.wikipedia.org/wiki/Referential_transparency)
descriptions of programs or program components.  To use those declarations one
has to run or instantiate them.  Declarative programming tends to have many
desirable properties such as composability and testability, but that is not
given.

Fundamentalist declarative programming leads to having to encode all
side-effects.  This is something that is necessary in a language such as
Haskell, because its evaluation model does not admit performing side-effects
directly in a reasonable manner.  In most other languages we have a choice.  We
can either go for fundamentalist declarative programming and encode all
side-effects or we can choose to embrace side-effects when the benefits (such as
potentially improved testability) of full encoding seem smaller than the
disadvantages (such as higher-level of indirection and additional implementation
and interface complexity (e.g. complex types)).

By structural programming, which is a term that we've invented to describe an
idea, we mean that we want to be able to just straightforwardly translate the
structure of problems, such as the structure of the desired HTML, into
declarations.  Note that declarative programming isn't necessarily structural.
In some declarative approaches you may need to invent significant amounts of
structure that is not unique to the problem, which means that there are many
solutions to the problem.  This tends to go hand-in-hand with having to write
boilerplate or glue code.  When possible, it is typically preferable to pick one
effective way to do the plumbing and make that free of boilerplate.

Testability is especially important in a language such as JavaScript that is
notorious for its YOLO roots.  As much as possible, we want parts of our UI
logic to be unit-testable in addition to being amenable to other forms of
testing.  Besides having parts than can be tested, it is also important to avoid
having to make testing otherwise difficult.  For example, if an approach
requires everything to be asynchronous, it means that unit-tests also have to be
asynchronous, which tends to complicate things.

We also want our approach to be efficient.  But what does that mean?  It is
important to distinguish between performance and efficiency.  We want our
approach to be algorithmically efficient, e.g. by avoiding unnecessary work.
OTOH, sometimes good performance, especially in simple scenarios, can be
achieved using poor algorithms, but optimized code.  We, however, generally
prefer approaches that lend themselves to algorithmically efficient solutions.

Note that we have not explicitly listed simplicity as a goal.  We have yet to
see an approach to programming that claims to be complex and therefore
desirable.  But what is
[simple](https://twitter.com/RaezzM/status/708760222735704065)?  Is an approach
based on one
[Golden Hammer](https://en.wikipedia.org/wiki/Law_of_the_instrument) concept
simple?  Not necessarily.  In his talk,
[Simple made Easy](https://github.com/matthiasn/talk-transcripts/blob/master/Hickey_Rich/SimpleMadeEasy.md),
Rich Hickey makes the point that:

> [...] when you simplify things, you often end up with more things.

In our approach, we have identified several parts, all of
which are quite simple on their own and solve a particular problem well, but not
everything.  The selective composition of those parts, while perhaps difficult
to understand at first, is what gives the ability to solve a variety of problems
in UI programming.

## The ingredients

The basic ingredients of the Calm^2 approach can be summarized, in order of
importance, as follows:

1. We specify dependent computations as *observables*.
2. We *embed* observables directly into React VDOM.
3. We store state in modifiable observable *atoms*.
4. We use *lenses* to selectively decompose state in atoms.

The following subsections go into the details of the above ingredients.
However, let's briefly describe how these ingredients relate to our problem and
goals.

The use of observables to specify dependent computations is the key ingredient
that aims to solve the consistency problem.  It simply means that we express the
application state as observables.  When we need to compute something that
depends on that state, we use observable combinators to declare those
computations.  This means that those dependent computations are essentially
always consistent with respect to the state.  One could stop right here, because
observable combinators solve the consistency problem and are often seen as a
[Golden Hammer](https://twitter.com/andrestaltz/status/669601247708717056):
powerful enough for everything.  However, we do not stop here, because we don't
want to stop at consistency.  We also want to eliminate boilerplate and glue, we
want plug-and-play, structural programming (at higher levels) and efficiency.
None of these happens simply as a consequence of using observable combinators.

To make the use of observables convenient we extend VDOM to allow observables as
direct properties and children.  This eliminates a ton of boilerplate and glue
and helps to keep the code declarative, because the side-effects of observable
life-cycle management can be implemented once and for all by exploiting the
[React VDOM life-cycle mechanism](https://facebook.github.io/react/docs/component-specs.html).
This also allows us to obtain an amount of algorithmic efficiency, because we
can make it so that VDOM is updated
[incrementally](http://www.umut-acar.org/self-adjusting-computation) only when
the values produced by observables actually change.  Like with so called
[stateless React components](https://facebook.github.io/react/docs/reusable-components.html#stateless-functions),
we only use simple functions and never use `createClass`&mdash;that has been
done once and for all for us.  The React VDOM itself adheres to the structural
programming paradigm, which we preserve by embedding observables directly into
VDOM.

Storing state in modifiable observable atoms allows the state to be both
observed and modified.  Atoms are actually used to store
[immutable data](https://en.wikipedia.org/wiki/Immutable_object).  To modify an
atom means that the immutable data structure stored by the atom is replaced by
some new immutable data structure.  Modifications are serialized by the Atom
implementation.  Unlike in fundamentalist declarative approaches, we only
partially encode mutation of state.  Once a component is instantiated (or
mounted) it can directly attach callbacks to VDOM that call operations to modify
atoms.  This way we do lose a bit of testability.  However, this also makes the
implementation of components more direct as we don't have to encode it all and
implement new mechanisms to execute side-effects.

[Lenses](http://sebfisch.github.io/research/pub/Fischer+MPC15.pdf) are a form of
bidirectional programs.  In combination with atoms, lenses provide a way to
selectively decompose state to be passed to components.  A component, that is
given a modifiable atom to access state, does not need to know whether that atom
actually stores the root state or whether the atom is in fact only a small
portion of root state or even a property computed from state.  Lenses allow
state to be stored as a whole, to reap benefits such as
[trivial undo-redo](https://github.com/calmm-js/atom.undo), and then selectively
decomposed and passed step-by-step all the way trough the component hierarchy to
leaf components that are only interested in some specific part of the state.
Like VDOM, lenses enable structural programming, but in this case following the
structure of the data rather than that of the desired display elements.

The combination of atoms and lenses realizes the plug-and-play vision for
components.  The passing of state to components becomes concise and effective.

It must be emphasized that all parts of the above are essentially optional.  For
example, a component that only needs to display state, and doesn't need to
modify it, does not need atoms.  Such a component would likely still use
observables and embed those into VDOM and might even use lenses, because they
can be convenient even when one is only reading state.

At the end of the day, the end result of all this is just a set of React
components that you can use as parts of React based UIs that otherwise make no
use of the ingredients.  You can also use other React components as parts to
implement more complex components with these ingredients.

### Atoms

As described earlier, atoms are *not* the most important ingredient of Calm^2.
The most important ingredient is the use of observable combinators to express
dependent computations to solve the consistency problem.  However, atoms are a
simple way to create root observables, which is what we will need in order to
talk about dependent computations.  Therefore we will first take a brief look at
atoms and later take a another look when we talk about lenses.

Let's start by importing an implementation of Atoms.  In this introduction we
will be using [Kefir](http://rpominov.github.io/kefir/) as our observable
implementation.  Therefore we will import the Kefir based
[Atom](https://github.com/calmm-js/kefir.atom) implementation:

```js
import Atom from "kefir.atom"
```

There also exists a [Bacon](https://baconjs.github.io/) based
[Atom](https://github.com/calmm-js/bacon.atom) implementation, which is actually
the implementation that our original project uses in production, and it should
be possible to port the concept to pretty much any observable framework
(e.g. [Rx](https://github.com/Reactive-Extensions/RxJS)).

Atoms are essentially first-class storage locations or variables.  We can create
a new atom using the `Atom` constructor function:

```js
const elems = Atom(["earth", "water", "air", "fire"])
```

And we can get the value of an atom:

```js
elems.get()
// [ 'earth', 'water', 'air', 'fire' ]
```

And we can also set the value of an atom:

```js
elems.set(["observables", "embedding", "atoms"])
elems.get()
// [ 'observables', 'embedding', 'atoms' ]
```

However, as we will learn, getting and, to a lesser degree, setting the values
of atoms is generally discouraged, because doing so does not help to keep the
state of our program consistent.  There are better ways.

We can also modify the value of the atom, by passing it a function, that will be
called with the current value of the atom and must return the new value.  Here
is example where we use Ramda's
[`append`](http://ramdajs.com/0.19.0/docs/#append) to add an element to the
list:

```js
elems.modify(R.append("lenses"))
elems.get()
// [ 'observables', 'embedding', 'atoms', 'lenses' ]
```

The `modify` operation is, in fact, the primitive operation used to modify atoms
and `set` is just for convenience.  Modifications are executed one by one.  Each
operation to modify an atom therefore gets to see the current value of the atom
before deciding what the new value should be.  This helps to keep the state of
an atom consistent.

The term "atom" perhaps gives the idea that one should only use atoms to store
simple primitive values.  That is not the case.  The term "atom" is borrowed
from [Clojure](http://clojure.org/reference/atoms) and comes from the idea that
one only performs ["atomic"](https://en.wikipedia.org/wiki/Read-modify-write),
or [race-condition](https://en.wikipedia.org/wiki/Race_condition) free,
operations on individual atoms.  For this to work, the value stored by an atom
must be treated as an
[immutable value](https://en.wikipedia.org/wiki/Immutable_object).  We will
later see how lenses make it practical to store arbitrarily complex immutable
data structures in atoms.

Atoms are the
[independent variables](https://en.wikipedia.org/wiki/Dependent_and_independent_variables)
of our system.  They are used to hold the essential state that is being modified
by the UI.  But there really should be a tax on introducing new atoms to a
system.  Each time one creates a new atom, one should pause and think for a
moment:

* Is this really an independent variable?
  * *If not, it shouldn't be an atom.*
* Is this actually a substate of some existing variable?
  * *If true, then extend the state space of that variable instead.*
* Does the value of this variable need to change in response to a change of some
  other variable?
  * *If true, then this should be a dependent computation rather than a new atom.*

Overuse of atoms can lead to imperative spaghetti code, which is something that
we do not want.  One of the most common code review results in our experience
has been to notice that a particular atom could be eliminated completely, which
has simplified the code.

On the other hand, there are other forms of spaghetti, such as complicated
observable expressions.  We have, in fact, more than once, initially written
components using just observable computations that maintained state, using
`scan` or some other observable combinator, in response to events from UI
elements, because we thought it would be simpler.  Later we found out that by
identifying the essential root state and creating an atom for that state we were
able to simplify the logic significantly&mdash;typically by a factor of about
two.

### Dependent computations

Atoms, alone, do not solve the consistency problem.  Suppose you store a list of
items in an atom and want to display the items.  How do you ensure that the view
of items is always consistent with respect to the items stored in the atom?  The
view is essentially formed by a computation that is
[dependent](https://en.wikipedia.org/wiki/Dependent_and_independent_variables)
on the state of the atom and, because atoms are observable, we can express such
computations using observable combinators.

#### Observables

Atoms are observable, but there are, in fact, many kinds of observables.  The
purpose of this document is not to serve as an extensive introduction to
programming with observables.  There are many introductions, including full
length books, to programming with observables already.  However, in order to put
things into perspective, we take a brief look at a hierarchy of concepts that we
choose to categorize observables into:

<p align="center"><img width="40%" height="40%" src="http://calmm-js.github.io/documentation/images/Observables.svg"></p>

The basic [pattern](https://en.wikipedia.org/wiki/Observer_pattern) behind
observables is very old.  Basically, and to simplify a bit, an **Observable** is
just an object that an *observer* can *subscribe to* in order to get
notifications that include a value.  The semantics of when exactly you get such
notifications is one way to distinguish observables:

* A **Stream** gives you notifications only when some discrete event occurs.
  Streams know nothing about past events and do not have a current
  value&mdash;when you subscribe to a stream, you will not get a notification
  until some new event occurs.

* A **Property** has the concept of a current value.  In other words, properties
  can recall the value that they previously notified their subscribers with.
  When you subscribe to a property, and assuming the property has a value, you
  will subsequently get a notification.  After that, just like with streams, you
  will get notifications whenever new events occur.

The concepts **Observable**, **Stream** and **Property** can be directly found
in Bacon and [Kefir](http://rpominov.github.io/kefir/#about-observables), but
many other observable frameworks, such as Rx, which can be considered as a lower
level framework, do not identify the concepts of streams and properties.
However, in most of those other frameworks it is possible to create observables
that have the same or nearly same semantics as streams and properties.  Cutting
a few corners, in Rx, for example, streams can be obtained by applying
`.share()` and properties can be obtained by applying `.shareReplay(1)`.

As the above diagram shows, an **Atom** is also a **Property**.  In addition to
having a current value, an atom also just directly allows the current value to
be modified using the `modify` operation introduced previously.  It turns out
that in order to support such modification, it isn't actually necessary to store
the value.  We can introduce the concept of a **LensedAtom** that doesn't
actually store a value, but, rather, only declares a way to get and modify some
part of an actual root **Atom**.  For this reason we also identify the concept
of an **AbstractMutable**, which is actually the concept that most of our code
using atoms depends upon: we don't typically care whether we are given an actual
root atom or a lensed atom.  Once created, the interfaces, and, essentially, the
semantics of **AbstractMutable**, **Atom** and **LensedAtom** are the same.  To
talk more about **LensedAtom**s we need to introduce the concept of lenses,
which are the topic of a later section.

#### Combining properties

Both streams and properties, as described in the previous section, are relevant
to programming in Calm^2.  However, we mostly make use of properties.  One
reason for this is that, when we create components that display state obtained
from observables, we expect that, when such components are hidden or removed
from view and subsequently redisplayed, they will actually display a value
immediately rather than only after notifications of new values.  So, we
typically mostly use observables that have the concept of a current value and
those are properties.

Observable frameworks such as Bacon and Kefir provide a large number of
combinators for observables.  While most of those combinators have uses in
conjunction with Calm^2, we are frequently only interested in combining, with
some function, a bunch of properties, possibly contained in some data structure,
into a new property that is kept up-to-date with respect to the latest values of
the original properties.  We also do a lot of this.  Everywhere.  That is one of
the two main reasons why we have defined a generalized combinator for that use
case.  Let's just import the Kefir based version of the combinator from the
[`kefir.react.html`](https://github.com/calmm-js/kefir.react.html) library:

```js
import K from "kefir.react.html"
```

There is also a similar Bacon based combinator in the
[`bacon.react.html`](https://github.com/calmm-js/kefir.react.html) library.

The basic semantics of the combinator can be described as

```js
K(x1, ..., xN, fn) === combine([x1, ..., xN], fn).skipDuplicates(equals)
```

where [`combine`](http://rpominov.github.io/kefir/#combine) and
[`skipDuplicates`](http://rpominov.github.io/kefir/#skip-duplicates) come from
Kefir and [`equals`](http://ramdajs.com/0.19.0/docs/#equals) from Ramda.  We
skip duplicates, because that avoids some unnecessary updates.  Ramda's `equals`
provides a semantics of equality that works, for immutable data, just the way we
like.

Suppose, for example, that we define two atoms representing independent
variables:

```js
const x = Atom(1)
const y = Atom(2)
```

Using `K` we could specify their sum as a
[dependent variable](https://en.wikipedia.org/wiki/Dependent_and_independent_variables)
as follows:

```js
const x_plus_y = K(x, y, (x, y) => x + y)
```

To see the value, we can use Kefir's
[`log`](http://rpominov.github.io/kefir/#log) operation:

```js
x_plus_y.log("x + y")
// x + y <value:current> 3
```

Now, if we modify the variables, we can see that the sum is recomputed:

```js
x.set(-2)
// x + y <value> 0
y.set(3)
// x + y <value> 1
```

We can, of course, create computations that depend on dependent computations:

```js
const z = Atom(1)
const x_plus_y_minus_z = K(x_plus_y, z, (x_plus_y, z) => x_plus_y - z)
x_plus_y_minus_z.log("(x + y) - z")
// (x + y) - z <value:current> 0
x.modify(x => x + 1)
// x + y <value> 2
// (x + y) - z <value> 1
```

The `K` combinator is actually somewhat more powerful, or complex, than what the
previous basic semantics claimed.  First of all, as we are using `K` to compute
properties to be embedded to VDOM, we don't usually care whether we are really
dealing with constants or with observable properties.  For this reason any
argument of `K` is allowed to be a constant.  For example:

```js
const a = 2
const b = Atom(3)
K(a, b, (a, b) => a * b).log("a * b")
// a * b <value:current> 6
```

Even further, when all the arguments to `K` are constants, the value is simply
computed immediately:

```js
K("there", who => "Hello, " + who + "!")
// 'Hello, there!'
```

This reduces the construction of unnecessary observables.

The second special feature of `K` is that when the constructor of an argument is
`Array` or `Object`, then that argument is treated as a template that may
contain observables.  The values from observables found inside the template are
substituted into the template to form an instance of the template that is then
passed to the combiner function.  For example:

```js
K({i: Atom(1), xs: ["a", Atom("b"), Atom("c")]}, r => r.xs[r.i]).log()
// result <value:current> b
```

In other words, `K` also includes the functionality of
[`combineTemplate`](https://github.com/baconjs/bacon.js#bacon-combinetemplate).

Unlike with Kefir's [`combine`](http://rpominov.github.io/kefir/#combine), the
combiner function is also allowed to be an observable.  For example:

```js
const f = Atom(x => x + 1)
K(1, f).log("result")
// result <value:current> 2
f.set(x => x * 2 + 1)
// result <value> 3
```

Finally, like with Kefir's [`combine`](http://rpominov.github.io/kefir/#combine)
the combiner function is optional.  If the combiner is omitted, the result is an
array.  For example:

```js
K()
// []
K(1, 2, 3)
// [ 1, 2, 3 ]
K({x: Atom(1)}, 2, [Atom(3)]).log("result")
// result <value:current> [ { x: 1 }, 2, [ 3 ] ]
```

Phew!  This might be overwhelming at first, but the `K` combinator gives us a
lot of leverage to reduce boilerplate and also helps by avoiding some
unnecessary updates.  The Kefir based implementation of `K` is actually
carefully optimized for space.  For example, `K(x, f)`, which, assuming `x` is a
property and `f` is a function, is equivalent to
`x.map(f).skipDuplicates(equals)`.  Of those two, `K(x, f)` takes less space.

It should be mentioned, however, there is nothing magical about `K`.  We use it,
because it helps to eliminate boilerplate.  We also use other observable
combinators when they are needed.  There is no requirement in Calm^2 to use
`K`&mdash;all the same functionality can be obtained by using just basic
observable combinators.  However, avoiding boilerplate isn't the only reason to
use `K`.  As we will see shortly, it also helps to keep things easier to
understand.

### Embedding Observables into VDOM

What we ultimately want to do with observables is to create VDOM that contains
values obtained from the observables.  One could use the ordinary observable
combinators for that purpose, but it leaves a lot to be desired.  First of all,
we would then need to somehow manage the subscriptions of observables and be
careful to avoid leaks.  Combining observables manually would also add a lot of
boilerplate code.

Instead of manually combining observables to form VDOM expressions, we choose to
extend VDOM to admit observables as properties and children.  Consider the
following example:

```jsx
const Hello = ({who}) => <div>Hello, {who}!</div>
```

If we'd create VDOM that specifies an ordinary constant for the `Hello` class

```jsx
<Hello who="world"/>
```

it would render as expected.  If, instead, we'd specify an observable

```jsx
const who = Atom("world")
...
<Hello who={who}/>
```

and try to render it, the result would be an error message.  Indeed, React's
`div` (pseudo) class knows nothing about observables.  What if we had a function
that, given any React class, would return a class that renders the same, but
also works with observables?  Let's import such a function

```js
import {fromClass} from "kefir.react.html"
```

apply it to `div`

```js
const Kdiv = fromClass("div")
```

and redefine our component

```jsx
const Hello = ({who}) => <Kdiv>Hello, {who}!</Kdiv>
```

Now both

```jsx
<Hello who="world"/>
```

and

```jsx
<Hello who={who}/>
```

would render the same.  If we'd assign to `who`, e.g. `who.set("there")` the
latter element would be rerendered.

The default import of the
[`kefir.react.html`](https://github.com/calmm-js/kefir.react.html) library

```js
import K from "kefir.react.html"
```

which we introduced in the previous section as a generalized combine combinator,
also contains prelifted versions of all the pseudo HTML classes that React
provides and the same goes for the Bacon version:
[`bacon.react.html`](https://github.com/calmm-js/bacon.react.html).  Using it we
could write the `Hello` class as follows:

```jsx
const Hello = ({who}) => <K.div>Hello, {who}!</K.div>
```

Now that we have the tools for it, let's create something just a little bit more
interesting.  Here is a toy React class that converts Celcius to Fahrenheit:

```jsx
const Converter = ({value = Atom("0")}) =>
  <K.p>
    <K.input onChange={e => value.set(e.target.value)}
             value={value}/>°C is {K(value, c => c * 9/5 + 32)}°F
  </K.p>
```

Using the
[`bind`](https://github.com/calmm-js/kefir.react.html#bind-attribute-template)
helper from `kefir.react.html`

```js
import {bind} from "kefir.react.html"
```

we can shorten the `Converter` further:

```jsx
const Converter = ({value = Atom("0")}) =>
  <K.p><K.input {...bind({value})}/>°C is {K(value, c => c * 9/5 + 32)}°F</K.p>
```

This latter version using `bind` evaluates to the exact same functionality as
the previous version that uses `onChange`.  `bind({x})` is equivalent to `{x,
onChange: e => x.set(e.target.x)}`.

You can find the above version live
[here](http://calmm-js.github.io/kral-examples/public/index.html#converter).

#### Dispelling the Magic

There is a very simple reason for why it is at all possible to embed observables
into VDOM and why, in fact, it is actually quite simple.  The reason is that
React classes are [observers](https://en.wikipedia.org/wiki/Observer_pattern)
that support a
[life-cycle mechanism](https://facebook.github.io/react/docs/component-specs.html)
that allows them to be robustly combined with observables.

React's VDOM itself is just a tree of JavaScript objects.  That tree can be
traversed and its elements analyzed.  This allows us to find the observables
from VDOM.  Inside the
[`kefir.react.html`](http://calmm-js.github.io/kefir.react.html) library is an
implementation of a React class that implements the life-cycle methods:

```js
...
componentWillReceiveProps(nextProps) {
  this.doUnsubscribe()
  this.doSubscribe(nextProps)
},
componentWillMount() {
  this.doUnsubscribe()
  this.doSubscribe(this.props)
},
shouldComponentUpdate(np, ns) {
  return ns.rendered !== this.state.rendered
},
componentWillUnmount() {
  this.doUnsubscribe()
  this.setState( /* empty state */ )
},
render() {
  return this.state.rendered
},
doSubcribe( /* ... */ ) {
  // Extracts observables from own VDOM properties and direct children.
  // Combines them into an observable skipping duplicates and producing VDOM.
  // Subscribes to the VDOM observable to setState with the results.
},
doUnsubscribe( /* ... */ ) {
  // Unsubscribes from the observable created by doSubscribe.
}
...
```

Our initial implementations of this were actually very simple.  You can find one
version
[here](https://github.com/polytypic/bacon.react/blob/master/src/bacon.react.js).
We basically just used Bacon's
[combineTemplate](https://github.com/baconjs/bacon.js#bacon-combinetemplate).
This turned out to be the wrong idea, however, because it eliminates observables
arbitrarily deep inside the VDOM rather than just those that appear as own
properties or as direct children.  This seemed convenient at first, but it does
not work compositionally.

#### Taking toll

Is this a good idea at all?  We believe it is and here are some reasons why:

* Observables solve the consistency problem quite nicely.
* Observables with Atoms are powerful enough for managing arbitrary state.
* Embedding observables into VDOM makes it convenient to use observables.
* Embedding observables allows VDOM to be updated incrementally and efficiently.

Embedding observables into VDOM practically eliminates the need to write new
React classes using `createClass` or by inheriting from `React.Component`.  It
also practically eliminates the need to write specialized
`shouldComponentUpdate` implementations.  Our production project has exactly
zero examples of those.

Embedding observables allows us to think almost like we were always using
[stateless components](https://facebook.github.io/react/docs/reusable-components.html#stateless-functions)
and this actually extends to the beneficial properties of stateless components.
For example, React's
[documentation](https://facebook.github.io/react/docs/more-about-refs.html#the-ref-callback-attribute)
mentions a gotcha related to the use of inline function expressions as arguments
to the `ref` property:

> Also note that when writing refs with inline function expressions as in the
> examples here, React sees a different function object each time so on every
> update, ref will be called with null immediately before it's called with the
> component instance.

If you write a custom `render` method that returns a VDOM expression containing
an inline function expression for `ref`, React will call those inline functions
on every update&mdash;*Oops!* Issues such as these are eliminated by our
approach.

### Lists of items ###

We previously mentioned the problem of displaying a list of items.  Let's
suppose we indeed have a list of items, say names, and we want to create a
component that displays such a list.  Here is perhaps a straightforward
solution:

```jsx
const ListOfNames = ({names}) =>
  <K.ul>
    {K(names, R.map(name =>
       <li key={name}>{name}</li>))}
  </K.ul>
```

Note that above we use `K` when we are dealing with an observable and we use
Ramda's [`map`](http://ramdajs.com/0.19.0/docs/#map), which conveniently allows
us to directly skip to manipulating individual items from a list.

The above already works.  We can give `List` an observable that produces an
array of names

```jsx
const names = Atom(["Markus", "Matti"])
...
<ListOfNames {...{names}}/>
```

and if we would modify the list of names

```js
names.modify(R.append("Vesa"))
```

the list would be rerendered.

In many cases this is good enough, but consider what happens when the list
changes?  The entire list of VDOM is recomputed.  In a trivial case like this,
it is not much of a problem, but with more complex components per item, it might
lead to unacceptable performance.

Fortunately this is not difficult to fix.  We just cache the VDOM between
changes.  [`kefir.react.html`](https://github.com/calmm-js/kefir.react.html)
provides the
[`fromIds`](https://github.com/calmm-js/kefir.react.html#incremental-arrays-fromids)
observable combinator for this purpose:

```js
import {fromIds} from "kefir.react.html"
```

Using it we can rewrite the `ListOfNames` component:

```jsx
const ListOfNames = ({names}) =>
  <K.ul>
    {fromIds(names, name =>
       <li key={name}>{name}</li>)}
  </K.ul>
```

The documentation of
[`fromIds`](https://github.com/calmm-js/kefir.react.html#incremental-arrays-fromids)
gives more details, but this version of `ListOfNames` works efficiently in the
sense that, when names in the list change, VDOM is computed only for new names
with respect to the previously displayed list of names.  What makes that
possible is that the expression

```jsx
                    name =>
       <li key={name}>{name}</li>
```

specifies a referentially transparent function, which allows us to use `fromIds`
to cache the results.

Our Kefir and Calm^2 based [TodoMVC](https://github.com/calmm-js/kral-todomvc)
also just uses `fromIds` and seems to be one of the fastest and one of the most
concise TodoMVC implementations around.  To test the performance of that TodoMVC
implementation, you can run the following script in your browser's console to
populate the storage with 2000 todo items:

```js
var store = []
for (var i = 1; i <= 2000; ++i)
  store.push({title: 'Todo' + i, completed: false})
localStorage.setItem('todos-react.kefir', JSON.stringify({value: store}))
```

It pays off to be declarative where it matters.

There is more to say about lists, but we defer further discussion until later.

### Lenses

To motivate the introduction of lenses, let's first create a simple text input
component.  Here is the one-liner using
[`kefir.react.html`](https://github.com/calmm-js/kefir.react.html) and assuming
that the `value` property will be an Atom:

```jsx
const TextInput = ({value}) => <K.input {...bind({value})}/>
```

If we now create an atom

```js
const text = Atom("initial")
```

and give it as the `value` property to `TextInput`

```js
<TextInput value={text}/>
```

it gives us a text input that we can use to edit the value of the `text` atom.

But could we reuse the `TextInput` component to change the list of names
introduced in the previous section editable?  In that case the atom contained a
list of names&mdash;not just a single name.  We somehow need to pass a single
name from a list of names to the `TextInput` in a modifiable form.  Using lenses
we can do that.

#### Lenses 101

So, what are lenses?  Lenses are a form of composable bidirectional
computations.  For our purposes it is mostly sufficient to think that lenses
allow us to compose a path from the root of some data structure to some element
of said data structure and that path can be used to both view and update the
element.

Let's see how lenses work in practice.  First we import the
[`partial.lenses`](https://github.com/calmm-js/partial.lenses) library:

```js
import P, * as L from "partial.lenses"
```

Now, consider the following JSON:

```js
const db = {"classes": [{"id": 101, "level": "Novice"},
                        {"id": 202, "level": "Intermediate"},
                        {"id": 303, "level": "Advanced"}]}
```

We can specify the lens

```js
L.compose(L.prop("classes"),
          L.index(0))
```

to identify the object

```js
{"id": 101, "level": "Novice"}
```

within `db`.  We can confirm this by using `L.view` to view through the lens:

```js
L.view(L.compose(L.prop("classes"),
                 L.index(0)),
       db)
// { id: 101, level: 'Novice' }
```

If viewing elements were the only thing that lenses were good for they would be
rather useless, but they also allow us to update elements deep inside data
structures.  Let's update the level of the first class:

```js
L.set(L.compose(L.prop("classes"),
                L.index(0),
                L.prop("level")),
      "Introduction",
      db)
// { classes:
//    [ { level: 'Introduction', id: 101 },
//     { id: 202, level: 'Intermediate' },
//     { id: 303, level: 'Advanced' } ] }
```

The `L.set` operation on lenses is a referentially transparent function that
does not mutate the target value&mdash;it merely creates a new value with the
specified changes.

Like with observables, we use lenses a lot, which means that there is value in
keeping lens definitions concise.  For this purpose we abbreviate
* `L.prop(string)` as `string`,
* `L.index(integer)` as `integer`, and
* `L.compose(l, ...ls)` as `P(l, ...ls)`.

Using the abbreviations, the `set` expression from the previous example can be
rewritten as:

```js
L.set(P("classes", 0, "level"),
      "Introduction",
      db)
```

This is really the absolute minimum that we need to know about lenses to go
forward.  Partial lenses can actually do *much more* than just view and update
elements given a static path.  See the documentation of the
[`partial.lenses`](https://github.com/calmm-js/partial.lenses) library for
details.

#### Combining Atoms and Lenses

Where things get really interesting is that Atoms support lenses.    Recall
the list of names:

```js
const names = Atom(["Markus", "Matti"])
```

To create a **LensedAtom**, that uses lenses to decompose state, we just call
the [`.lens`](https://github.com/calmm-js/kefir.atom#atomlensl-ls) method with
the desired lens:

```js
const firstOfNames = names.lens(L.index(0))
```

Let's take a look at what is going on by using `.log`:

```js
names.log("names")
// names <value:current> [ 'Markus', 'Matti' ]
firstOfNames.log("first of names")
// first of names <value:current> Markus
```

If we now modify either `firstOfNames` or `names`, the changes are reflected in
the other:

```js
names.set(["Vesa", "Matti"])
// names <value> [ 'Vesa', 'Matti' ]
// first of names <value> Vesa
firstOfNames.set("Markus")
// names <value> [ 'Markus', 'Matti' ]
// first of names <value> Markus
```

Note that the `.lens` method of atoms and lensed atoms does not create *new*
mutable state, it merely creates a reference to existing state, namely to the
state, represented as an immutable data structure, being referred to by the root
atom.  This means that we can regard the `.lens` method as a referentially
transparent function.

#### Editable lists

Let's then proceed to make an editable list of names.  Here is one way to do it:

```js
const ListOfNames = ({names}) =>
  <K.ul>
    {fromIds(K(names, R.pipe(R.length, R.range(0))), i =>
       <li key={i}><TextInput value={names.lens(i)}/></li>)}
  </K.ul>
```

Aside from putting the `TextInput` in place, we changed the way elements are
identified for `fromIds`.  In this case we identity them by their index.  The
expression `R.pipe(R.length, R.range(0))` simply uses the functions
[`pipe`](http://ramdajs.com/0.19.0/docs/#pipe),
[`length`](http://ramdajs.com/0.19.0/docs/#length) and
[`range`](http://ramdajs.com/0.19.0/docs/#range) from Ramda to create a function
that maps a list `[x0, ..., xN]` to a list of indices `[0, ..., N]`.  Those
indices are then used as the ids.

## The architecture

Ingredients are a start, but not enough.  To bake a cake, we need a proper
recipe.  In fact, when we started using the Calm^2 ingredients, we had some
ideas on how we could break down UI logic and combine the ingredients to solve
problems, but it wasn't until we had gathered some experience using them that we
started to see how to really do that effectively.  For example, we didn't
initially understand the full potential of combining lenses and atoms.  We also
unnecessarily complected models with observables.

<p align="center"><img width="30%" height="30%" src="http://calmm-js.github.io/documentation/images/CALMM.svg"></p>

### Model :: JSON

In the Calm^2 architecture, model refers to the object or state being displayed
by and manipulated through the UI.  Usually it is just a JSON object or array
that adheres to some schema.  Most importantly, the model is just simple data.
The model knows nothing about observables or anything else about the UI.  It
just is.

### Meta :: JSON -> JSON

Meta refers to operations on the model.  The term "meta" literally refers to the
idea that it is
["about the model"](https://en.wikipedia.org/wiki/Meta#About_.28its_own_category.29).
The operations are just simple synchronous functions, lenses and other kinds of
operations on JSON.  The meta is typically represented as either an object or a
module containing functions or a combination of both.

The fact that models are just simple data and meta is just simple operations on
said data means that meta becomes extremely simple to test.  One does not need
to worry about asynchronicity or observables.  Mocking the model is as simple as
writing a JSON expression.

### Atom :: Atom model :> AbstractMutable model

Atoms take care of serializing access to their contents.  They are created by
giving some initial contents.  Atoms then allow the contents to be shared,
dependent upon and modified.  In the context of Calm^2, the atoms contain the
application state and the contents are modified using operations from meta
objects.

Atoms can be created in a variety of ways and with a variety of properties, such
as [undo-redo](https://github.com/calmm-js/atom.undo) capability or local
[storage](https://github.com/calmm-js/atom.storage) persistence or both, and
then passed to controls that do not necessarily need to know about the special
properties of the atom or about other controls that have been passed the same
atom.

### LensedAtom :: AbstractMutable whole -&gt; PLens whole part -&gt; LensedAtom part

Atoms can also be created from existing atoms by specifying a lens through which
the contents of the existing atom are to be viewed and mutated.  Unlike when
creating a new atom with an initial value, an expression to create a lensed atom
is referentially transparent.

### &lt;Control/&gt; :: [Observable prop | AbstractMutable model | data]* -&gt; VDOM

A control is a function from observables, modifiables and constants to VDOM.

We don't actually directly invoke the `Control` function.  Instead we construct
VDOM that contains a reference to the function and the actual arguments with
which the control is to be called with.  In other words, the evaluation of a JSX
expression, `<Control {...arguments}/>`, to create VDOM, does not actually
invoke the `Control` function, but it does evaluate the `arguments`.  The
function is invoked if and when the component is actually mounted for display.
This latent invocation has the effect that as long as the expressions that we
use to compute the arguments are referentially transparent then so is the VDOM
expression as a whole.

In Calm^2 we choose to keep VDOM expressions referentially transparent.  Note
that basic observable combinators are referentially transparent and so is the
act of creating a lensed atom.  By keeping VDOM expressions referentially
transparent, we gain important benefits such as being able to cache VDOM and
being able to compose VDOM and components liberally.  However, once a control is
mounted, the function is invoked and the control as a whole is allowed to
perform side-effects.

## Related work

> Most papers in computer science describe how their author learned what someone
> else already knew. &mdash; Peter Landin

Ideas do not exist in vacuum.  In fact, we make absolutely no claim of
originality in any way.  All of the ingredients of Calm^2 are actually old news:

* Observables for dependent computations
* Embedding observables into VDOM
* Atoms for storing state
* Lenses for decomposing state

In fact, much of Calm^2 was initially shaped by a search of way to make it
possible to program in ways similar to what could be done using
[Reagent](https://reagent-project.github.io/) and
[WebSharper UI.Next](http://websharper.com/docs/ui.next).  The idea of combining
lenses and atoms came from
[Bacon.Model](https://github.com/baconjs/bacon.model), which we used initially.
Later we learned that WebShared UI.Next
[added support for lenses](http://websharper.com/blog-entry/4547/websharper-3-4-14-released)
roughly just two months before our project started.
[Great ideas are discovered!](https://en.wikipedia.org/wiki/Multiple_discovery)

## Going further

Found the concepts intriguing?  Not yet quite sure how things really fit
together?  The logical next step is to read:

* [Tutorial: Composing Components with Calm^2](tutorial-composing-components-with-calmm.md)

Our production codebase is unfortunately not publicly available.  However, we
have built some small examples:

* [Examples](https://github.com/calmm-js/kral-examples)
* [TodoMVC](https://github.com/calmm-js/kral-todomvc)

For questions and discussion join us at:
[![Gitter](https://img.shields.io/gitter/room/calmm-js/chat.js.svg?style=flat-square)](https://gitter.im/calmm-js/chat)
