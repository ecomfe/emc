/**
 * EMC (EFE Model & Collection)
 * Copyright 2015 Baidu Inc. All rights reserved.
 *
 * @file Model class
 * @exports Model
 * @author otakustay
 */

import u from 'underscore';
import update from './update';
import EventTarget from 'mini-event/EventTarget';

const EMPTY = {};
const EMPTY_SET = new Set();

const STORE = Symbol('store');
const COMPUTED_PROPERTIES = Symbol('computedProperties');
const DIFF = Symbol('diff');
const OLD_VALUES = Symbol('oldValues');
const SUPRESS_COMPUTED_PROPERTY_CHANGE_MUTEX = Symbol('supressComputedPropertyChangeMutex');
const IS_UPDATE_NOTIFICATION_IN_QUEUE = Symbol('asyncTick');
const HAS_COMPUTED_PROPERTY = Symbol('hasComputedProperty');
const SET_COMPUTED_PROPERTY = Symbol('setComputedProperty');
const UPDATE_COMPUTED_PROPERTY = Symbol('updateComputedProperty');
const UPDATE_COMPUTED_PROPERTIES_FROM_DEPENDENCY = Symbol('updateComputedPropertiesFromDependency');
const SET_VALUE = Symbol('setValue');
const ASSIGN_VALUE = Symbol('assignValue');
const MERGE_UPDATE_DIFF = Symbol('mergeUpdateDiff');
const SCHEDULE_UPDATE_EVENT = Symbol('scheduleUpdateEvent');

/* eslint-disable brace-style */
let global = (function () { return this; }());

let async = global.setImmediate
    ? function (task) { return setImmediate(task); }
    : function (task) { return setTimeout(task, 0); };

function isDiffObject(target) {
    return target.hasOwnProperty('$change');
}

function purgeUneccessaryDiffNode(node) {
    if (u.isEmpty(node)) {
        return null;
    }
    if (node.$change === 'change' && node.newValue === node.oldValue) {
        return null;
    }
    return node;
}

function mergeDiffNode(stored, merging, newValue, oldValue) {
    // For each diff node, we have a node previously stored (called `stored`)
    // and a node provided (called `merging`), it is possible to have many combinations:
    //
    // ```
    // ┌──────────────┬──────────────┬────────────────────────────────────────────┐
    // │ stored       │ merging      │ action                                     │
    // ├──────────────┼──────────────┼────────────────────────────────────────────┤
    // │ missing      │ any          │ use merging                                │
    // │ any          │ missing      │ no action                                  │
    // │ diff object  │ diff object  │ merge diff                                 │
    // │ diff object  │ plain node   │ discard merging, update newValue of stored │
    // │ plain node   │ diff object  │ use merging, update oldValue of mergine    │
    // │ plain object │ plain object │ iterate children                           │
    // └──────────────┴──────────────┴────────────────────────────────────────────┘
    // ```
    //
    // This algorithm may not generate the minimum diff, but is a good balance between complexity and accuracy.
    if (!stored) {
        return merging;
    }
    if (!merging) {
        return stored;
    }

    if (isDiffObject(stored)) {
        if (isDiffObject(merging)) {
            return mergeDiffObject(stored, merging);
        }

        stored.newValue = newValue;
        return purgeUneccessaryDiffNode(stored);
    }

    if (isDiffObject(merging)) {
        merging.oldValue = oldValue;
        return purgeUneccessaryDiffNode(merging);
    }

    for (let key of Object.keys(merging)) {
        let mergedNode = mergeDiffNode(
            stored[key],
            merging[key],
            // It's not possible that `newValue` is `null` or `undefined` but we have a diff for its child key.
            newValue[key],
            // The initial value in store could be `null` or `undefined`
            oldValue ? oldValue[key] : undefined
        );
        if (mergedNode) {
            stored[key] = mergedNode;
        }
        else {
            delete stored[key];
        }
    }

    return purgeUneccessaryDiffNode(stored);
}

function mergeDiffObject(x, y) {
    if (!x) {
        return y;
    }
    if (!y) {
        return x;
    }

    // If a property is added then removed, there should be no diff
    if (x.$change === 'add' && y.$change === 'remove') {
        return null;
    }

    let result = {
        oldValue: x.oldValue,
        newValue: y.newValue
    };

    // Change type is derived as following:
    //
    // ```
    // ┌──────────┬────────┬──────────────┐
    // │ original │ target │ result       │
    // ├──────────┼────────┼──────────────┤
    // │ add      │ add    │ not possible │
    // │ add      │ change │ add          │
    // │ add      │ remove │ no change    │
    // │ change   │ add    │ not possible │
    // │ change   │ change │ change       │
    // │ change   │ change │ remove       │
    // │ remove   │ add    │ change       │
    // │ remove   │ change │ not possible │
    // │ remove   │ change │ not possible │
    // └──────────┴────────┴──────────────┘
    // ```
    if (x.$change === 'add') {
        result.$change = 'add';
    }
    else if (y.$change === 'remove') {
        result.$change = 'remove';
    }
    else {
        result.$change = 'change';
    }

    // If it happens that `oldValue` and `newValue` are the same, it is not a change anymore
    return purgeUneccessaryDiffNode(result);
}

/**
 * A Model class is a representation of an object with change notifications.
 *
 * @class Model
 * @extends mini-event.EventTarget
 *
 * @param {Object} [initialData] The initial data which will be filled.
 */
export default class Model extends EventTarget {
    constructor(initialData) {
        super();

        this[STORE] = u.extend({}, initialData);
        this[COMPUTED_PROPERTIES] = {};
        this[IS_UPDATE_NOTIFICATION_IN_QUEUE] = false;
        this[SUPRESS_COMPUTED_PROPERTY_CHANGE_MUTEX] = 0;
        this[DIFF] = {};
        this[OLD_VALUES] = {};
    }

    /**
     * Get the value of property.
     *
     * @method Model#get
     *
     * @param {string} name The name of property.
     * @return {*} The value of `name` property.
     *
     * @throws {Error} Current model instance is disposed.
     * @throws {Error} `name` argument is not provided.
     */
    get(name) {
        if (!this[STORE]) {
            throw new Error('This model is disposed');
        }

        if (!name) {
            throw new Error('Argument name is not provided');
        }

        return this[STORE].hasOwnProperty(name) ? this[STORE][name] : undefined;
    }

    /**
     * 设置值
     *
     * @method Model#set
     *
     * @param {string} name The name of property.
     * @param {*} value The value of property.
     * @param {Object} [options] Extra options.
     * @param {boolean} [options.silent] If `true`, no `change` or `update` event is fired.
     *
     *
     * @fires beforechange
     * @fires change
     * @fires update
     *
     * @throws {Error} Current model instance is disposed.
     * @throws {Error} `name` argument is not provided.
     * @throws {Error} `value` argument is not provided.
     */
    set(name, value, options = EMPTY) {
        if (!this[STORE]) {
            throw new Error('This model is disposed');
        }

        if (!name) {
            throw new Error('Argument name is not provided');
        }

        if (arguments.length < 2) {
            throw new Error('Argument value is not provided');
        }

        if (this[HAS_COMPUTED_PROPERTY](name)) {
            this[SET_COMPUTED_PROPERTY](name, value, options);
        }
        else {
            this[SET_VALUE](name, value, options);
        }
    }

    /**
     * Remove a property.
     *
     * @method Model#remove
     *
     * @param {string} name The name of property.
     * @param {Object} [options] Extra options.
     * @param {boolean} [options.silent] If `true`, no `change` or `update` event is fired.
     *
     *
     * @fires beforechange
     * @fires change
     * @fires update
     *
     * @throws {Error} Current model instance is disposed.
     * @throws {Error} `name` argument is not provided.
     */
    remove(name, options = EMPTY) {
        if (!this[STORE]) {
            throw new Error('This model is disposed');
        }

        if (!name) {
            throw new Error('Argument name is not provided');
        }

        // Do nothing if removal is not neccessary.
        if (!this.has(name)) {
            return;
        }

        let oldValue = this[STORE][name];

        if (!options.silent) {
            let eventData = {
                name: name,
                changeType: 'remove',
                oldValue: oldValue,
                newValue: undefined
            };
            let event = this.fire('beforechange', eventData);
            if (!event.isDefaultPrevented()) {
                this[ASSIGN_VALUE](name, undefined, 'remove', options);
            }
        }
    }

    /**
     * Update this model with a command object.
     *
     * This is a wrap of the {@link update} function except we do not allow root command in this method.
     *
     * We are able to merge diffs generated from multiple updates, so each property path has only one diff result.
     *
     * @method update
     *
     * @param {Object} commands The update commands, see {@link update} function for detail.
     * @param {Object} [options] Extra options.
     * @param {boolean} [options.silent] If `true`, no `change` or `update` event is fired.
     *
     * @fires beforechange
     * @fires change
     * @fires update
     *
     * @throws {Error} `commands` argument is not provided.
     */
    update(commands, options = EMPTY) {
        if (!commands) {
            throw new Error('Argument commands is not provided');
        }

        this[SUPRESS_COMPUTED_PROPERTY_CHANGE_MUTEX]++;
        // We don't allow root command here since it may modify the store to an unexpected value.
        let updatingProperties = Object.keys(commands);
        for (let name of updatingProperties) {
            let currentValue = this[STORE][name];
            let [newValue, diff] = update(currentValue, commands[name]);
            this[SET_VALUE](name, newValue, options, diff);
        }
        this[SUPRESS_COMPUTED_PROPERTY_CHANGE_MUTEX]--;
        this[UPDATE_COMPUTED_PROPERTIES_FROM_DEPENDENCY](updatingProperties);
    }

    /**
     * Dump current {@link Model} instance as a plain object.
     *
     * @method Model#dump
     *
     * @return {Object} A plain object, modifications to the dumped object takes no effect to model instance.
     */
    dump() {
        // Make a shallow copy to ensure future modification will not affect the current model instance.
        return u.clone(this[STORE]) || {};
    }

    /**
     * Detect if current {@link Model} instance has a property.
     *
     * @method Model#has
     *
     * @param {string} name The name of property.
     * @return {boolean}
     *
     * @throws {Error} `name` argument is not provided.
     */
    has(name) {
        if (!name) {
            throw new Error('Argument name is not provided');
        }

        if (!this[STORE]) {
            return false;
        }

        return this[STORE].hasOwnProperty(name);
    }

    /**
     * Detect if current {@link Model} instance has a property whose value is neither `null` nor `undefined`.
     *
     * @method Model#hasValue
     *
     * @param {string} name The name of property.
     * @return {boolean}
     *
     * @throws {Error} `name` argument is not provided.
     */
    hasValue(name) {
        if (!name) {
            throw new Error('Argument name is not provided');
        }

        if (!this[STORE]) {
            return false;
        }

        // We do not utilized `this.get` method because a subclass can override it to make this test fail.
        return this.has(name) && this[STORE][name] != null;
    }

    /**
     * Detect if current {@link Model} instance has a property whose value is neither `null`, `undefined` nor `""`.
     *
     * @method Model#hasReadableValue
     *
     * @param {string} name The name of property.
     * @return {boolean}
     *
     * @throws {Error} `name` argument is not provided.
     */
    hasReadableValue(name) {
        if (!name) {
            throw new Error('Argument name is not provided');
        }

        if (!this[STORE]) {
            return false;
        }

        return this.hasValue(name) && this[STORE][name] !== '';
    }

    /**
     * Define a computed property
     *
     * A computed property is a property with dynamic compute logic for `get` and `set`,
     * once `get` or `set` method is invoked, model instance will first look for a computed property with given name,
     * if computed property is found, the property's defined getter or setter will be invoked instead.
     *
     * ```js
     * class Rectangle {
     *     constructor() {
     *         this.defineComputedProperty(
     *             'size',
     *             ['width', 'height'],
     *             function () {
     *                 if (!this.has('width') || !this.has('height')) {
     *                     return undefined;
     *                 }
     *
     *                 return this.get('width') + '*' + this.get('height');
     *             }
     *         );
     *     }
     * }
     *
     * let rectangle = new Rectangle({width: 1920, height: 1080});
     * rectangle.get('size'); // 1928*1080
     * ```
     *
     * A computed property **MUST** be:
     *
     * 1. stable - multiple `get` calls should return the same value if model's state is not changed.
     * 2. side effect free - `get` calls should not manipulate any state of the model instance.
     *
     * By default when a computed property is defined, its value is computed immediately and cached for future use,
     * when any of the `dependencies` properties is changed, the value will be computed again.
     *
     * The cached value is stored in model such as it is a normal property, so methods like `dump` or `has*` works with
     * computed properties naturally.
     *
     * The exception is when a property is set with a `slient: true` flag, all computed properties depended on it will
     * not be updated, this may cause state inconsistent and is by design.
     *
     * You can specify a `set` function by making the `accessorOrGetter` an object containing a `set` method,
     * during the set all events to this computed property are supressed in order to avoid unexpected `change` events,
     * a `change` event will fire when `set` function returns.
     *
     * Because the value of computed properties finally depends on its dependency properties, you may not get expected
     * `newValue` when we set a computed property if your `get` and `set` functions are not carefully paired.
     * For example, if we supress changes in `beforechange` event for `width` property, then `set` to `size` property
     * will not provide an expected new `size` value.
     *
     * ```js
     * class Rectangle {
     *     constructor() {
     *         this.defineComputedProperty(
     *             'size',
     *             ['width', 'height'],
     *             {
     *                 get() {
     *                     if (!this.has('width') || !this.has('height')) {
     *                         return undefined;
     *                     }
     *
     *                     return this.get('width') + '*' + this.get('height');
     *                 },
     *                 set(value, options) {
     *                     let [width, height] = value ? value.split('*') : [undefined, undefined];
     *                     this.set('width', width, options);
     *                     this.set('height', height, options);
     *                 }
     *             }
     *         );
     *     }
     * }

     * let rectangle = new Rectangle();
     * rectangle.set('size', '1920*1080');
     * ```
     *
     * If a `set` function is missing, any attempt to set this property throws a error.
     *
     * Computed properties do not support `beforechange` event, if you need to cancel value assignment or change
     * the actual value, implement it in `set` function.
     *
     * @protected
     * @param {string} name The name of computed property.
     * @param {string[]} dependencies The dependency properties.
     * @param {Object|Function} accessorOrGetter A getter function or a descriptor containing meta of the property.
     * @param {Function} accessorOrGetter.get A getter function for computed property.
     * @param {Function} [accessorOrGetter.set] A optional set function for computed property.
     */
    defineComputedProperty(name, dependencies, accessorOrGetter) {
        let accessor = typeof accessorOrGetter === 'function' ? {get: accessorOrGetter} : accessorOrGetter;
        let descriptor = Object.assign({name, dependencies}, accessor);
        descriptor.dependencySet = new Set(dependencies);

        // Listen for dependency changes
        this.on(
            'change',
            (e) => {
                if (this[SUPRESS_COMPUTED_PROPERTY_CHANGE_MUTEX]) {
                    return;
                }

                if (descriptor.dependencySet.has(e.name)) {
                    this[UPDATE_COMPUTED_PROPERTY](name);
                }
            }
        );

        this[COMPUTED_PROPERTIES][name] = descriptor;
        // Cache initial value, this should not affect update diff
        this[STORE][name] = descriptor.get.call(this);
    }

    /**
     * Dispose current {@link Model} instance.
     *
     * @method Model#dispose
     */
    dispose() {
        this.destroyEvents();
        this[STORE] = null;
        this[DIFF] = null;
        this[OLD_VALUES] = null;
        this[IS_UPDATE_NOTIFICATION_IN_QUEUE] = false;
    }

    /**
     * Determine if specified computed property exits.
     *
     * @param {string} name Property name.
     * @return {boolean}
     */
    [HAS_COMPUTED_PROPERTY](name) {
        return this[COMPUTED_PROPERTIES].hasOwnProperty(name);
    }

    /**
     * Set the value of a computed property.
     *
     * @param {string} name Property name.
     * @param {*} value Property value.
     * @param {Object} [options] Extra options.
     * @param {boolean} [options.silent] If `true`, no `change` or `update` event is fired.
     */
    [SET_COMPUTED_PROPERTY](name, value, options) {
        let {set, dependencies, dependencySet} = this[COMPUTED_PROPERTIES][name];

        if (!set) {
            throw new Error(`Cannot set readonly computed property ${name}`);
        }

        this[SUPRESS_COMPUTED_PROPERTY_CHANGE_MUTEX]++;
        this::set(value, options);
        this[SUPRESS_COMPUTED_PROPERTY_CHANGE_MUTEX]--;
        this[UPDATE_COMPUTED_PROPERTIES_FROM_DEPENDENCY](dependencies);
    }

    /**
     * Update the cached value of a computed property and return the new value.
     *
     * @param {string} name Property name.
     * @param {Object} [options] Extra options.
     * @param {boolean} [options.silent] If `true`, no `change` or `update` event is fired.
     */
    [UPDATE_COMPUTED_PROPERTY](name, options = EMPTY) {
        let {get} = this[COMPUTED_PROPERTIES][name];
        let newValue = get.call(this);
        this[SET_VALUE](name, newValue, Object.assign({disableHook: true}, options));
    }

    [UPDATE_COMPUTED_PROPERTIES_FROM_DEPENDENCY](dependencies) {
        let updatingProperties = dependencies.reduce(
            (result, propertyName) => {
                let dependentComputedProperties = Object.values(this[COMPUTED_PROPERTIES])
                    .filter(descriptor => descriptor.dependencySet.has(propertyName))
                    .map(descriptor => descriptor.name);
                dependentComputedProperties.forEach(::result.add);
                return result;
            },
            new Set()
        );
        updatingProperties.forEach(::this[UPDATE_COMPUTED_PROPERTY]);
    }

    /**
     * Set value to a property with an optional diff.
     *
     * This is the core logic of `set` and `update` method.
     *
     * @private
     * @method setValue
     *
     * @param {string} name The name of property.
     * @param {*} value The new value of proeprty.
     * @param {Object} options Extra options.
     * @param {boolean} [options.silent] If true, no `change` event is fired.
     * @param {boolean} [options.disableHook] If true, no `beforechange` event is fired, internal use only.
     * @param {Object} [diff] A optional diff object which describes the modification of property.
     */
    [SET_VALUE](name, value, options, diff) {
        let oldValue = this[STORE][name];
        let isValueChanged = !this.has(name) || oldValue !== value;
        if (!isValueChanged) {
            return;
        }

        let changeType = this[STORE].hasOwnProperty(name) ? 'change' : 'add';

        if (options.silent || options.disableHook) {
            this[ASSIGN_VALUE](name, value, changeType, options, diff);
            return;
        }

        let eventData = {
            name: name,
            changeType: changeType,
            oldValue: oldValue,
            newValue: value,
            actualValue: value,
            diff: diff
        };

        /**
         * Firs before a property is to be changed.
         *
         * The `beforechange` event is available for both `set` and `update` method,
         * for `update` method it fires for each property change.
         *
         * If a `beforechange` event is originated from a `update` method, it provides a `diff` property.
         *
         * You can use `event.preventDefault()` to cancel the assignment of a property, no `change` will fire then.
         *
         * You can also set `event.actualValue` to change the final value of assignment,
         * note if you do this, the `diff` property `update` method generates is lost,
         * we do not provide a generic object diff due to performance considerations.
         *
         * @event Model#beforechange
         *
         * @property {string} name The name of property.
         * @property {string} changeType The type of change, could be `"add"`, `"change"` or `"remove"`
         * @property {*} oldValue The old value of property.
         * @property {*} newValue The new value of property.
         * @property {Object} [diff] A diff between the old and new value, only available for `update` method.
         * @property {*} actualValue The actual value of prpoerty,
         *     we can change this property to modified the value of the final set operation.
         */
        let event = this.fire('beforechange', eventData);

        if (!event.isDefaultPrevented()) {
            // Discard diff if `actualValue` is changed in event handlers.
            let actualDiff = event.actualValue === value ? diff : undefined;
            this[ASSIGN_VALUE](name, event.actualValue, event.changeType, options, actualDiff);
        }
    }

    /**
     * Assign value to a property.
     *
     * This is the core logic of `SET_VALUE` and `remove` method.
     *
     * @private
     * @method assignValue
     *
     * @param {string} name The name of property.
     * @param {*} newValue The new value of proeprty.
     * @param {string} changeType The change type, could be `"add"`, `"change"` or `"remove"`.
     * @param {Object} options Extra options.
     * @param {boolean} [options.silent] If true, no `change` event is fired.
     * @param {Object} [diff] A optional diff object which describes the modification of property.
     */
    [ASSIGN_VALUE](name, newValue, changeType, options, diff) {
        let oldValue = this[STORE][name];

        if (changeType === 'change' && newValue === oldValue) {
            return;
        }

        if (!this[OLD_VALUES].hasOwnProperty(name)) {
            this[OLD_VALUES][name] = this[STORE][name];
        }

        if (changeType === 'remove') {
            // `underscore.omit` method has a complexity of O(n),
            // since the `store` object is an internal object just owned by model,
            // we use `delete` operator here to gain a little performance boost
            delete this[STORE][name];
        }
        else {
            this[STORE][name] = newValue;
        }

        let mergingDiff = {
            [name]: diff || {$change: changeType, oldValue: oldValue, newValue: newValue}
        };
        this[MERGE_UPDATE_DIFF](mergingDiff);

        if (!options.silent) {
            let eventData = {name, changeType, oldValue, newValue, diff};
            /**
             * Fires after a property changes its value.
             *
             * @event change
             *
             * @property {string} name The name of property.
             * @property {string} changeType The type of change, could be `"add"`, `"change"` or `"remove"`
             * @property {*} oldValue The old value of property.
             * @property {*} newValue The new value of property.
             * @property {Object} [diff] A diff between the old and new value, only available for `update` method.
             */
            this.fire('change', eventData);
        }
    }

    /**
     * Schedule a task that fires `update` event, only 1 task will be scheduled in a call stack.
     *
     * @private
     * @method scheduleUpdateEvent
     */
    [SCHEDULE_UPDATE_EVENT]() {
        if (this[IS_UPDATE_NOTIFICATION_IN_QUEUE]) {
            return;
        }

        let update = () => {
            // Do not fire event on disposed model.
            if (this[STORE]) {
                // Ensure previous loop generates diff, otherwise do not fire event.
                if (!u.isEmpty(this[DIFF])) {
                    /**
                     * Fires asynchronously after property changes.
                     *
                     * Since this event is asynchronous, it merges all property changes in a loop
                     * and produces a combined `diff` object.
                     *
                     * @property {Object} [diff] A combined diff object.
                     */
                    this.fire('update', {diff: this[DIFF]});
                }
                this[DIFF] = {};
                this[OLD_VALUES] = {};
                this[IS_UPDATE_NOTIFICATION_IN_QUEUE] = false;
            }
        };
        async(update);
        this[IS_UPDATE_NOTIFICATION_IN_QUEUE] = true;
    }

    /**
     * Merge a diff generated from {@link update} function into all stored update diffs.
     *
     * @private
     * @method mergeUpdateDiff
     *
     * @param {Object} diff Target diff obejct
     */
    [MERGE_UPDATE_DIFF](diff) {
        mergeDiffNode(this[DIFF], diff, this[STORE], this[OLD_VALUES]);
        this[SCHEDULE_UPDATE_EVENT]();
    }
}
