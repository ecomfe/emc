/**
 * EMC (EFE Model & Collection)
 * Copyright 2015 Baidu Inc. All rights reserved.
 *
 * @file Model class
 * @exports Model
 * @author otakustay
 */

import u from 'underscore';
import EventTarget from 'mini-event/EventTarget';

const EMPTY = {};
const STORE = Symbol('store');
const DIFF = Symbol('diff');
const ASSIGN_VALUE = Symbol('assignValue');
const MERGE_UPDATE_DIFF = Symbol('mergeUpdateDiff');
const QUEUE_UPDATE_NOTIFICATION = Symbol('queueUpdateNotification');
const ASYNC_TICK = Symbol('asyncTick');

/* eslint-disable brace-style */
let global = (function () { return this; }());

let async = global.setImmediate
    ? function (task) { return setImmediate(task); }
    : function (task) { return setTimeout(task, 0); };

function isDiffObject(target) {
    return target.hasOwnProperty('$change');
}

function mergeDiffNode(stored, merging, currentValue) {
    // For each diff node, we have a node previously stored (called `stored`)
    // and a node provided (called `merging`), it is possible to have many combinations:
    //
    // 1. There is no `stored`, then `merging` is simply used.
    // 2. There is no `mergine`, then no operation is performed.
    // 3. `stored` and `merging` are both diff objects, we should merge them.
    // 4. Only `stored` is a diff object, we discard `merging` and update the `newValue` of `stored`
    // 5. `stored` is not a diff object but `merging` is, use `merging` to override `stored`.
    // 6. Neither `stored` not `merging` is a diff object, it is time to merge child nodes.
    //
    // This may not generate the minimum diff, but is a good balance between complexity and accuracy.
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

        stored.newValue = currentValue;
        return stored;
    }

    if (isDiffObject(merging)) {
        return merging;
    }

    for (let key of Object.keys(merging)) {
        let mergedNode = mergeDiffNode(stored[key], merging[key], currentValue[key]);
        if (mergedNode) {
            stored[key] = mergedNode;
        }
        else {
            delete stored[key];
        }
    }

    return stored;
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
    // - add + add => not possible
    // - add + change => add
    // - add + remove => no change (previously returned)
    // - change + add => not possible
    // - change + change => change
    // - change + remove => remove
    // - remove + add => change
    // - remove + change => not possible
    // - remove + remove => not possible
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
    return result.oldValue === result.newValue ? null : result;
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
        this[DIFF] = null;
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
     * @param {boolean} [options.silent=false] 如果该值为`true`则不触发{@link Model#event:change|change事件}
     *
     * @fires change
     * @throws {Error} Current model instance is disposed.
     * @throws {Error} `name` argument is not provided.
     * @throws {Error} `value` argument is not provided.
     */
    set(name, value, options) {
        if (!this[STORE]) {
            throw new Error('This model is disposed');
        }

        if (!name) {
            throw new Error('Argument name is not provided');
        }

        if (arguments.length < 2) {
            throw new Error('Argument value is not provided');
        }

        options = options || EMPTY;

        let oldValue = this[STORE][name];
        let isValueChanged = !this.has(name) || oldValue !== value;
        if (isValueChanged && !options.silent) {
            let eventData = {
                name: name,
                changeType: this[STORE].hasOwnProperty(name) ? 'change' : 'add',
                oldValue: oldValue,
                newValue: value,
                actualValue: value
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
                this[ASSIGN_VALUE](name, event.actualValue, event.changeType, options);
            }
        }
    }

    /**
     * Remove a property.
     *
     * @method Model#remove
     *
     * @param {string} name The name of property.
     * @param {Object} [options] Extra options.
     * @param {boolean} [options.silent=false] 如果该值为`true`则不触发{@link Model#event:change|change事件}
     *
     * @fires change
     * @throws {Error} Current model instance is disposed.
     * @throws {Error} `name` argument is not provided.
     */
    remove(name, options) {
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

        options = options || EMPTY;
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
     * Dump current {@link Model} instance as a plain object.
     *
     * @method Model#dump
     *
     * @return {Object} A plain object, modifications to the dumped object takes no effect to model instance.
     */
    dump() {
        // To ensure future modification will not affect the current model instance,
        // here we must make a shallow copy.
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
     * Dispose current {@link Model} instance.
     *
     * @method Model#dispose
     */
    dispose() {
        this.destroyEvents();
        this[STORE] = null;
        this[DIFF] = null;
        this[ASYNC_TICK] = null;
    }

    /**
     * Assign value to a property.
     *
     * @param {string} name The name of property.
     * @param {*} newValue The new value of proeprty.
     * @param {string} changeType The change type, could be `"add"`, `"change"` or `"remove"`.
     * @param {Object} options extra options.
     * @param {boolean} [options.silent] If true, no `change` event is fired.
     * @param {Object} [diff] A optional diff object.
     */
    [ASSIGN_VALUE](name, newValue, changeType, options, diff) {
        let oldValue = this[STORE][name];

        if (changeType === 'change' && newValue === oldValue) {
            return;
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

        let mergingDiff = diff || {[name]: {$change: changeType, oldValue: oldValue, newValue: newValue}};
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

    [QUEUE_UPDATE_NOTIFICATION]() {
        if (this[ASYNC_TICK]) {
            return;
        }

        let update = () => {
            // Do not fire event on disposed model.
            if (this[STORE]) {
                // Ensure previous loop generates diff, otherwise do not fire event.
                if (Object.keys(this[DIFF]).length) {
                    this.fire('update', {diff: this[DIFF]});
                }
                this[DIFF] = null;
                this[ASYNC_TICK] = null;
            }
        };
        this[ASYNC_TICK] = async(update);
    }

    [MERGE_UPDATE_DIFF](diff) {
        if (!this[DIFF]) {
            this[DIFF] = {};
        }

        mergeDiffNode(this[DIFF], diff, this[STORE]);
        this[QUEUE_UPDATE_NOTIFICATION]();
    }
}
