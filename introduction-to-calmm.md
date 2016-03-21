# Introduction to Calm^2

Calmm or Calm^2, pronounced "calm squared", is an architecture and a concrete
collection of libraries for implementing reactive UIs.  It was born when we
started a project to implement a custom CMS for a customer.  The customer
requested that we use JavaScript and React, but we were otherwise given free
hands to choose the tools for the job.

## What is difficult in UI programming?

Personally I find styling, or CSS, to be a zone of discomfort, but, fortunately,
the undesirable side-effects that CSS can cause are rather limited.  But what is
really difficult?

> Maintaining consistent state in the face of async inputs.

That is what we believe is inherently difficult in UI programming.  All UIs must
maintain some internal state, must maintain the consistency of that state and
must project a consistent view of that state to the user.  We further want UIs
to be mostly non-modal and, especially in web apps, we also have lots of
asynchronous operations happening &mdash; some of which may be out of the
control of our UI code.  This means that requests to change the state of the UI
can come from a multitude of sources and at the most inconvenient moments.

In this particular document we will try to avoid referring to other concrete
approaches to implementing UIs, but, in our opinion, many approaches to UI
programming are motivated by this difficulty of maintaining consistent state and
have picked a particular way to solve that problem that characterizes the
approach.  For example, an approach might be to route all changes to state via a
dedicated set of operations, serialize the execution of said operations and
notify other parts of UI after each change of state.

## Desire

When developing or choosing an approach out of many potential approaches, it may
help to articulate some criteria for making choices.  Here are some of the
things we desire from our solution(s):

* Eliminate boilerplate and glue
* Avoid all-or-nothing or lock-in
* Be declarative where it matters
* Avoid unnecessary encoding of effects
* Structural programming
* Plug and play components
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

By declarative programming we refer to the idea of writing referentially
transparent descriptions of programs or program components.  To use those
declarations one has to run or instantiate them.  Declarative programming tends
to have many desirable properties such as composability and testability, but
that is not given.

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
ways to do it.  This tends to go hand-in-hand with having to write boilerplate
or glue code.  When possible, it is typically preferable to pick one effective
way to do the plumbing and make that free of boilerplate.

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
approach to be algorithmically efficient, e.g., by avoiding unnecessary work.
OTOH, sometimes good performance, especially in simple scenarios, can be
achieved using poor algorithms, but optimized code.  We, however, generally
prefer approaches that lend themselves to algorithmically efficient solutions.

Note that we have not explicitly listed simplicity as a goal.  We have yet to
see an approach to programming that claims to be complex and therefore
desirable.  But what is simple?  Is an approach based on one Golden Hammer
concept simple?  Not necessarily.  In his talk, Simple made Easy, Rich Hickey
makes the point that simple approaches tend to have more parts rather than one
complex intertwined thing.  In our approach, we have identified several parts,
all of which are quite simple on their own and solve a particular problem well,
but not everything.  The selective composition of those parts, while perhaps
difficult to understand at a glance, is what gives the ability to solve a
variety of problems in UI programming.



This document is WORK-IN-PROGRESS.  Feedback is welcome!
