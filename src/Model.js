/**
 * EMC (EFE Model & Collection)
 * Copyright 2014 Baidu Inc. All rights reserved.
 *
 * @ignore
 * @file Model类
 * @author otakustay
 */
define(
    function (require) {
        var EMPTY = {};
        var SILENT = { silent: true };

        /**
         * 一个带有数据变更通知的对象
         *
         * @class Model
         * @extends mini-event.EventTarget
         *
         * @param {Object} [context] 初始化的数据
         */
        var exports = {};

        exports.constructor = function (context) {
            this.store = {};

            if (context) {
                this.fill(context, SILENT);
            }
        };

        /**
         * 获取对应键的值
         *
         * @method Model#.get
         *
         * @param {string} name 属性名
         * @return {*} `name`对应的值
         *
         * @throws {Error} 当前对象已经销毁
         * @throws {Error} 未提供`name`参数
         */
        exports.get = function (name) {
            if (!this.store) {
                throw new Error('This model is disposed');
            }

            if (!name) {
                throw new Error('Argument name is not provided');
            }

            return this.store.hasOwnProperty(name) ? this.store[name] : undefined;
        };

        /**
         * 设置值
         *
         * @method Model#.set
         *
         * @param {string} name 属性名
         * @param {*} value 对应的值
         * @param {Object} [options] 相关选项
         * @param {boolean} [options.silent=false] 如果该值为`true`则不触发{@link Model#.event:change|change事件}
         *
         * @fires change
         * @throws {Error} 当前对象已经销毁
         * @throws {Error} 未提供`name`参数
         * @throws {Error} 未提供`value`参数
         */
        exports.set = function (name, value, options) {
            if (!this.store) {
                throw new Error('This model is disposed');
            }

            if (!name) {
                throw new Error('Argument name is not provided');
            }

            if (arguments.length < 2) {
                throw new Error('Argument value is not provided');
            }

            options = options || EMPTY;

            var changeType = this.store.hasOwnProperty(name) ? 'change' : 'add';
            var oldValue = this.store[name];
            this.store[name] = value;

            if (oldValue !== value && !options.silent) {
                var event = {
                    name: name,
                    oldValue: oldValue,
                    newValue: value,
                    changeType: changeType
                };
                /**
                 * 属性值发生变化时触发
                 *
                 * @event Model#.change
                 *
                 * @property {string} name 发生变化的属性的名称
                 * @property {string} changeType 变化的类型，取值为`"add"`、`"change"`或`"remove"`
                 * @property {*} oldValue 变化前的值
                 * @property {*} newValue 变化后的值
                 */
                this.fire('change', event);
                this.fire('change:' + name, event);
            }
        };

        /**
         * 批量设置值
         *
         * @method Model#.fill
         *
         * @param {Object} extension 批量值的存放对象
         * @param {Object} [options] 相关选项
         * @param {boolean} [options.silent=false] 如果该值为`true`则不触发{@link Model#.event:change|change事件}
         *
         * @fires change
         * @throws {Error} 当前对象已经销毁
         * @throws {Error} 未提供`extension`参数
         */
        exports.fill = function (extension, options) {
            if (!this.store) {
                throw new Error('This model is disposed');
            }

            if (!extension) {
                throw new Error('Argument extension is not provided');
            }

            for (var name in extension) {
                if (extension.hasOwnProperty(name)) {
                    this.set(name, extension[name], options);
                }
            }
        };

        /**
         * 删除对应键的值
         *
         * @method Model#.remove
         *
         * @param {string} name 属性名
         * @param {Object} [options] 相关选项
         * @param {boolean} [options.silent=false] 如果该值为`true`则不触发{@link Model#.event:change|change事件}
         *
         * @fires change
         * @throws {Error} 当前对象已经销毁
         * @throws {Error} 未提供`name`参数
         */
        exports.remove = function (name, options) {
            if (!this.store) {
                throw new Error('This model is disposed');
            }

            if (!name) {
                throw new Error('Argument name is not provided');
            }

            // 如果原来就没这个值，就不触发`change`事件了
            if (!this.store.hasOwnProperty(name)) {
                return undefined;
            }

            options = options || EMPTY;
            var oldValue = this.store[name];

            // 用类似`underscore.omit`的方法，会受属性的多少有影响，所以还是乖乖用`delete`吧
            delete this.store[name];

            if (!options.silent) {
                var event = {
                    name: name,
                    changeType: 'remove',
                    oldValue: oldValue,
                    newValue: undefined
                };
                this.fire('change', event);
                this.fire('change:' + name, event);
            }
        };

        /**
         * 获取对应键的值并组装为一个新的{@link Model}对象后返回
         *
         * @method Model#.getAsModel
         *
         * @param {string} name 属性名
         * @return {Model} `name`对应的值组装成的新的{@link Model}对象
         *
         * @throws {Error} 当前对象已经销毁
         * @throws {Error} 未提供`name`参数
         */
        exports.getAsModel = function (name) {
            var value = this.get(name);
            if (!value || {}.toString.call(value) !== '[object Object]') {
                return new Model();
            }
            else {
                return new Model(value);
            }
        };

        /**
         * 将当前{@link Model}对象导出为一个普通的对象
         *
         * @method Model#.dump
         *
         * @return {Object} 一个普通的对象，修改该对象不会影响到当前{@link Model}对象
         */
        exports.dump = function () {
            // 为保证获取对象后修改不会影响到当前`Model`对象，需要做一次克隆的操作
            var returnValue = {};
            for (var key in this.store) {
                if (this.store.hasOwnProperty(key)) {
                    returnValue[key] = this.store[key];
                }
            }
            return returnValue;
        };

        /**
         * 判断当前{@link Model}对象是否有指定的属性
         *
         * @method Model#.has
         *
         * @param {string} name 属性名
         * @return {boolean}
         *
         * @throws {Error} 未提供`name`参数
         */
        exports.has = function (name) {
            if (!name) {
                throw new Error('Argument name is not provided');
            }

            if (!this.store) {
                return false;
            }

            return this.store.hasOwnProperty(name);
        };

        /**
         * 判断当前{@link Model}对象是否有指定的属性且值不为`null`或`undefined`
         *
         * @method Model#.hasValue
         *
         * @param {string} name 属性名
         * @return {boolean}
         *
         * @throws {Error} 未提供`name`参数
         */
        exports.hasValue = function (name) {
            if (!name) {
                throw new Error('Argument name is not provided');
            }

            if (!this.store) {
                return false;
            }

            // 不要用`this.get`，有可能`Model`重写`get`还依赖这个方法
            return this.has(name) && this.store[name] != null;
        };

        /**
         * 判断当前{@link Model}对象是否有指定的属性且值不为`null`、`undefined`或空字符串
         *
         * @method Model#.hasReadableValue
         *
         * @param {string} name 属性名
         * @return {boolean}
         *
         * @throws {Error} 未提供`name`参数
         */
        exports.hasReadableValue = function (name) {
            if (!name) {
                throw new Error('Argument name is not provided');
            }

            if (!this.store) {
                return false;
            }

            return this.hasValue(name) && this.store[name] !== '';
        };

        /**
         * 克隆当前{@link Model}对象，产生一个新的{@link Model}对象
         *
         * @method Model#.clone
         *
         * @return {Model} 克隆后的新{@link Model}对象
         *
         * @throws {Error} 当前对象已经销毁
         */
        exports.clone = function () {
            if (!this.store) {
                throw new Error('This model is disposed');
            }

            return new Model(this.store);
        };

        /**
         * 销毁当前{@link Model}对象
         *
         * @method Model#.dispose
         */
        exports.dispose = function () {
            this.destroyEvents();
            this.store = null;
        };

        var Model = require('eoo').create(require('mini-event/EventTarget'), exports);

        return Model;
    }
);
