/**
 * EMC (EFE Model & Collection)
 * Copyright 2014 Baidu Inc. All rights reserved.
 *
 * @file Model类
 * @exports Model
 * @author otakustay
 */
const EMPTY = {};
const SILENT = {silent: true};
const STORE = Symbol('store');

import EventTarget from 'mini-event/EventTarget';

/**
 * 一个带有数据变更通知的对象
 *
 * @class Model
 * @extends mini-event.EventTarget
 *
 * @param {Object} [context] 初始化的数据
 */
export default class Model extends EventTarget {
    constructor(context) {
        super();
        this[STORE] = {};

        if (context) {
            this.fill(context, SILENT);
        }
    }

    /**
     * 获取对应键的值
     *
     * @method Model#get
     *
     * @param {string} name 属性名
     * @return {*} `name`对应的值
     *
     * @throws {Error} 当前对象已经销毁
     * @throws {Error} 未提供`name`参数
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
     * @param {string} name 属性名
     * @param {*} value 对应的值
     * @param {Object} [options] 相关选项
     * @param {boolean} [options.silent=false] 如果该值为`true`则不触发{@link Model#event:change|change事件}
     *
     * @fires change
     * @throws {Error} 当前对象已经销毁
     * @throws {Error} 未提供`name`参数
     * @throws {Error} 未提供`value`参数
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
     * 批量设置值
     *
     * @method Model#fill
     *
     * @param {Object} extension 批量值的存放对象
     * @param {Object} [options] 相关选项
     * @param {boolean} [options.silent=false] 如果该值为`true`则不触发{@link Model#event:change|change事件}
     *
     * @fires change
     * @throws {Error} 当前对象已经销毁
     * @throws {Error} 未提供`extension`参数
     */
    fill(extension, options) {
        if (!this[STORE]) {
            throw new Error('This model is disposed');
        }

        if (!extension) {
            throw new Error('Argument extension is not provided');
        }

        for (let name in extension) {
            if (extension.hasOwnProperty(name)) {
                this.set(name, extension[name], options);
            }
        }
    }

    /**
     * 删除对应键的值
     *
     * @method Model#remove
     *
     * @param {string} name 属性名
     * @param {Object} [options] 相关选项
     * @param {boolean} [options.silent=false] 如果该值为`true`则不触发{@link Model#event:change|change事件}
     *
     * @fires change
     * @throws {Error} 当前对象已经销毁
     * @throws {Error} 未提供`name`参数
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
     * 获取对应键的值并组装为一个新的{@link Model}对象后返回
     *
     * @method Model#getAsModel
     *
     * @param {string} name 属性名
     * @return {Model} `name`对应的值组装成的新的{@link Model}对象
     *
     * @throws {Error} 当前对象已经销毁
     * @throws {Error} 未提供`name`参数
     */
    getAsModel(name) {
        let value = this.get(name);
        let Model = this.constructor;
        if (!value || {}.toString.call(value) !== '[object Object]') {
            return new Model();
        }

        return new Model(value);
    }

    /**
     * 将当前{@link Model}对象导出为一个普通的对象
     *
     * @method Model#dump
     *
     * @return {Object} 一个普通的对象，修改该对象不会影响到当前{@link Model}对象
     */
    dump() {
        // 为保证获取对象后修改不会影响到当前`Model`对象，需要做一次克隆的操作
        let returnValue = {};
        for (let key in this[STORE]) {
            if (this[STORE].hasOwnProperty(key)) {
                returnValue[key] = this[STORE][key];
            }
        }
        return returnValue;
    }

    /**
     * 判断当前{@link Model}对象是否有指定的属性
     *
     * @method Model#has
     *
     * @param {string} name 属性名
     * @return {boolean}
     *
     * @throws {Error} 未提供`name`参数
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
     * 判断当前{@link Model}对象是否有指定的属性且值不为`null`或`undefined`
     *
     * @method Model#hasValue
     *
     * @param {string} name 属性名
     * @return {boolean}
     *
     * @throws {Error} 未提供`name`参数
     */
    hasValue(name) {
        if (!name) {
            throw new Error('Argument name is not provided');
        }

        if (!this[STORE]) {
            return false;
        }

        // 不要用`this.get`，有可能`Model`重写`get`还依赖这个方法
        return this.has(name) && this[STORE][name] != null;
    }

    /**
     * 判断当前{@link Model}对象是否有指定的属性且值不为`null`、`undefined`或空字符串
     *
     * @method Model#hasReadableValue
     *
     * @param {string} name 属性名
     * @return {boolean}
     *
     * @throws {Error} 未提供`name`参数
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
     * 克隆当前{@link Model}对象，产生一个新的{@link Model}对象
     *
     * @method Model#clone
     *
     * @return {Model} 克隆后的新{@link Model}对象
     *
     * @throws {Error} 当前对象已经销毁
     */
    clone() {
        if (!this[STORE]) {
            throw new Error('This model is disposed');
        }

        let Model = this.constructor;
        return new Model(this[STORE]);
    }

    /**
     * 销毁当前{@link Model}对象
     *
     * @method Model#dispose
     */
    dispose() {
        this.destroyEvents();
        this[STORE] = null;
    }
}
