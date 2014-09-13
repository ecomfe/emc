/**
 * EMC (EFE Model & Collection)
 * Copyright 2014 Baidu Inc. All rights reserved.
 *
 * @ignore
 * @file Collection类
 * @author otakustay
 */
define(
    function (require) {
        var EMPTY = {};
        var SILENT = { silent: true };

        /**
         * 一个带有集合变更通知的数组
         *
         * @class Collection
         * @extends mini-event.EventTarget
         *
         * @param {Array} [items] 初始化的数据
         *
         * @throws {Error} 提供的`items`参数不是数组
         */
        var exports = {};

        exports.constructor = function (items) {
            this.store = [];
            this.length = 0;

            if (items) {
                this.addArray(items, SILENT);
            }
        };

        /**
         * 获取集合中指定位置上的元素
         *
         * @method Collection#.get
         *
         * @param {number} index 指定位置，如果为负数则从元素最后开始往前计算
         * @return {*} 指定位置的元素，如果指定的位置超出集合范围，则返回`undefined`
         *
         * @throws {Error} 当前集合已经销毁
         * @throws {Error} 未提供`index`参数
         * @throws {Error} 提供的`index`参数无法转换为数字
         */
        exports.get = function (index) {
            if (!this.store) {
                throw new Error('This collection is disposed');
            }

            if (index == null) {
                throw new Error('Argument index is not provided');
            }

            index = +index;

            if (isNaN(index)) {
                throw new Error('Argument index cannot convert to a number');
            }

            // 如果是空的就直接返回，避免太多计算
            if (!this.length) {
                return undefined;
            }

            // 由于超出范围后要返回`undefined`，此处不能用`getValidIndex`来将`index`计算至可用范围
            if (index < 0) {
                index = this.length + index;
            }
            if (index < 0 || index >= this.length) {
                return undefined;
            }

            var item = this.store[index];
            return item;
        };

        /**
         * 在指定位置添加一个元素
         *
         * @method Collection#.insert
         *
         * @param {number} index 需要添加的位置，关于位置的计算参考{@link Collection#getValidIndex}
         * @param {*} item 需要添加的元素
         * @param {Object} [options] 相关选项
         * @param {boolean} [options.silent=false] 如果该值为`true`则不触发{@link Collection#.event:add}事件
         *
         * @fires add
         * @throws {Error} 当前集合已经销毁
         * @throws {Error} 未提供`index`参数
         * @throws {Error} 提供的`index`参数无法转换为数字
         * @throws {Error} 未提供`item`参数
         */
        exports.insert = function (index, item, options) {
            if (!this.store) {
                throw new Error('This collection is disposed');
            }

            switch (arguments.length) {
                case 0:
                    throw new Error('Argument index is not provided');
                case 1:
                    throw new Error('Argument item is not provided');
            }

            index = this.getValidIndex(index);
            options = options || EMPTY;

            // 没有必要特地优化为`push`和`unshift`：http://jsperf.com/push-vs-splice
            this.store.splice(index, 0, item);
            this.length = this.store.length;

            if (!options.silent) {
                /**
                 * 添加元素时触发
                 *
                 * @event Collection#.add
                 *
                 * @property {number} index 添加元素的位置
                 * @property {*} item 添加的元素
                 */
                this.fire('add', { index: index, item: item });
            }

            return item;
        };

        /**
         * 在指定位置添加一个元素，与{@link Collection#insert}方法相同
         *
         * @method Collection#.addAt
         *
         * @param {number} index 需要添加的位置，关于位置的计算参考{@link Collection#getValidIndex}
         * @param {*} item 需要添加的元素
         * @param {Object} [options] 相关选项
         * @param {boolean} [options.silent=false] 如果该值为`true`则不触发{@link Collection#.event:add|add事件}
         *
         * @fires add
         * @throws {Error} 当前集合已经销毁
         * @throws {Error} 未提供`index`参数
         * @throws {Error} 提供的`index`参数无法转换为数字
         * @throws {Error} 未提供`item`参数
         */
        exports.addAt = exports.insert;

        /**
         * 在当前集合的最后位置添加一个元素
         *
         * @method Collection#.add
         *
         * @param {*} item 需要添加的元素
         * @param {Object} [options] 相关选项
         * @param {boolean} [options.silent=false] 如果该值为`true`则不触发{@link Collection#.event:add|add事件}
         *
         * @fires add
         * @throws {Error} 当前集合已经销毁
         * @throws {Error} 未提供`item`参数
         */
        exports.add = function (item, options) {
            if (!arguments.length) {
                throw new Error('Argument item is not provided');
            }

            this.insert(this.length, item, options);
        };

        /**
         * 在当前集合的最后位置添加一个元素，与{@link Collection#add}方法相同
         *
         * @method Collection#.push
         *
         * @param {*} item 需要添加的元素
         * @param {Object} [options] 相关选项
         * @param {boolean} [options.silent=false] 如果该值为`true`则不触发{@link Collection#.event:add|add事件}
         *
         * @fires add
         * @throws {Error} 当前集合已经销毁
         * @throws {Error} 未提供`item`参数
         */
        exports.push = exports.add;

        /**
         * 在当前集合的最前位置添加一个元素
         *
         * @method Collection#.unshift
         *
         * @param {*} item 需要添加的元素
         * @param {Object} [options] 相关选项
         * @param {boolean} [options.silent=false] 如果该值为`true`则不触发{@link Collection#.event:add|add事件}
         *
         * @fires add
         * @throws {Error} 当前集合已经销毁
         * @throws {Error} 未提供`item`参数
         */
        exports.unshift = function (item, options) {
            if (!arguments.length) {
                throw new Error('Argument item is not provided');
            }

            this.insert(0, item, options);
        };

        /**
         * 从指定位置移除一个元素
         *
         * @method Collection#.removeAdd
         *
         * @param {number} index 需要移除的元素的位置，关于位置的计算参考{@link Collection#getValidIndex}
         * @param {Object} [options] 相关选项
         * @param {boolean} [options.silent=false] 如果该值为`true`则不触发{@link Collection#.event:remove|remvoe事件}
         *
         * @fires remove
         * @throws {Error} 当前集合已经销毁
         * @throws {Error} 未提供`index`参数
         * @throws {Error} 提供的`index`参数无法转换为数字
         */
        exports.removeAt = function (index, options) {
            if (!this.store) {
                throw new Error('This collection is disposed');
            }

            var actualIndex = Math.min(this.length - 1, this.getValidIndex(index));
            options = options || EMPTY;

            // 空的就不用计算了，否则会触发事件，为了保持异常的一致性，要先计算`index`确认不用抛出异常，因此不要放到前面去
            if (!this.length) {
                return;
            }

            var removedItem = this.store.splice(actualIndex, 1)[0];
            this.length = this.store.length;

            if (!options.silent) {
                /**
                 * 移除元素时触发
                 *
                 * @event Collection#.remove
                 *
                 * @property {number} index 移除元素的位置
                 * @property {*} item 移除的元素
                 */
                this.fire('remove', { index: actualIndex, item: removedItem });
            }
        };

        /**
         * 移除集合最后一个元素并返回
         *
         * @method Collection#.pop
         *
         * @param {Object} [options] 相关选项
         * @param {boolean} [options.silent=false] 如果该值为`true`则不触发{@link Collection#.event:remove|remove事件}
         *
         * @fires remove
         * @throws {Error} 当前集合已经销毁
         */
        exports.pop = function (options) {
            var lastItem = this.get(-1);
            this.removeAt(-1, options);
            return lastItem;
        };

        /**
         * 移除集合第一个元素并返回
         *
         * @method Collection#.shift
         *
         * @param {Object} [options] 相关选项
         * @param {boolean} [options.silent=false] 如果该值为`true`则不触发{@link Collection#.event:remove|remove事件}
         *
         * @fires remove
         * @throws {Error} 当前集合已经销毁
         */
        exports.shift = function (options) {
            var firstItem = this.get(0);
            this.removeAt(0, options);
            return firstItem;
        };

        /**
         * 移除集合中所有的给定元素
         *
         * @method Collection#.remove
         *
         * @param {*} item 需要移除的元素
         * @param {Object} [options] 相关选项
         * @param {boolean} [options.silent=false] 如果该值为`true`则不触发{@link Collection#.event:remove|remove事件}
         *
         * @fires remove
         * @throws {Error} 当前集合已经销毁
         * @throws {Error} 未提供`item`参数
         */
        exports.remove = function (item, options) {
            if (!arguments.length) {
                throw new Error('Argument item is not provided');
            }

            var startIndex = this.indexOf(item);
            while (startIndex !== -1) {
                this.removeAt(startIndex, options);
                startIndex = this.indexOf(item, startIndex);
            }
        };

        /**
         * 查找指定元素在集合中第一次出现的位置
         *
         * @method Collection#.indexOf
         *
         * @param {*} item 指定查找的元素
         * @param {number} [startIndex=0] 指定开始查找的位置，如果为负数则从最后位置往前计算，如果超出范围则不进行搜索返回`-1`
         * @return {number} 元素所在的位置，如果集合中从指定的位置开始未能找到元素则返回-1
         *
         * @throws {Error} 当前集合已经销毁
         * @throws {Error} 未提供`item`参数
         * @throws {Error} 提供的`startIndex`参数无法转换为数字
         */
        exports.indexOf = function (item, startIndex) {
            if (!this.store) {
                throw new Error('This collection is disposed');
            }

            if (!arguments.length) {
                throw new Error('Argument item is not provided');
            }

            startIndex = startIndex || 0;

            var actualStartIndex = this.getValidIndex(startIndex);
            for (var i = actualStartIndex; i < this.length; i++) {
                if (this.store[i] === item) {
                    return i;
                }
            }
            return -1;
        };

        /**
         * 导出当前集合为普通的数组
         *
         * 如果当前集合已经销毁，该方法会返回一个空数组`[]`
         *
         * @method Collection#.dump
         *
         * @return {Array} 包含当前集合的元素（及其顺序）的数组
         */
        exports.dump = function () {
            return this.store ? this.store.slice() : [];
        };

        /**
         * 复制当前集合
         *
         * @method Collection#.clone
         *
         * @return {Collection} 一个新的集合，包含当前集合的元素（及其顺序）
         *
         * @throws {Error} 当前集合已经销毁
         */
        exports.clone = function () {
            if (!this.store) {
                throw new Error('This collection is disposed');
            }

            return new Collection(this.store);
        };

        /**
         * 销毁当前集合
         *
         * @method Collection#.dispose
         */
        exports.dispose = function () {
            this.destroyEvents();
            this.store = null;
            this.length = undefined;
        };

        /**
         * 获取一个可用的索引值
         *
         * - 当给定的索引大于集合长度时，返回集合的长度
         * - 当给定的索引小于0时，从集合的末尾开始向前计算
         * - 当索引小于0并且其绝对值大于集合长度时，返回0
         *
         * 如果用于删除，由于索引值过大时会返回当前集合的长度，需要在返回值之后再减去1得到正确的删除位置
         *
         * @method Collection#.getValidIndex
         *
         * @param {number} index 输入的索引值
         * @return {number} 计算后的可用索引值
         * @protected
         *
         * @throws {Error} 未提供`index`参数
         * @throws {Error} 提供的`index`参数无法转换为数字
         */
        exports.getValidIndex = function (index) {
            if (index == null) {
                throw new Error('Argument index is not provided');
            }

            var validIndex = +index;

            if (isNaN(validIndex)) {
                throw new Error('Argument index (of value "' + index + '") cannot convert to a number');
            }

            if (validIndex > this.length) {
                return this.length;
            }

            if (validIndex < 0) {
                return Math.max(this.length + validIndex, 0);
            }

            return validIndex;
        };

        /**
         * 添加一系列的元素
         *
         * 此方法为私有方法，不要由外部或子类调用
         *
         * @method Collection#.addArray
         *
         * @param {Array} items 需要添加的元素数组
         * @param {Object} [options] 相关选项
         * @param {boolean} [options.silent=false] 如果该值为`true`则不触发{@link Collection#.event:add}事件
         * @private
         *
         * @throws {Error} 提供的`items`参数不是数组
         */
        exports.addArray = function (items, options) {
            if (typeof items.length !== 'number') {
                throw new Error('Argument itmes (of value "' + items + '") is not an array');
            }

            for (var i = 0; i < items.length; i++) {
                this.add(items[i], options);
            }
        };

        var Collection = require('eoo').create(require('mini-event/EventTarget'), exports);

        return Collection;
    }
);
