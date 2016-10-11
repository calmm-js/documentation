# Understanding Components and Composition

The way components are expressed using only

* reactive properties,
* reactive variables, and
* functions returning VDOM

and then composed as VDOM expressions in Calmm may seem limiting.  Don't we need
some more exposed scaffolding or wiring?

## Definitions

A *component* is a *function* that returns React *VDOM*.

```jsx
const A = () => <div>I'm a component.</div>
```

Typically components are *named*, but a component can also be an *anonymous*,
*first-class object*.

```jsx
() => <div>I'm also a component!</div>
```

When a component is put to use it is *mounted*, creating an *instance* of the
component.  An instance of a component may hold *state* and perform *IO*.  When
an instance is no longer needed, it is *unmounted*, which (when implemented
correctly) tears down any state held by the instance and stops any IO performed
by the instance.  IOW, state generally only exists within the lifetime of an
instance of a component.

```jsx
const A = ({state = Atom("")}) =>
  <input value={state}
         onChange={e => state.set(e.target.value)}/>
```

We generally abuse terminology and speak of "components" when we actually refer
to instances of components.  It is nevertheless very important to distinguish
between the two.

Generally the main purpose of any component is to produce output in the form of
VDOM that will be rendered to DOM.  A component may also produce other kind of
*output* and perform *side-effects*.

A component can have any number of *parameters*.  A parameter can serve as an
*input*, an *output* or *both*.  Components can take components as parameters.
Parameters, regardless of kind, can be *shared* by any number of components,
which means that components may *communicate* with each other via parameters.

A *composition* of components is a VDOM expression that specifies a tree
structure of component instantiations with their parameters.

```jsx
<div>I'm not a <em>component</em>, I'm a <strong>composition</strong>!</div>
```

## Connecting Components with Reactive Variables

The simplest case of creating a component that is the composition of two or more
components is when nothing is shared by the composed components:

```jsx
const NothingShared = () =>
  <div>
    <A/>
    <B/>
  </div>
```

Things get more interesting when we have components that take input:

```jsx
const DisplaysInput = ({input}) =>
  <div>{input}</div>
```

and components that produce output:

```jsx
const ProducesOutput = ({output}) =>
  <input type="text" onChange={e => output.set(e.target.value)}/>
```

and we wish to create compositions of such components and route the outputs of
some components to the inputs other components:

```jsx
const Composition = ({variable = Atom("")}) =>
  <div>
    <ProducesOutput output={variable}/>
    <DisplaysInput input={variable}/>
  </div>
```

There are several important things to note here.  First of all, the
`ProducesOutput` component takes a *parameter*, a reference to a reactive
variable, through which it produces output.  The `Composition` component then
uses a variable to connect the output of `ProducesOutput` to the input of
`DisplaysInput`.  The `Composition` also exposes the variable as a parameter
with a default.  This allows us to further compose the `Composition` component
with other components:

```jsx
const FurtherComposition = ({variable = Atom("")}) =>
  <div>
    <Composition {...{variable}}/>
    <DisplaysInput input={variable}/>
  </div>
```

When components expose their inputs and outputs as parameters, we can use
reactive variables to flexibly wire the inputs and outputs of components
together.

Note that reactive variables used for wiring components do not need to be
concrete atoms.  It is perfectly possible to connect components together using
lensed atoms and make it so that the entire state of the application is
ultimately stored in just a single atom.
