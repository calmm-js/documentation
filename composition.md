# Understanding Components and Composition

A *component* is a *function* that returns React *VDOM*.

```js
const A = () => <div>I'm a component.</div>
```

Typically components are *named*, but a component can also be an *anonymous*,
*first-class object*.

```js
() => <div>I'm also a component!</div>
```

When a component is put to use it is *mounted*, creating an *instance* of the
component.  An instance of a component may hold *state* and perform *IO*.  When
an instance is no longer needed, it is *unmounted*, which (when implemented
correctly) tears down any state held by the instance and stops any IO performed
by the instance.  IOW, state generally only exists within the lifetime of an
instance of a component.

```js
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

```js
const NothingShared = () =>
  <div>
    <A/>
    <B/>
  </div>
```

```js
const SharedInput = ({property = /* ... */}) =>
  <div>
    <A input={property}/>
    <B input={property}/>
  </div>
```

```js
const OutputOfOneIsInputOfAnother = ({variable = Atom()}) =>
  <div>
    <A output={variable}/>
    <B  input={variable}/>
  </div>
```
