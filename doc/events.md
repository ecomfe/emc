## Events

EMC `Model` class emits 3 types of events.

### change event

The `change` event works in the same way other model implementations provide, it is fired after a property has change its value.

`Model` class uses `===` to test value identity, if a property is of object type, a `change` event will be fired when reference changes even though their content equals to each other.

### beforechange event

The `beforechange` event fires **before** a property is going to change, this event works as a hook of property changes.

In `beforechange` event, you can call `event.preventDefault()` to cancel future value assignment:

```js
import Model from 'emc/Model';

let model = new Model();
model.on(
    'beforechange',
    e => {
        if (e.name === 'username' && e.newValue.length > 10) {
            e.preventDefault();
        }
    }
);
model.set('name', 'This is a very long name');
model.get('name'); // undefined
```

Also you can change the value in this event by assigning the `actualValue` property of event object:

```js
import Model from 'emc/Model';

let model = new Model();
model.on(
    'beforechange',
    e => {
        if (e.name === 'age') {
            e.actualValue = Math.min(e.newValue, 18);
        }
    }
);
model.set('name', 'This is a very long name');
model.get('name'); // undefined
```

This event enables instant validations and restrictions on properties possible.


### udpate event

The `update` event is a special event, it is different with `change` event in some ways:

1. It is fired *asynchronously*.
2. All property changes are merged together in one `update` event.
3. All diffs to one property are merged.

This event provides a `diff` property in event object, suppose we have code like:

```js
import Model from 'emc/Model';

let user = {
    name: 'Alice',
    age: 12
};
let model = new Model(user);

model.on('update', e => console.log(e.diff));

model.set('name', 'Bob');
model.set('age', 18);
model.remove('age');
model.set('gender', 'male');
```

It will produce a `diff` object like:

```js
{
    name: {
        $change: 'change',
        oldValue: 'Alice',
        newValue: 'Bob'
    },
    age: {
        $change: 'remove',
        oldValue: 12,
        newValue: undefined
    },
    gender: {
        $change: 'add',
        oldValue: undefined,
        newValue: 'male'
    }
}
```

This `diff` object reports 3 property changes in one event, also the `set` and `remove` calls to `age` property are merged and acts like a simple `remove` call.

This event can be especially useful in binding senario, rely on `update` event can reduce uneccessary UI updates.
