define(
    function (require) {
        var Collection = require('Collection');

        describe('Collection', function () {
            it('should be a constructor', function () {
                expect(typeof Collection).toBe('function');
            });

            describe('constructor', function () {
                it('should work without any argument', function () {
                    var collection = new Collection();
                    expect(collection).toBeDefined();
                });

                it('should fill itself if an array is given', function () {
                    var array = [1, 2];
                    var collection = new Collection(array);
                    expect(collection.get(0)).toBe(1);
                    expect(collection.get(1)).toBe(2);
                });

                it('should not effect the collection if array object is modified', function () {
                    var array = [1, 2];
                    var collection = new Collection(array);
                    array.push(3);
                    expect(collection.get(2)).toBeUndefined();
                });

                it('should throw if a non-array object is given', function () {
                    expect(function () { new Collection({}); }).toThrow();
                    expect(function () { new Collection(true); }).toThrow();
                    expect(function () { new Collection(1); }).toThrow();
                });
            });

            describe('get method', function () {
                it('should return an item at given index', function () {
                    var collection = new Collection([1, 2]);
                    expect(collection.get(0)).toBe(1);
                });
                it('should accept a string which can convert to number', function () {
                    var collection = new Collection([1, 2]);
                    expect(collection.get('0')).toBe(1);
                });

                it('should return undefined if index is out of range', function () {
                    var collection = new Collection([1, 2]);
                    expect(collection.get(2)).toBeUndefined();
                });

                it('should calculate index from the end if index is negative', function () {
                    var collection = new Collection([1, 2]);
                    expect(collection.get(-1)).toBe(2);
                });

                it('should return undefined if negative index is out of range', function () {
                    var collection = new Collection([1, 2]);
                    expect(collection.get(-5)).toBeUndefined();
                });

                it('should throw if index is not provided', function () {
                    var collection = new Collection();
                    expect(function () { collection.get(null); }).toThrow();
                    expect(function () { collection.get(undefined); }).toThrow();
                    expect(function () { collection.get(); }).toThrow();
                });

                it('should throw if index cannot convert to a number', function () {
                    var collection = new Collection();
                    expect(function () { collection.get({}); }).toThrow();
                    expect(function () { collection.get(Object); }).toThrow();
                    expect(function () { collection.get(/reg exp/); }).toThrow();
                    expect(function () { collection.get('string'); }).toThrow();
                });
            });

            describe('add method', function () {
                it('should add an item at tail', function () {
                    var collection = new Collection();
                    collection.add(1);
                    expect(collection.length).toBe(1);
                    expect(collection.get(0)).toBe(1);
                });

                it('should accept undefined value', function () {
                    var collection = new Collection();
                    collection.add(undefined);
                    expect(collection.get(0)).toBe(undefined);
                });

                it('should throw if no argument is provided', function () {
                    var collection = new Collection();
                    expect(function () { collection.add(); }).toThrow();
                });

                it('should fire add event', function () {
                    var collection = new Collection([1, 2]);
                    var add = jasmine.createSpy('add');
                    collection.on('add', add);
                    collection.add(3);
                    expect(add).toHaveBeenCalled();
                    var eventObject = add.mostRecentCall.args[0];
                    expect(eventObject.type).toBe('add');
                    expect(eventObject.item).toBe(3);
                    expect(eventObject.index).toBe(2);
                });

                it('should not fire add event if silent flag is explicitly set', function () {
                    var collection = new Collection([1, 2]);
                    var add = jasmine.createSpy('add');
                    collection.on('add', add);
                    collection.add(3, { silent: true });
                    expect(add).not.toHaveBeenCalled();
                });
            });

            describe('insert method', function () {
                it('should insert an item at given position', function () {
                    var collection = new Collection([1, 2]);
                    collection.insert(1, 3);
                    expect(collection.get(0)).toBe(1);
                    expect(collection.get(1)).toBe(3);
                    expect(collection.get(2)).toBe(2);
                });

                it('should accept undefined value', function () {
                    var collection = new Collection([1, 2]);
                    collection.insert(1, undefined);
                    expect(collection.get(1)).toBeUndefined();
                });

                it('should add an item at tail if index is grater than length', function () {
                    var collection = new Collection([1, 2]);
                    collection.insert(5, 3);
                    expect(collection.length).toBe(3);
                    expect(collection.get(2)).toBe(3);
                });

                it('should calculate index from the end if index is negative', function () {
                    var collection = new Collection([1, 2]);
                    collection.insert(-1, 3);
                    expect(collection.get(1)).toBe(3);
                });

                it('should add an item at head if negative index is out of range', function () {
                    var collection = new Collection([1, 2]);
                    collection.insert(-5, 3);
                    expect(collection.get(0)).toBe(3);
                });

                it('should fire add event', function () {
                    var collection = new Collection([1, 2]);
                    var add = jasmine.createSpy('add');
                    collection.on('add', add);
                    collection.insert(1, 3);
                    expect(add).toHaveBeenCalled();
                    var eventObject = add.mostRecentCall.args[0];
                    expect(eventObject.type).toBe('add');
                    expect(eventObject.item).toBe(3);
                    expect(eventObject.index).toBe(1);
                });

                it('should not fire add event if silent flag is explicitly set', function () {
                    var collection = new Collection([1, 2]);
                    var add = jasmine.createSpy('add');
                    collection.on('add', add);
                    collection.insert(1, 3, { silent: true });
                    expect(add).not.toHaveBeenCalled();
                });

                it('should throw if item is not provided', function () {
                    var collection = new Collection([1, 2]);
                    expect(function () { collection.insert(1); }).toThrow();
                });

                it('should throw if index is not provided', function () {
                    var collection = new Collection([1, 2]);
                    expect(function () { collection.insert({}); }).toThrow();
                });

                it('should throw if no argument is provided', function () {
                    var collection = new Collection([1, 2]);
                    expect(function () { collection.insert(); }).toThrow();
                });

                it('should throw if index cannot convert to a number', function () {
                    var collection = new Collection();
                    expect(function () { collection.insert({}, 3); }).toThrow();
                    expect(function () { collection.insert(Object, 3); }).toThrow();
                    expect(function () { collection.insert(/reg exp/, 3); }).toThrow();
                    expect(function () { collection.insert('string', 3); }).toThrow();
                });

                it('should have addAt method as alias', function () {
                    var collection = new Collection();
                    expect(collection.addAt).toBe(collection.insert);
                });
            });

            describe('unshift method', function () {
                it('should add the item at head', function () {
                    var collection = new Collection([1, 2]);
                    collection.unshift(3);
                    expect(collection.length).toBe(3);
                    expect(collection.get(0)).toBe(3);
                    expect(collection.get(1)).toBe(1);
                    expect(collection.get(2)).toBe(2);
                });

                it('should accept undefined value', function () {
                    var collection = new Collection([1, 2]);
                    collection.unshift(undefined);
                    expect(collection.length).toBe(3);
                    expect(collection.get(0)).toBeUndefined();
                });

                it('should fire add event', function () {
                    var collection = new Collection([1, 2]);
                    var add = jasmine.createSpy('add');
                    collection.on('add', add);
                    collection.unshift(3);
                    expect(add).toHaveBeenCalled();
                    var eventObject = add.mostRecentCall.args[0];
                    expect(eventObject.index).toBe(0);
                    expect(eventObject.item).toBe(3);
                });

                it('should not fire add event if silent flag is explicitly set', function () {
                    var collection = new Collection([1, 2]);
                    var add = jasmine.createSpy('add');
                    collection.on('add', add);
                    collection.unshift(3, { silent: true });
                    expect(add).not.toHaveBeenCalled();
                });

                it('should throw if item is not provided', function () {
                    var collection = new Collection();
                    expect(function () { collection.unshift(); }).toThrow();
                });
            });

            describe('push method', function () {
                it('should add the item at tail', function () {
                    var collection = new Collection([1, 2]);
                    collection.push(3);
                    expect(collection.length).toBe(3);
                    expect(collection.get(0)).toBe(1);
                    expect(collection.get(1)).toBe(2);
                    expect(collection.get(2)).toBe(3);
                });

                it('should accept undefined value', function () {
                    var collection = new Collection([1, 2]);
                    collection.push(undefined);
                    expect(collection.length).toBe(3);
                    expect(collection.get(2)).toBeUndefined();
                });

                it('should fire add event', function () {
                    var collection = new Collection([1, 2]);
                    var add = jasmine.createSpy('add');
                    collection.on('add', add);
                    collection.push(3);
                    expect(add).toHaveBeenCalled();
                    var eventObject = add.mostRecentCall.args[0];
                    expect(eventObject.index).toBe(2);
                    expect(eventObject.item).toBe(3);
                });

                it('should not fire add event if silent flag is explicitly set', function () {
                    var collection = new Collection([1, 2]);
                    var add = jasmine.createSpy('add');
                    collection.on('add', add);
                    collection.push(3, { silent: true });
                    expect(add).not.toHaveBeenCalled();
                });

                it('should throw if item is not provided', function () {
                    var collection = new Collection();
                    expect(function () { collection.unshift(); }).toThrow();
                });
            });

            describe('remove method', function () {
                it('should remove all items which equals to given item', function () {
                    var collection = new Collection([1, 2, 1]);
                    collection.remove(1);
                    expect(collection.length).toBe(1);
                    expect(collection.get(0)).toBe(2);
                });

                it('should take no effect if collection does not contain the given item', function () {
                    var collection = new Collection([1, 2]);
                    collection.remove(3);
                    expect(collection.length).toBe(2);
                });

                it('should remove undefined value', function () {
                    var collection = new Collection([undefined, 1, undefined]);
                    collection.remove(undefined);
                    expect(collection.length).toBe(1);
                    expect(collection.get(0)).toBe(1);
                });

                it('should fire remove event for each removal', function () {
                    var collection = new Collection([1, 2, 1]);
                    var remove = jasmine.createSpy('remove');
                    collection.on('remove', remove);
                    collection.remove(1);
                    expect(remove.callCount).toBe(2);
                    var firstEventObject = remove.calls[0].args[0];
                    expect(firstEventObject.type).toBe('remove');
                    expect(firstEventObject.item).toBe(1);
                    expect(firstEventObject.index).toBe(0);
                    var secondEventObject = remove.calls[1].args[0];
                    expect(secondEventObject.index).toBe(1);
                });

                it('should not fire remove event when no item is removed', function () {
                    var collection = new Collection([1, 2]);
                    var remove = jasmine.createSpy('remove');
                    collection.on('remove', remove);
                    collection.remove(3);
                    expect(remove).not.toHaveBeenCalled();
                });

                it('should not fire remove event if silent flag is explicitly set', function () {
                    var collection = new Collection([1, 2, 1]);
                    var remove = jasmine.createSpy('remove');
                    collection.on('remove', remove);
                    collection.remove(1, { silent: true });
                    expect(remove).not.toHaveBeenCalled();
                });

                it('should throw if item is not provided', function () {
                    var collection = new Collection();
                    expect(function () { collection.remove(); }).toThrow();
                });
            });

            describe('removeAt method', function () {
                it('should remove the item at given position', function () {
                    var collection = new Collection([1, 2]);
                    collection.removeAt(0);
                    expect(collection.length).toBe(1);
                    expect(collection.get(0)).toBe(2);
                });

                it('should remove the last item if index is grater than length', function () {
                    var collection = new Collection([1, 2]);
                    collection.removeAt(5);
                    expect(collection.get(0)).toBe(1);
                });

                it('should calculate index from the end if index is negative', function () {
                    var collection = new Collection([1, 2]);
                    collection.removeAt(-1);
                    expect(collection.get(0)).toBe(1);
                });

                it('should remove the first item if negative index is out of range', function () {
                    var collection = new Collection([1, 2]);
                    collection.removeAt(-5);
                    expect(collection.get(0)).toBe(2);
                });

                it('should fire remove event', function () {
                    var collection = new Collection([1, 2]);
                    var remove = jasmine.createSpy('remove');
                    collection.on('remove', remove);
                    collection.removeAt(1);
                    expect(remove).toHaveBeenCalled();
                    var eventObject = remove.mostRecentCall.args[0];
                    expect(eventObject.index).toBe(1);
                    expect(eventObject.item).toBe(2);
                });

                it('should not fire remove event if silent flag is explicitly set', function () {
                    var collection = new Collection([1, 2, 1]);
                    var remove = jasmine.createSpy('remove');
                    collection.on('remove', remove);
                    collection.removeAt(1, { silent: true });
                    expect(remove).not.toHaveBeenCalled();
                });

                it('should throw if index is not provided', function () {
                    var collection = new Collection();
                    expect(function () { collection.removeAt(); }).toThrow();
                });

                it('should throw if index cannot convert to a number', function () {
                    var collection = new Collection();
                    expect(function () { collection.removeAt({}); }).toThrow();
                    expect(function () { collection.removeAt(Object); }).toThrow();
                    expect(function () { collection.removeAt(/reg exp/); }).toThrow();
                    expect(function () { collection.removeAt('string'); }).toThrow();
                });
            });

            describe('shift method', function () {
                it('should remove the first item', function () {
                    var collection = new Collection([1, 2]);
                    collection.shift();
                    expect(collection.length).toBe(1);
                    expect(collection.get(0)).toBe(2);
                });

                it('should return the removed item', function () {
                    var collection = new Collection([1, 2]);
                    var returnValue = collection.shift();
                    expect(returnValue).toBe(1);
                });

                it('should return undefined if collection is empty ', function () {
                    var collection = new Collection();
                    var returnValue = collection.shift();
                    expect(returnValue).toBeUndefined();
                });

                it('should fire remove event', function () {
                    var collection = new Collection([1, 2]);
                    var remove = jasmine.createSpy('remove');
                    collection.on('remove', remove);
                    collection.shift();
                    expect(remove).toHaveBeenCalled();
                    var eventObject = remove.mostRecentCall.args[0];
                    expect(eventObject.index).toBe(0);
                    expect(eventObject.item).toBe(1);
                });

                it('should not fire remove event if collection is empty', function () {
                    var collection = new Collection();
                    var remove = jasmine.createSpy('remove');
                    collection.on('remove', remove);
                    collection.shift();
                    expect(remove).not.toHaveBeenCalled();
                });

                it('should not fire remove event silent flag is explicitly set', function () {
                    var collection = new Collection([1, 2]);
                    var remove = jasmine.createSpy('remove');
                    collection.on('remove', remove);
                    collection.shift({ silent: true });
                    expect(remove).not.toHaveBeenCalled();
                });
            });

            describe('pop method', function () {
                it('should remove the last item', function () {
                    var collection = new Collection([1, 2]);
                    collection.pop();
                    expect(collection.length).toBe(1);
                    expect(collection.get(0)).toBe(1);
                });

                it('should return the removed item', function () {
                    var collection = new Collection([1, 2]);
                    var returnValue = collection.pop();
                    expect(returnValue).toBe(2);
                });

                it('should return undefined if collection is empty ', function () {
                    var collection = new Collection();
                    var returnValue = collection.pop();
                    expect(returnValue).toBeUndefined();
                });

                it('should fire remove event', function () {
                    var collection = new Collection([1, 2]);
                    var remove = jasmine.createSpy('remove');
                    collection.on('remove', remove);
                    collection.pop();
                    expect(remove).toHaveBeenCalled();
                    var eventObject = remove.mostRecentCall.args[0];
                    expect(eventObject.index).toBe(1);
                    expect(eventObject.item).toBe(2);
                });

                it('should not fire remove event if collection is empty', function () {
                    var collection = new Collection();
                    var remove = jasmine.createSpy('remove');
                    collection.on('remove', remove);
                    collection.pop();
                    expect(remove).not.toHaveBeenCalled();
                });

                it('should not fire remove event silent flag is explicitly set', function () {
                    var collection = new Collection([1, 2]);
                    var remove = jasmine.createSpy('remove');
                    collection.on('remove', remove);
                    collection.pop({ silent: true });
                    expect(remove).not.toHaveBeenCalled();
                });
            });

            describe('indexOf method', function () {
                it('should return the index of given item', function () {
                    var collection = new Collection([1, 2, 3, 4]);
                    expect(collection.indexOf(3)).toBe(2);
                });

                it('should return -1 if the collection does not contain the given item', function () {
                    var collection = new Collection([1, 2]);
                    expect(collection.indexOf(3)).toBe(-1);
                });

                it('should accpet a starting index for search', function () {
                    var collection = new Collection([1, 2, 3, 4, 1, 2]);
                    expect(collection.indexOf(1, 2)).toBe(4);
                });

                it('should calculate index from the end if index is negative', function () {
                    var collection = new Collection([1, 2, 3, 4, 1, 2]);
                    expect(collection.indexOf(1, -4)).toBe(4);
                });

                it('should search the entire collection if a negative index is out of range', function () {
                    var collection = new Collection([1, 2, 3, 4, 1, 2]);
                    expect(collection.indexOf(2, -10)).toBe(1);
                });

                it('should return -1 if item is not located after the starting index', function () {
                    var collection = new Collection([1, 2, 3, 4, 1, 2]);
                    expect(collection.indexOf(5, 2)).toBe(-1);
                });

                it('should return -1 if starting index is out of range', function () {
                    var collection = new Collection([1, 2]);
                    expect(collection.indexOf(5, 1)).toBe(-1);
                });

                it('should throw if item is not provided', function () {
                    var collection = new Collection([1, 2]);
                    expect(function () { collection.indexOf(); }).toThrow();
                });
            });

            describe('dump method', function () {
                it('should return an array containing items in the collection with the same order', function () {
                    var array = [1, 2];
                    var collection = new Collection(array);
                    var dumpArray = collection.dump();
                    expect(dumpArray).toEqual(array);
                });

                it('should not effect the collection if dump array is modified', function () {
                    var collection = new Collection([1, 2]);
                    var dumpArray = collection.dump();
                    dumpArray.push(3);
                    expect(collection.length).toBe(2);
                });

                it('should be return a shallow copy of the internal array of items', function () {
                    var array = [{}, {}];
                    var collection = new Collection(array);
                    var dumpArray = collection.dump();
                    array[0].x = 1;
                    expect(dumpArray[0].x).toBe(1);
                });
            });

            describe('clone method', function () {
                it('should return a collection with all properties', function () {
                    var collection = new Collection([1, 2]);
                    var newCollection = collection.clone();
                    expect(newCollection.dump()).toEqual(collection.dump());
                });

                it('should not effect the original collection if cloned collection is modified', function () {
                    var collection = new Collection([1, 2]);
                    var newCollection = collection.clone();
                    newCollection.add(3);
                    expect(collection.length).toBe(2);
                });
            });

            describe('dispose method', function () {
                it('should throw error on get or set after dispose', function () {
                    var collection = new Collection([1, 2]);
                    collection.dispose();
                    expect(function () { collection.get(0); }).toThrow();
                    expect(function () { collection.add(3); }).toThrow();
                    expect(function () { collection.push(3); }).toThrow();
                    expect(function () { collection.unshift(3); }).toThrow();
                    expect(function () { collection.insert(1, 3); }).toThrow();
                    expect(function () { collection.remove(1); }).toThrow();
                    expect(function () { collection.removeAt(1); }).toThrow();
                    expect(function () { collection.pop(); }).toThrow();
                    expect(function () { collection.unshift(); }).toThrow();
                    expect(function () { collection.clone(); }).toThrow();
                    expect(function () { collection.indexOf(1); }).toThrow();
                });

                it('should have no side effect when dispose multiple times', function () {
                    var collection = new Collection();
                    collection.dispose();
                    expect(function () { collection.dispose(); }).not.toThrow();
                });

                it('should always dump an empty array after dispose', function () {
                    var collection = new Collection();
                    collection.dispose();
                    expect(collection.dump()).toEqual([]);
                });

                it('should set length to undefined after dispose', function () {
                    var collection = new Collection();
                    collection.dispose();
                    expect(collection.length).toBeUndefined();
                });
            });
        });
    }
);
