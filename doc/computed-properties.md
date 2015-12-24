## Computed Properties

Computed Properties are a specially defined property with a `getter` and an optional `setter`, this allows us to have some properties **dynamic** so we don't write property sync codes everywhere.

### Define a computed property

We can simply define a computed property with the `defineComputedProperty` method. This method accepts three parameters:

1. A `name` string representing the name of computed property.
2. A `dependencies` array contains all dependent properties.
3. A `getter` function or a `descriptor` object.

A readonly computed property can be defined with a `getter` function:

```js
class Rectangle {
    constructor() {
        this.defineComputedProperty(
            'size',
            ['width', 'height'],
            function () {
                return this.get('width') + '*' + this.get('height');
            }
        );
    }
}
```

In this way, this model would have a `size` property which updates when `width` or `height` is changed, it returns a string of format `{width} * {height}`.

The `getter` function receives no arguments with `this` object pointing to current model instance.

Also, for a more complex computed property, we can provide a `descriptor` object as the 3rd parameter:

```js
class Rectangle {
    constructor() {
        this.defineComputedProperty(
            'size',
            ['width', 'height'],
            {
                get() {
                    return this.get('width') + '*' + this.get('height');
                },
                set(value, options) {
                    let [width, height] = value.split('*');
                    this.set('width', width, options);
                    this.set('height', height, options);
                }
            }
        );
    }
}
```

A `descriptor` can contain properties below:

- A `get` function which executes on read.
- An optional `set` function which executes on write.
- An optional `evaluate` boolean property indicates the "laziness" of computed property, we'll talk about it later.

When a computed property is defined without a `set` function, it is a readonly computed property, when any code attempts to write a readonly computed property, it throws an Error saying `Cannot set readonly computed property ${name}`.

A defined computed property works the same as normal properties, just read it via `get` method and write it via `set` method, any time it's dependencies change it will automaticaly update.

### Accessibility of defineComputedProperty method

Although `defineComputedProperty` method is marked as `public`, we strongly recommend just define computed properties inside model implementation, prevent to invoke it from external codes.

Also it is recommended to define all computed properties inside constructor so that the model can have a definite data structure after constructed, some future improvements (such as precompile) may rely on this.

### Lazy evaluate

A `descriptor` object can contain an optional `evaluate` property, if this property is set to `true`, the computed property is evaluated immediately when it is defined.

Since we recommend defining computed properties in constructor, it is possible that dependent properties do not have value when a computed property is defined, lazy evaluation allow us to reduce many `if` branches.

The `evaluate` property defaults to `false` so by default computed properties ary "lazy", it's value is evaluated the first time it is read via `get` method, or the first time its dependencies change.

A shortcoming of lazy evaluation is the omit of `oldValue` for the first `change` event, the `oldValue` will be `undefined` since it's value is not evaluated. If `oldValue` is important, just specifiy `evaluate` to `true`.

When a computed property requires evaluate immediately, we should carefully handle conditions when dependencies are undefined:

```js
class Rectangle {
    constructor() {
        this.defineComputedProperty(
            'size',
            ['width', 'height'],
            {
                get() {
                    // Handle when width or height is undefined
                    if (!this.has('width') || !this.has('height')) {
                        return undefined;
                    }
                    return this.get('width') + '*' + this.get('height');
                },
                evaluate: true
            }
        );
    }
}
```

### Abou get and set

A `get` function of computed property **SHOULD** be:

1. Stable - multiple `get` calls should return the same value if model's state is not changed.
2. Side effect free - `get` calls should not manipulate any state of the model instance.


A `set` function of computed property **SHOULD** be:

1. Paired with get - an immediate `get` call after `set` should get an equal value of `set`'s parameter.
2. Include hook: computed properties do not support `beforechange` event, so hook it in `set` function.

Note that the parameter of `set` function may not be the final value of property, a computed property's value is always evaluated via `get` function, so if the property is of type `object`, parameter of `set` function is most likely to be discarded, usally the value will be an new object with identical content.

```js
class User {
    constructor() {
        this.defineComputedProperty(
            'name',
            ['firstName', 'lastName'],
            {
                get: function () {
                    return [this.get('firstName'), this.get('lastName')];
                },
                set: function ([first, last]) {
                    this.set('firstName', first);
                    this.set('lastName', last);
                }
            }
        )
    }
}

let user = new User();
let name = ['Gray', 'Zhang'];
user.set('name', name);
user.get(name) === name; // false
```

### Practices

For a computed with multiple dependencies, set dependencies one by one can cause multiple `change` events:

```js
let rectangle = new Rectangle({width: 2, height: 3});
rectangle.on('change', e => console.log(e.name, e.oldValue, e.newValue));

rectangle.set('width', 3);
// width 2 3
// size undefined 3*3
rectangle.set('height', 4);
// height 3 4
// size 3*3 3*4
```

This is not expected behavior, a good practice is to use `upadte` method to reduces change events:

```js
let rectangle = new Rectangle({width: 2, height: 3});
rectangle.on('change', e => console.log(e.name, e.oldValue, e.newValue));

rectangle.update({width: {$set: 3}, height: {$set: 4}});
// width 2 3
// height 3 4
// size undefined 3*4
```

### Don'ts

Do not update computed property and its dependencies together in one `update` call:

```js
let rectangle = new Rectangle({width: 2, height: 3});
rectangle.update({size: {$set: '3*4'}, width: {$set: 5}});
```

This can cause unpredictable behavior.

Also, try to prevent `{silent: true}` set on computed properties or their dependencies, this can cause value updates to stop working.
