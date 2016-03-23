**This document is WORK-IN-PROGRESS.  Feedback is welcome!**

# Introduction to Calm^2

Calmm or Calm^2, pronounced "calm squared", is an architecture and a concrete
collection of libraries for implementing reactive UIs.  It was born when we
started a project to implement a custom CMS for a customer.  The customer
requested that we use JavaScript and [React](https://facebook.github.io/react/),
but we were otherwise given free hands to choose the tools for the job.

## What is difficult in UI programming?

Personally I find styling, or CSS, to be a zone of discomfort, but, fortunately,
the undesirable side-effects that CSS can cause are rather limited.  But what is
really difficult?

**Maintaining consistent state in the face of async inputs.**

That is what we believe is inherently difficult in UI programming.  All UIs must
maintain some internal state, must maintain the consistency of that state and
must project a consistent view of that state to the user.  We further want UIs
to be mostly non-modal and, especially in web apps, we also have lots of
asynchronous operations happening&mdash;some of which may be out of the control
of our UI code.  This means that requests to change the state of the UI can come
from a multitude of sources and at the most inconvenient moments.

In this particular document we will try to avoid referring to other concrete
approaches to implementing UIs, but, in our opinion, many approaches to UI
programming are motivated by this difficulty of maintaining consistent state and
have picked a particular way to solve that problem that characterizes the
approach.  For example, an approach might be to route all changes to state via a
dedicated set of operations, serialize the execution of said operations and
notify other parts of UI after each change of state.

## Goals

When developing or choosing an approach out of many potential approaches, it may
help to articulate some criteria for making choices.  Here are some of the
things we desire from our solution(s):

* Eliminate boilerplate and glue
* Avoid all-or-nothing or lock-in
* Be declarative where it matters
* Avoid unnecessary encoding of effects
* Structural programming
* Plug-and-play components
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

UI code is by no means trivial, so being able to modularize parts of UI code
into reusable components that play on their own and can be just plugged in,
without writing copious amounts of glue code, is highly desirable.  The term
plug-and-play was used to refer to the idea that one could, essentially, compose
a computer by plugging in hardware modules without having to perform manual
configuration.  That is very much like what we want for UIs.

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
desirable.  But what is simple?  Is an approach based on one
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
4. We use *lenses* to selectively transmit state via atoms.

The following subsections go into the details of the above ingredients.
However, let's briefly describe how these ingredients relate to our problem and
goals.

The use of observables to specify dependent computations is the key ingredient
that aims to solve the consistency problem.  It simply means that we express the
UI state as observables.  When we need to compute something that depends on that
state, we use observable combinators to declare those computations.  This means
that those dependent computations are essentially always consistent with respect
to the state.  One could stop right here, because observable combinators solve
the consistency problem and are often seen as a Golden Hammer: powerful enough
for nearly everything.  However, we do not stop here, because we don't want to
stop at consistency.  We also want to eliminate boilerplate and glue, we want
plug-and-play, structural programming (at higher levels) and efficiency.  None
of these happens simply as a consequence of using observable combinators.

To make the use of observables convenient we extend VDOM to allow observables as
direct properties and children.  This eliminates a ton of boilerplate and glue
and helps to keep the code declarative, because the side-effects of observable
life-cycle management can be implemented once and for all by exploiting the
React VDOM life-cycle mechanism.  This also allows us to obtain an amount of
algorithmic efficiency, because we can make it so that VDOM is updated only when
the values produced by observables actually change.  Like with so called
[stateless React components](https://facebook.github.io/react/docs/reusable-components.html#stateless-functions),
we only use simple functions and never use `createClass`&mdash;that has been
done once and for all for us.  The React VDOM itself adheres to the structural
programming paradigm, which we preserve by embedding observables directly into
VDOM.

Storing state in modifiable observable atoms allows the state to be both
observed and modified.  Atoms are actually used to store immutable data.  To
modify an atom means that the immutable data structure stored by the atom is
replaced by some new immutable data structure.  Modifications are serialized by
the Atom implementation.  Unlike in fundamentalist declarative approaches, we
only partially encode mutation of state.  Once a component is instantiated (or
mounted) it can directly attach callbacks to VDOM that call operations to modify
atoms.  This way we do lose a bit of testability.  However, this also makes the
implementation of components more direct as we don't have to encode it all and
implement new mechanisms to execute side-effects.

In combination with atoms, lenses provide a way to selectively transmit state to
components.  A component, that is given a modifiable atom to access state, does
not need to know whether that atom actually stores the root state or whether the
atom is in fact only a small portion of root state or even a property computed
from state.  Lenses allow state to be stored as a whole, to reap benefits such
as [trivial undo-redo](https://github.com/calmm-js/atom.undo), and then
selectively transmitted step-by-step trough the component hierarchy to leaf
components that are only interested in some specific part of the state.  Like
VDOM, lenses enable structural programming, but in this case following the
structure of the data rather than that of the desired display elements.

The combination of atoms and lenses realizes the plug-and-play vision for
components.  The transmission of state to components becomes concise and
effective.

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
atoms and later take a closer look when we talk about lenses.

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
(e.g. Rx).

Atoms are essentially first-class storage locations or variables.  We can create
a new atom using the `Atom` constructor function:

```js
const elems = Atom([0, 1, 2])
```

And we can get the value of an atom:

```js
> elems.get()
[0, 1, 2]
```

And we can also set the value of an atom:

```js
> elems.set([1, 2])
> elems.get()
[1, 2]
```

However, as we will learn, getting and, to a lesser degree, setting the values
of atoms is generally discouraged, because doing so does not help to keep the
state of our program consistent.  There are better ways.

We can also modify the value of the atom, by passing it a function, that will be
called with the current value of the atom and must return the new value:

```js
> elems.modify(xs => xs.concat([3]))
> elems.get()
[1, 2, 3]
```

The `modify` operation is, in fact, the primitive operation used to modify atoms
and `set` is just for convenience.  Modifications are executed one by one.  Each
operation to modify an atom therefore gets to see the current value of the atom
before deciding what the new value should be.  This helps to keep the state of
an atom consistent.

The term "atom" perhaps gives the idea that one should only use atoms to store
simple primitive values.  That is not the case.  The term "atom" is borrowed
from [Clojure](http://clojure.org/reference/atoms) and comes from the idea that
one only performs "atomic", or race-condition free, operations on individual
atoms.  For this to work, the value stored by an atom must be treated as an
immutable value.  We will later see how lenses make it practical to store
arbitrarily complex immutable data structures in atoms.

Atoms are the variables of our system.  They are used to hold the essential
state that is being modified by the UI.  But there really should be tax on
introducing new atoms to a system.  Each time one creates a new atom, one should
pause and think for a moment:

* Is this really an independent variable?  *If not, it shouldn't be an atom.*

* Is this actually a substate of some existing variable?  *If true, then extend
  the state space of that variable instead.*

* Does the value of this variable need to change in response to a change of some
  other variable?  *If true, then this should be a dependent computation rather
  than a new atom.*

Overuse of atoms can lead to imperative spaghetti code, which is something that
we do not want.  One of the most common code review results in our experience
has been to notice that a particular atom could be eliminated completely, which
has simplified the code.

On the other hand, there are other forms of spaghetti, such as complicated
observable expressions.  We have, in fact, more than once, initially written
components using just observable computations that maintained state, using
`scan` or some other observable combinator, in response to events from UI
elements, because we thought it would be simpler.  Later we have found that by
identifying the essential root state and creating an atom for that state we were
able to simplify the logic significantly&mdash;typically by a factor of about
two.

Always look for *simple solutions* and be wary of holding onto a
[Golden Hammer](http://c2.com/cgi/wiki?GoldenHammer).

### Dependent computations

<p align="center"><img width="40%" height="40%" src="http://calmm-js.github.io/documentation/images/Observables.svg"></p>

**This document is WORK-IN-PROGRESS.  Feedback is welcome!**

### Embedding Observables into JSX

**This document is WORK-IN-PROGRESS.  Feedback is welcome!**

### Lenses

**This document is WORK-IN-PROGRESS.  Feedback is welcome!**

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

### Atoms :: Modifiable model

Atoms take care of serializing access to their contents.  They are created by
giving some initial contents.  Atoms then allow the contents to be shared,
dependent upon and modified.  In the context of Calm^2, the contents of atoms
hold the state of the UI and the contents are modified using operations from
meta objects.

Atoms can be created in a variety of ways and with a variety of properties, such
as undo-redo capability or local storage persistence or both, and then passed to
controls that do not necessarily need to know about the special properties of
the atom or about other controls that have been passed the same atom.

### Lensed Atoms :: Modifiable whole -&gt; (whole &lt;=&gt; part) -&gt; Modifiable part

Atoms can also be created from existing atoms by specifying a lens through which
the contents of the existing atom are to be viewed and mutated.  Unlike when
creating a new atom with an initial value, an expression to create a lensed atom
is referentially transparent.

### &lt;Control/&gt; :: [Observable prop | Modifiable model | data]* -&gt; VDOM

A control is a function from observables, modifiables and constants to VDOM.

We don't actually directly invoke the `Control` function.  Instead we construct
VDOM that contains a reference to the function and the actual arguments with
which the control is to be called with.  In other words, the evaluation of a JSX
expression, `<Control {...{arguments}}/>`, to create VDOM, does not actually
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

## Putting it all together

**This document is WORK-IN-PROGRESS.  Feedback is welcome!**
