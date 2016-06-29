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

let async = typeof setImmediate === 'undefined' ? task => setTimeout(task, 0) : task => setImmediate(task);

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
 * 数据模型类，用于表达一个数据集，同时提供数据变更的通知功能
 *
 * @extends mini-event.EventTarget
 *
 * @param {Object} [initialData] 初始化数据
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
     * 获取指定属性的值
     *
     *
     * @param {string} name 属性名
     * @return {*} 属性值
     *
     * @throws {Error} 当前实例已经销毁了
     * @throws {Error} 未提供`name`参数
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
            // 如果`evaluate`选项为`false`，则延迟计算属性的取值（默认行为）
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
     * @param {string} name 属性名
     * @param {*} value 属性值
     * @param {Object} [options] 额外选项
     * @param {boolean} [options.silent] 此选项为`true`时，不会触发`beforechange`、`change`和`update`事件
     *
     *
     * @emits beforechange
     * @emits change
     * @emits update
     *
     * @throws {Error} 当前实例已经销毁了
     * @throws {Error} 未提供`name`参数
     */
    set(name, value, options = EMPTY) {
        if (!this[STORE]) {
            throw new Error('This model is disposed');
        }

        if (!name) {
            throw new Error('Argument name is not provided');
        }

        if (this[HAS_COMPUTED_PROPERTY](name)) {
            this[SET_COMPUTED_PROPERTY](name, value, options);
        }
        else {
            this[SET_VALUE](name, value, options);
        }
    }

    /**
     * 删除指定属性
     *
     *
     * @param {string} name 属性名
     * @param {Object} [options] 额外选项
     * @param {boolean} [options.silent] 此选项为`true`时，不会触发`beforechange`、`change`和`update`事件
     *
     * @emits beforechange
     * @emits change
     * @emits update
     *
     * @throws {Error} 当前实例已经销毁了
     * @throws {Error} 未提供`name`参数
     */
    remove(name, options = EMPTY) {
        if (!this[STORE]) {
            throw new Error('This model is disposed');
        }

        if (!name) {
            throw new Error('Argument name is not provided');
        }

        // 如果本来就没这属性，就提前退出
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
     * 使用一个指令对象来更新当前实例
     *
     * 此方法其实是`diffy-update`工具库的封装，但是不允许对根属性进行操作，即你不可以提供类似`{$set: foo}`的指令
     *
     * 在多次调用该方法时，会对产生的差异进行合并，在`update`事件中只会体现出一个差异对象
     *
     *
     * @param {Object} commands 用于更新的指令，具体参考[diffy-update](https://github.com/ecomfe/diffy-update)库的说明
     * @param {Object} [options] 额外选项
     * @param {boolean} [options.silent] 此选项为`true`时，不会触发`beforechange`、`change`和`update`事件
     *
     * @emits beforechange
     * @emits change
     * @emits update
     *
     * @throws {Error} 未提供`commands`参数
     */
    update(commands, options = EMPTY) {
        if (!commands) {
            throw new Error('Argument commands is not provided');
        }

        this[SUPRESS_COMPUTED_PROPERTY_CHANGE_MUTEX]++;
        // 禁止根属性的修改，不然会直接把`STORE`给改掉
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
     * 将当前实例存放的数据导出为一个普通对象
     *
     * @return {Object} 返回一个普通对象，对此对象进行修改不会影响当前`Model`实例
     */
    dump() {
        // 用浅复制避免外部修改导出的对象影响实例
        return clone(this[STORE]) || {};
    }

    /**
     * 判断当前实例是否有指定的属性
     *
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

        return this[HAS_PROPERTY](name);
    }

    /**
     * 判断当前实例是否有指定的属性，且属性值不为`null`或`undefined`
     *
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

        // 这里不用`this.get`，免得子类重写了`get`后导致判断出问题
        return this.has(name) && this[STORE][name] != null;
    }

    /**
     * 判断当前实例是否有指定的属性，且属性值不为`null`、`undefined`或空字符串`""`
     *
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
     * 定义一个计算属性
     *
     * @param {string} name 计算属性的名称
     * @param {string[]} dependencies 其依赖的属性集
     * @param {Object|Function} accessorOrGetter 获取属性值的函数或一个描述对象，描述对象的属性参考如下
     * @param {Function} accessorOrGetter.get 获取属性值的函数
     * @param {Function} [accessorOrGetter.set] 设置属性值的函数
     * @param {boolean} [accessorOrGetter.evaluate] 是否立即计算属性值，默认会在第一次访问或依赖属性变化时计算
     */
    defineComputedProperty(name, dependencies, accessorOrGetter) {
        let descriptor = typeof accessorOrGetter === 'function' ? {get: accessorOrGetter} : clone(accessorOrGetter);
        descriptor.name = name;
        descriptor.dependencies = dependencies;
        descriptor.dependencySet = new Set(dependencies);
        descriptor.evaluate = descriptor.evaluate || false;

        this[COMPUTED_PROPERTIES][name] = descriptor;
        // 如果要求立即计算，那么计算后存下来，因为是初始值，所以这个不会影响内部存储的差异集的
        if (descriptor.evaluate) {
            this[STORE][name] = descriptor.get.call(this);
        }
    }

    /**
     * 销毁当前实例
     */
    dispose() {
        this.destroyEvents();
        this[STORE] = null;
        this[DIFF] = null;
        this[OLD_VALUES] = null;
        this[IS_UPDATE_NOTIFICATION_IN_QUEUE] = false;
    }

    /**
     * 判断指定属性是否存在
     *
     * @private
     *
     * @param {string} name 属性名
     * @return {boolean}
     */
    [HAS_PROPERTY](name) {
        return this[STORE].hasOwnProperty(name) || this[HAS_COMPUTED_PROPERTY](name);
    }

    /**
     * 判断指定的计算属性是否存在
     *
     * @private
     *
     * @param {string} name 属性名
     * @return {boolean}
     */
    [HAS_COMPUTED_PROPERTY](name) {
        return this[COMPUTED_PROPERTIES].hasOwnProperty(name);
    }

    /**
     * 设置计算属性的值
     *
     * @private
     *
     * @param {string} name 属性名
     * @param {*} value 属性值
     * @param {Object} [options] 额外选项
     * @param {boolean} [options.silent] 此选项为`true`时，不会触发`beforechange`、`change`和`update`事件
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
     * 重新计算一个计算属性的值并更新至当前实例上
     *
     * @private
     *
     * @param {string} name 属性名
     * @param {Object} [options] 额外选项
     * @param {boolean} [options.silent] 此选项为`true`时，不会触发`beforechange`、`change`和`update`事件
     */
    [UPDATE_COMPUTED_PROPERTY](name, options = EMPTY) {
        let {get} = this[COMPUTED_PROPERTIES][name];
        let newValue = get.call(this);
        this[SET_VALUE](name, newValue, Object.assign({disableHook: true}, options));
    }

    /**
     * 根据依赖属性来查找并更新所有相关的计算属性
     *
     * @private
     *
     * @param {string[]} dependencies 被依赖的属性名称集
     */
    [UPDATE_COMPUTED_PROPERTIES_FROM_DEPENDENCY](dependencies) {
        let updatingProperties = dependencies.reduce(
            (result, propertyName) => {
                let dependentComputedProperties = Object.values(this[COMPUTED_PROPERTIES])
                    .filter(descriptor => descriptor.dependencySet.has(propertyName))
                    .map(descriptor => descriptor.name);
                dependentComputedProperties.forEach(property => result.add(property));
                return result;
            },
            new Set()
        );
        updatingProperties.forEach(property => this[UPDATE_COMPUTED_PROPERTY](property));
    }

    /**
     * 设置属性值，接受额外的差异对象
     *
     * 此函数为`set`和`update`的核心逻辑
     *
     * @private
     *
     * @param {string} name 属性名
     * @param {*} value 属性值
     * @param {Object} options 额外选项
     * @param {boolean} [options.silent] 此选项为`true`时，不会触发`beforechange`、`change`和`update`事件
     * @param {boolean} [options.disableHook] 此选项为`true`时，不会触发`beforechange`事件，该选项仅内部使用
     * @param {Object} [diff] 可选的差异对象，如果存在则会合并到当前已经存在的差异集中
     */
    [SET_VALUE](name, value, options, diff) {
        let oldValue = this[STORE][name];
        let isValueChanged = !this.has(name) || oldValue !== value;
        if (!isValueChanged) {
            return;
        }

        // 计算属性无论是不是立即求值的，我们都当它有个初始值，所以懒求值的计算属性第一次变化时旧值就是`undefined`了
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
         * 在属性值变化前一刻触发
         *
         * `beforechange`事件会由`set`和`update`方法触发，当使用`update`方法时，每个更新的属性都会触发一次该事件
         *
         * 如果事件由`update`触发，那么事件对象上会提供一个`diff`属性表达更新的差异
         *
         * 在该事件的处理函数中，可以使用`event.preventDefault()`来阻止后续的属性赋值，阻止后`change`事件就不会触发了
         *
         * 同时还可以修改`event.actualValue`值来改变实际赋予属性的值，如果`actualValue`被改变了，那么`diff`属性就会失效
         *
         * @event Model#beforechange
         *
         * @property {string} name 属性名
         * @property {string} changeType 变化的类型，可以为`"add"`、`"change"`或`"remove"`
         * @property {*} oldValue 属性的旧值
         * @property {*} newValue 属性的新值
         * @property {Object} [diff] 属性变化的差异对象
         * @property {*} actualValue 实际赋予属性的值，修改这个属性可以改变最后的赋值内容
         */
        let event = this.fire('beforechange', eventData);

        if (!event.isDefaultPrevented()) {
            // Discard diff if `actualValue` is changed in event handlers.
            let actualDiff = event.actualValue === value ? diff : undefined;
            this[ASSIGN_VALUE](name, event.actualValue, event.changeType, options, actualDiff);
        }
    }

    /**
     * 为指定属性赋值
     *
     * 这是`SET_VALUE`和`remove`方法的核心逻辑
     *
     * @private
     *
     * @param {string} name 属性名
     * @param {*} newValue 属性值
     * @param {string} changeType 变化的类型，可以为`"add"`、`"change"`或`"remove"`
     * @param {Object} options 额外选项
     * @param {boolean} [options.silent] 如果该选项为`true`，则不触发`change`事件.
     * @param {Object} [diff] 可选的属性变化的差异对象
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
             * @property {string} name 属性名
             * @property {string} changeType 变化的类型，可以为`"add"`、`"change"`或`"remove"`
             * @property {*} oldValue 属性的旧值
             * @property {*} newValue 属性的新值
             * @property {Object} [diff] A diff between the old and new value, only available for `update` method.
             */
            this.fire('change', eventData);
        }

        if (!this[SUPRESS_COMPUTED_PROPERTY_CHANGE_MUTEX]) {
            this[UPDATE_COMPUTED_PROPERTIES_FROM_DEPENDENCY]([name]);
        }
    }

    /**
     * 计划一个用于触发`update`事件的任务，使一次`update`事件可以收集多次`set`或`update`等产生的变化
     *
     * @private
     */
    [SCHEDULE_UPDATE_EVENT]() {
        if (this[IS_UPDATE_NOTIFICATION_IN_QUEUE]) {
            return;
        }

        let update = () => {
            // 如果实例已经销毁就算了
            if (this[STORE]) {
                // 如果确实有差异就触发`update`事件，没差异就没事件
                if (!isEmpty(this[DIFF])) {
                    /**
                     * 在属性变化后异步触发
                     *
                     * 这个事件是异步触发的，所以一个事件循环内所有的数据修改都会收集在一起，并合并成一个差异对象
                     *
                     * @property {Object} [diff] 一个事件循环内产生的差异对象
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
     * 将新产生的差异对象合并到已有的差异集上
     *
     * @private
     *
     * @param {Object} diff 新产生的差异对象
     */
    [MERGE_UPDATE_DIFF](diff) {
        mergeDiff(this[DIFF], diff, this[OLD_VALUES], this[STORE]);
        this[SCHEDULE_UPDATE_EVENT]();
    }
}
