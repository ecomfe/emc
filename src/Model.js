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
const SILENT = {silent: true};
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

        let changeType = this[STORE].hasOwnProperty(name) ? 'change' : 'add';
        let oldValue = this[STORE][name];
        this[STORE][name] = value;

        if (oldValue !== value && !options.silent) {
            let event = {
                name: name,
                oldValue: oldValue,
                newValue: value,
                changeType: changeType
            };
            /**
             * 属性值发生变化时触发
             *
             * @event Model#change
             *
             * @property {string} name 发生变化的属性的名称
             * @property {string} changeType 变化的类型，取值为`"add"`、`"change"`或`"remove"`
             * @property {*} oldValue 变化前的值
             * @property {*} newValue 变化后的值
             */
            this.fire('change', event);
            this.fire('change:' + name, event);
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
        if (!this[STORE].hasOwnProperty(name)) {
            return;
        }

        options = options || EMPTY;
        let oldValue = this[STORE][name];

        // 用类似`underscore.omit`的方法，会受属性的多少有影响，所以还是乖乖用`delete`吧
        delete this[STORE][name];

        if (!options.silent) {
            let event = {
                name: name,
                changeType: 'remove',
                oldValue: oldValue,
                newValue: undefined
            };
            this.fire('change', event);
            this.fire('change:' + name, event);
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
        return u.clone(this[STORE]);
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
