# Redux vs Calm^2

In this brief note we compare some aspects of Calm^2 and Redux.  We assume that
the reader is already familiar with [Redux](http://redux.js.org/).  We also
assume that the reader has basic familiarity with
[Calm^2](introduction-to-calmm.md).  Our goal here is to gain a deeper
understanding on how they are related.

## Stores with Bacon

From our point of view, the central concept of Redux is the concept of a
[Store](http://redux.js.org/docs/basics/Store.html).  As is well known, a store
can be implemented with typical event stream combinator libraries in just a few
lines of code.  Here is a minimalistic
[`createStore`](http://redux.js.org/docs/api/createStore.html) lookalike using
[Bacon](https://github.com/baconjs/bacon.js/):

```js
const createStore = (reducer, initial) => {
  const bus = Bacon.Bus()
  const prop = bus.scan(initial, (state, action) => reducer(state, action))
  prop.dispatch = action => bus.push(action)
  return prop
}
```

The way the above works is that we construct a
[`Bus`](https://github.com/baconjs/bacon.js/#bus) for sending actions to the
store we are creating.  We then create a property, using
[`scan`](https://github.com/baconjs/bacon.js/#observable-scan), by starting from
the `initial` value and using the `reducer` to compute a new state after each
message or action that comes from the bus.  It is really quite simple.

[Types can be great](https://www.youtube.com/watch?v=IOiZatlZtGU) for
understanding programs.  Let's see.  We could give `createStore` the following
type:

```haskell
createStore :: (state -> action -> state) -> state -> IO (Store action state)
```

What this means is that `createStore` takes two arguments.  The first argument,
the reducer, is a function from a state and an action to a state.  The second
argument is the initial state.  The result is store that contains state of type
`state` and understands actions of type `action`.

The `Store` type constructor also comes with various actions, but at this stage
we are mainly interested in just one, `dispatch`, which we could type as
follows:

```haskell
dispatch :: Store action state -> action -> IO ()
```

What this means is that `dispatch` takes a store that understands actions of
type `action` and an action of said type and returns nothing.  In other words,
`dispatch` is only used for the side-effect.

Now, in the above, the `action` type could be anything, but, in Redux, actions
are supposed to be just data:
[Actions](http://redux.js.org/docs/basics/Actions.html).  So, `createStore` is a
[higher-order function](https://en.wikipedia.org/wiki/Higher-order_function) and
`dispatch` is plain or first-order data.

## Atom with Bacon

Let's then turn our attention to Calm^2 and to the
[Atom](https://github.com/calmm-js/documentation/blob/master/introduction-to-calmm.md#atoms)
concept.  Similarly to stores of Redux, a minimalistic look-alike Atom can be
implemented in just a few slices of Bacon:

```js
const Atom = initial => {
  const bus = Bacon.Bus()
  const prop = bus.scan(initial, (state, action) => action(state))
  prop.modify = action => bus.push(action)
  return prop
}
```

Didn't we just look at this function?  Not exactly.  How is this actually
different from a store?

Like a store, an atom takes an initial state and creates a bus for messages.  As
can be read from the code above, and unlike with a store, the messages that an
atom takes are supposed to be functions that compute a new state given the
current state.

Like with Redux, let's take a look at the types.  First the type of `Atom` (we
are slightly abusing Haskell lexical grammer here):

```haskell
Atom :: state -> IO (Atom state)
```

Then the type of `modify`:

```haskell
modify :: Atom state -> (state -> state) -> IO ()
```

From the types we can directly read that `Atom` is a first-order function and
`modify` is a higher-order function.  So, stores and atoms have their
higher-order and first-order parts exchanged.  This is a fundamental difference
between stores and atoms.

## Conversions

Before going to the gist of this note, let's see how we can can implement atoms
in terms of stores and vice versa.

First here is `createStore` implemented using `Atom`:

```js
const createStore = (reducer, initial) => {
  const atom = Atom(initial)
  atom.dispatch = action => atom.modify(state => reducer(state, action))
  return atom
}
```

And here is `Atom` implemented using `createStore`:

```js
const Atom = initial => {
  const store = createStore((state, action) => action(state), initial)
  store.modify = action => store.dispatch(action)
  return store
}
```

Nice symmetry!

The astute reader noticed, however, that this latter implementation of `Atom` in
terms of `createStore` violated the idea of stores that actions are just data.

## Composing and Decomposing state

As mentioned previously the key difference between stores and atoms is that
their higher-order and first-order parts have been flipped.  Innocuous as that
may seem, it makes them fundamentally different.  It turns out that stores, or
more accurately reducers, are *composable*, while atoms are *decomposable*.

Indeed, Redux comes with the
[`combineReducers`](http://redux.js.org/docs/api/combineReducers.html) function
for combining reducers.  Abusing a Haskell -style notation, we could give
`combineReducers` the following type:

```haskell
combineReducers :: {p1: s1 -> a1 -> s1,
                    p2: s2 -> a2 -> s2} ->
                   {p1: a1, p2: a1} -> Either a1 a2 -> {p1: a1, p2: a1}
```

Again, the astute reader noticed that this is, in fact, not the actual type of
`combineReducers`, because `combineReducers` does not change the type of
actions.  We do this, because it is a key that makes reducers composable: by
using a disjoint union of actions, we can route actions precisely.

The actual `combineReducers` function passes actions to all the reducers.  In
some cases this might be what you want, but it doesn't compose.

Now, it is not difficult to imagine a library of reducer combinators.  An
experienced functional programmer should be able to whip up one in no time.  For
example, one could write combinators for arrays.  It would have a signature like
this:

```haskell
arrayReducer :: (s -> a -> a) -> [s] -> (a, Integer) -> [a]
```

Just like with our changed `combineReducers` function, we extend the action type
to make it possible to route actions to a precise target.

But the point is that by following the structure or
[algebra](http://chris-taylor.github.io/blog/2013/02/10/the-algebra-of-algebraic-data-types/),
or
[logic](http://homepages.inf.ed.ac.uk/wadler/papers/propositions-as-types/propositions-as-types.pdf)
of types we can compose reducers to make reducers for arbitrarily complex nested
states.  We could even write reducer combinators that allow reducers to be
composed in ways that do not strictly follow the construction of the data, but
rather follow some properties computed from data.

The logical next step would be to explain that atoms can be decomposed using
lenses, but we've already read about it in the
[Combining Atoms and Lenses](https://github.com/calmm-js/documentation/blob/master/introduction-to-calmm.md#combining-atoms-and-lenses)
section of the Calm^2 introduction.

## Summary

Redux Stores and Calm^2 Atoms are related, but fundamentally different.  Redux
stores can be instantiated with composable reducers.  Atoms can be decomposed
using lenses and lenses can be composed.  Out of the box, Redux provides only a
single reducer combinator.  Calm^2 takes the idea of composability and
decomposability seriously and provides ways to effectively decompose state to
components making the components themselves composable.
