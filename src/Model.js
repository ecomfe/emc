'use strict';

/**
 * EMC (EFE Model & Collection)
 * Copyright 2015 Baidu Inc. All rights reserved.
 *
 * @file Model class
 * @exports Model
 * @author otakustay
 */

import {withDiff as update} from 'diffy-update';
import {mergeDiff} from 'diffy-update/merge';
import {createDiffNode} from 'diffy-update/diffNode';
import EventTarget from 'mini-event/EventTarget';

const EMPTY = {};

const STORE = Symbol('store');
const COMPUTED_PROPERTIES = Symbol('computedProperties');
const DIFF = Symbol('diff');
const OLD_VALUES = Symbol('oldValues');
const SUPRESS_COMPUTED_PROPERTY_CHANGE_MUTEX = Symbol('supressComputedPropertyChangeMutex');
const IS_UPDATE_NOTIFICATION_IN_QUEUE = Symbol('asyncTick');
const HAS_PROPERTY = Symbol('hasProperty');
const HAS_COMPUTED_PROPERTY = Symbol('hasComputedProperty');
const SET_COMPUTED_PROPERTY = Symbol('setComputedProperty');
const UPDATE_COMPUTED_PROPERTY = Symbol('updateComputedProperty');
const UPDATE_COMPUTED_PROPERTIES_FROM_DEPENDENCY = Symbol('updateComputedPropertiesFromDependency');
const SET_VALUE = Symbol('setValue');
const ASSIGN_VALUE = Symbol('assignValue');
const MERGE_UPDATE_DIFF = Symbol('mergeUpdateDiff');
const SCHEDULE_UPDATE_EVENT = Symbol('scheduleUpdateEvent');

let async = setImmediate ? task => setImmediate(task) : task => setTimeout(task, 0);

let clone = target => {
    if (!target) {
        return target;
    }

    return Object.entries(target).reduce(
        (result, [key, value]) => {
            result[key] = value;
            return result;
        },
        {}
    );
};

let isEmpty = target => {
    for (let key in target) {
        if (target.hasOwnProperty(key)) {
            return false;
        }
    }

    return true;
};

/**
 * A Model class is a representation of an object with change notifications.
 *
 * @extends mini-event.EventTarget
 *
 * @param {Object} [initialData] The initial data which will be filled.
 */
export default class Model extends EventTarget {
    constructor(initialData) {
        super();

        this[STORE] = clone(initialData) || {};
        this[COMPUTED_PROPERTIES] = {};
        this[IS_UPDATE_NOTIFICATION_IN_QUEUE] = false;
        this[SUPRESS_COMPUTED_PROPERTY_CHANGE_MUTEX] = 0;
        this[DIFF] = {};
        this[OLD_VALUES] = {};
    }

    /**
     * Get the value of property.
     *
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

        if (this[STORE].hasOwnProperty(name)) {
            return this[STORE][name];
        }
        else if (this[HAS_COMPUTED_PROPERTY](name)) {
            // Lazy evaluate computed property if `evaluate` is set to `false`
            let {get} = this[COMPUTED_PROPERTIES][name];
            let value = get.call(this);
            this[STORE][name] = value;
            return value;
        }

        return undefined;
    }

    /**
     * 设置值
     *
     *
     * @param {string} name The name of property.
     * @param {*} value The value of property.
     * @param {Object} [options] Extra options.
     * @param {boolean} [options.silent] If `true`, no `change` or `update` event is fired.
     *
     *
     * @emits beforechange
     * @emits change
     * @emits update
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
     *
     * @param {string} name The name of property.
     * @param {Object} [options] Extra options.
     * @param {boolean} [options.silent] If `true`, no `change` or `update` event is fired.
     *
     *
     * @emits beforechange
     * @emits change
     * @emits update
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
     *
     * @param {Object} commands The update commands, see {@link update} function for detail.
     * @param {Object} [options] Extra options.
     * @param {boolean} [options.silent] If `true`, no `change` or `update` event is fired.
     *
     * @emits beforechange
     * @emits change
     * @emits update
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
     *
     * @return {Object} A plain object, modifications to the dumped object takes no effect to model instance.
     */
    dump() {
        // Make a shallow copy to ensure future modification will not affect the current model instance.
        return clone(this[STORE]) || {};
    }

    /**
     * Detect if current {@link Model} instance has a property.
     *
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

        return this[HAS_PROPERTY](name);
    }

    /**
     * Detect if current {@link Model} instance has a property whose value is neither `null` nor `undefined`.
     *
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
     * @param {string} name The name of computed property.
     * @param {string[]} dependencies The dependency properties.
     * @param {Object|Function} accessorOrGetter A getter function or a descriptor containing meta of the property.
     * @param {Function} accessorOrGetter.get A getter function for computed property.
     * @param {Function} [accessorOrGetter.set] A optional set function for computed property.
     * @param {boolean} [accessorOrGetter.evaluate] Immediately evaluate the value of this computed property.
     */
    defineComputedProperty(name, dependencies, accessorOrGetter) {
        let descriptor = typeof accessorOrGetter === 'function' ? {get: accessorOrGetter} : clone(accessorOrGetter);
        descriptor.name = name;
        descriptor.dependencies = dependencies;
        descriptor.dependencySet = new Set(dependencies);
        descriptor.evaluate = descriptor.evaluate || false;

        // Listen for dependency changes
        this.on(
            'change',
            e => {
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
        if (descriptor.evaluate) {
            this[STORE][name] = descriptor.get.call(this);
        }
    }

    /**
     * Dispose current {@link Model} instance.
     */
    dispose() {
        this.destroyEvents();
        this[STORE] = null;
        this[DIFF] = null;
        this[OLD_VALUES] = null;
        this[IS_UPDATE_NOTIFICATION_IN_QUEUE] = false;
    }

    /**
     * Determine if specified property exists.
     *
     * @private
     *
     * @param {string} name Property name.
     * @return {boolean}
     */
    [HAS_PROPERTY](name) {
        return this[STORE].hasOwnProperty(name) || this[HAS_COMPUTED_PROPERTY](name);
    }

    /**
     * Determine if specified computed property exits.
     *
     * @private
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
     * @private
     *
     * @param {string} name Property name.
     * @param {*} value Property value.
     * @param {Object} [options] Extra options.
     * @param {boolean} [options.silent] If `true`, no `change` or `update` event is fired.
     */
    [SET_COMPUTED_PROPERTY](name, value, options) {
        let {set, dependencies} = this[COMPUTED_PROPERTIES][name];

        if (!set) {
            throw new Error(`Cannot set readonly computed property ${name}`);
        }

        this[SUPRESS_COMPUTED_PROPERTY_CHANGE_MUTEX]++;
        set.call(this, value, options);
        this[SUPRESS_COMPUTED_PROPERTY_CHANGE_MUTEX]--;
        this[UPDATE_COMPUTED_PROPERTIES_FROM_DEPENDENCY](dependencies);
    }

    /**
     * Update the cached value of a computed property and return the new value.
     *
     * @private
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

    /**
     * Update computed properties from specified dependencies.
     *
     * @private
     *
     * @param {string[]} dependencies Dependency property names.
     */
    [UPDATE_COMPUTED_PROPERTIES_FROM_DEPENDENCY](dependencies) {
        let updatingProperties = dependencies.reduce(
            (result, propertyName) => {
                let dependentComputedProperties = Object.values(this[COMPUTED_PROPERTIES])
                    .filter(descriptor => descriptor.dependencySet.has(propertyName))
                    .map(descriptor => descriptor.name);
                dependentComputedProperties.forEach(result.add.bind(result));
                return result;
            },
            new Set()
        );
        updatingProperties.forEach(this[UPDATE_COMPUTED_PROPERTY].bind(this));
    }

    /**
     * Set value to a property with an optional diff.
     *
     * This is the core logic of `set` and `update` method.
     *
     * @private
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

        // We suppose computed properties always have their initial values, despite wether they are lazy or not.
        let changeType = this[HAS_PROPERTY](name) ? 'change' : 'add';

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
            // Method such like `underscore.omit` has a complexity of O(n),
            // since the `store` object is an internal object just owned by model,
            // we use `delete` operator here to gain a little performance boost
            delete this[STORE][name];
        }
        else {
            this[STORE][name] = newValue;
        }

        let mergingDiff = {
            [name]: diff || createDiffNode(changeType, oldValue, newValue)
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
     */
    [SCHEDULE_UPDATE_EVENT]() {
        if (this[IS_UPDATE_NOTIFICATION_IN_QUEUE]) {
            return;
        }

        let update = () => {
            // Do not fire event on disposed model.
            if (this[STORE]) {
                // Ensure previous loop generates diff, otherwise do not fire event.
                if (!isEmpty(this[DIFF])) {
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
     *
     * @param {Object} diff Target diff obejct
     */
    [MERGE_UPDATE_DIFF](diff) {
        mergeDiff(this[DIFF], diff, this[OLD_VALUES], this[STORE]);
        this[SCHEDULE_UPDATE_EVENT]();
    }
}
