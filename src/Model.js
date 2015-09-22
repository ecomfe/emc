/**
 * EMC (EFE Model & Collection)
 * Copyright 2014 Baidu Inc. All rights reserved.
 *
 * @file Model class
 * @exports Model
 * @author otakustay
 */

import u from 'underscore';
import EventTarget from 'mini-event/EventTarget';

const EMPTY = {};
const STORE = Symbol('store');

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
             * Fired before a property is to be changed, this can be `preventDefault()`.
             *
             * @event Model#beforechange
             *
             * @property {string} name The name of property.
             * @property {string} changeType The type of change, could be `"add"`, `"change"` or `"remove"`
             * @property {*} oldValue The old value of property.
             * @property {*} newValue The new value of property.
             * @property {*} actualValue The actual value of prpoerty,
             *     we can change this property to modified the value of the final set operation.
             */
            let event = this.fire('beforechange', eventData);

            if (!event.isDefaultPrevented()) {
                this[STORE][name] = event.actualValue;
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

        // 如果原来就没这个值，就不触发`change`事件了
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
                // `underscore.omit` method has a complexity of O(n),
                // since the `store` object is an internal object just owned by model,
                // we use `delete` operator here to gain a little performance boost
                delete this[STORE][name];
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
    }
}
