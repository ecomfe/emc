define(
    function (require) {
        var Model = require('Model');

        describe('Model', function () {
            it('should be a constructor', function () {
                expect(typeof Model).toBe('function');
            });

            describe('constructor', function () {
                it('should work without any argument', function () {
                    var model = new Model();
                    expect(model).toBeDefined();
                });

                it('should fill itself if a context is given', function () {
                    var context = { x: 1, y: 2 };
                    var model = new Model(context);
                    expect(model.get('x')).toBe(1);
                    expect(model.get('y')).toBe(2);
                });

                it('should not effect the model if context object is modified', function () {
                    var context = { x: 1, y: 2 };
                    var model = new Model(context);
                    context.x = 2;
                    expect(model.get('x')).toBe(1);
                });
            });

            describe('get method', function () {
                it('should return the property value', function () {
                    var model = new Model({ x: 1 });
                    expect(model.get('x')).toBe(1);
                });

                it('should return undefined if property does not exist', function () {
                    var model = new Model();
                    expect(model.get('x')).toBeUndefined();
                });

                it('should not read properties on Object.prototype', function () {
                    Object.prototype.x = 1;
                    var model = new Model();
                    expect(model.get('x')).toBeUndefined();
                    delete Object.prototype.x;
                });

                it('should throw if name is not provided', function () {
                    var model = new Model();
                    expect(function () { model.get(); }).toThrow();
                    expect(function () { model.get(undefined); }).toThrow();
                    expect(function () { model.get(null); }).toThrow();
                });
            });

            describe('set method', function () {
                it('should change the value of a property', function () {
                    var model = new Model();
                    model.set('x', 1);
                    expect(model.get('x')).toBe(1);
                });

                it('should accept undefined value', function () {
                    var model = new Model();
                    model.set('x', undefined);
                    expect(model.get('x')).toBeUndefined();
                });

                it('should throw if name is not provided', function () {
                    var model = new Model();
                    expect(function () { model.set(undefined, 1); }).toThrow();
                    expect(function () { model.set(null, 1); }).toThrow();
                });

                it('should throw if value is not provided', function () {
                    var model = new Model();
                    expect(function () { model.set('x'); }).toThrow();
                });

                it('should fire change event when change a property', function () {
                    var model = new Model();
                    model.set('x', 1);
                    var change = jasmine.createSpy('change');
                    model.on('change', change);
                    model.set('x', 2);
                    expect(change).toHaveBeenCalled();
                    var eventObject = change.mostRecentCall.args[0];
                    expect(eventObject.type).toBe('change');
                    expect(eventObject.changeType).toBe('change');
                    expect(eventObject.oldValue).toBe(1);
                    expect(eventObject.newValue).toBe(2);
                });

                it('should fire property specific change event when change a property', function () {
                    var model = new Model();
                    model.set('x', 1);
                    var change = jasmine.createSpy('change');
                    model.on('change:x', change);
                    model.set('x', 2);
                    expect(change).toHaveBeenCalled();
                    var eventObject = change.mostRecentCall.args[0];
                    expect(eventObject.type).toBe('change:x');
                    expect(eventObject.changeType).toBe('change');
                    expect(eventObject.oldValue).toBe(1);
                    expect(eventObject.newValue).toBe(2);
                });

                it('should fire change event when add a property', function () {
                    var model = new Model();
                    var change = jasmine.createSpy('change');
                    model.on('change', change);
                    model.set('x', 1);
                    expect(change).toHaveBeenCalled();
                    var eventObject = change.mostRecentCall.args[0];
                    expect(eventObject.type).toBe('change');
                    expect(eventObject.changeType).toBe('add');
                    expect(eventObject.oldValue).toBe(undefined);
                    expect(eventObject.newValue).toBe(1);
                });

                it('should not fire change event when value is not changed', function () {
                    var model = new Model();
                    var change = jasmine.createSpy('change');
                    model.set('x', 1);
                    model.on('change', change);
                    model.set('x', 1);
                    expect(change).not.toHaveBeenCalled();
                });

                it('should not fire change event if silent flag is explicitly set', function () {
                    var model = new Model();
                    var change = jasmine.createSpy('change');
                    model.set('x', 1);
                    model.on('change', change);
                    model.set('x', 2, { silent: true });
                    expect(change).not.toHaveBeenCalled();
                });
            });

            describe('fill method', function () {
                it('should mix given extension to current model', function () {
                    var model = new Model();
                    var extension = { x: 1, y: 2 };
                    model.fill(extension);
                    expect(model.get('x')).toBe(1);
                    expect(model.get('y')).toBe(2);
                });

                it('should throw if extension is not provided', function () {
                    var model = new Model();
                    expect(function () { model.fill(); }).toThrow();
                    expect(function () { model.fill(undefined); }).toThrow();
                    expect(function () { model.fill(null); }).toThrow();
                });

                it('should not include properties on prototype chain', function () {
                    Object.prototype.x = 1;
                    var model = new Model();
                    model.fill({});
                    expect(model.get('x')).toBeUndefined();
                    delete Object.prototype.x;
                });

                it('should fire change event for every property change', function () {
                    var model = new Model();
                    model.set('x', 0);
                    model.set('y', 2);
                    var change = jasmine.createSpy('change');
                    model.on('change', change);
                    var extension = { x: 1, y: 2, z: 3 };
                    model.fill(extension);
                    expect(change.callCount).toBe(2);

                    var xChangeEventObject = change.calls[0].args[0];
                    expect(xChangeEventObject.changeType).toBe('change');
                    expect(xChangeEventObject.oldValue).toBe(0);
                    expect(xChangeEventObject.newValue).toBe(1);

                    var zChangeEventObject = change.calls[1].args[0];
                    expect(zChangeEventObject.changeType).toBe('add');
                    expect(zChangeEventObject.oldValue).toBe(undefined);
                    expect(zChangeEventObject.newValue).toBe(3);
                });
            });

            describe('remove method', function () {
                it('should remove a property', function () {
                    var model = new Model();
                    model.set('x', 1);
                    model.remove('x');
                    expect(model.get('x')).toBeUndefined();
                });

                it('should throw if name is not provided', function () {
                    var model = new Model();
                    expect(function () { model.remove(); }).toThrow();
                    expect(function () { model.remove(undefined); }).toThrow();
                    expect(function () { model.remove(null); }).toThrow();
                });

                it('should fire change event if property previously has a value', function () {
                    var model = new Model();
                    model.set('x', 1);
                    var change = jasmine.createSpy('change');
                    model.on('change', change);
                    model.remove('x');
                    expect(change).toHaveBeenCalled();
                    var eventObject = change.mostRecentCall.args[0];
                    expect(eventObject.changeType).toBe('remove');
                    expect(eventObject.oldValue).toBe(1);
                    expect(eventObject.newValue).toBe(undefined);
                });

                it('should fire property specific change event if property previously has a value', function () {
                    var model = new Model();
                    model.set('x', 1);
                    var change = jasmine.createSpy('change');
                    model.on('change:x', change);
                    model.remove('x');
                    expect(change).toHaveBeenCalled();
                    var eventObject = change.mostRecentCall.args[0];
                    expect(eventObject.changeType).toBe('remove');
                    expect(eventObject.oldValue).toBe(1);
                    expect(eventObject.newValue).toBe(undefined);
                });

                it('should fire change event if property previously exists (even undefined)', function () {
                    var model = new Model();
                    model.set('x', undefined);
                    var change = jasmine.createSpy('change');
                    model.on('change', change);
                    model.remove('x');
                    expect(change).toHaveBeenCalled();
                    var eventObject = change.mostRecentCall.args[0];
                    expect(eventObject.changeType).toBe('remove');
                    expect(eventObject.oldValue).toBe(undefined);
                    expect(eventObject.newValue).toBe(undefined);
                });

                it('should not fire change event is property did not previously exist', function () {
                    var model = new Model();
                    var change = jasmine.createSpy('change');
                    model.on('change', change);
                    model.remove('x');
                    expect(change).not.toHaveBeenCalled();
                });

                it('should not fire change event if silent flag is explicitly set', function () {
                    var model = new Model();
                    model.set('x', 1);
                    var change = jasmine.createSpy('change');
                    model.on('change', change);
                    model.remove('x', { silent: true });
                    expect(change).not.toHaveBeenCalled();
                });
            });

            describe('dump method', function () {
                it('should return a plain object with all properties', function () {
                    var context = { x: 1, y: 2 };
                    var model = new Model(context);
                    var dumpValue = model.dump();
                    expect(dumpValue).toEqual(context);
                });

                it('should not effect the model if the dump object is modified', function () {
                    var context = { x: 1, y: 2 };
                    var model = new Model(context);
                    var dumpValue = model.dump();
                    dumpValue.x = 2;
                    expect(model.get('x')).toBe(1);
                });

                it('should not dump properties on prototype chain', function () {
                    Object.prototype.x = 1;
                    var model = new Model();
                    var dumpValue = model.dump();
                    delete Object.prototype.x;
                    expect(model.x).toBeUndefined();
                });
            });

            describe('clone method', function () {
                it('should return a model with all properties', function () {
                    var context = { x: 1, y: 2 };
                    var model = new Model(context);
                    var newModel = model.clone();
                    expect(newModel.dump()).toEqual(model.dump());
                });

                it('should not effect the original model if cloned model is modified', function () {
                    var context = { x: 1, y: 2 };
                    var model = new Model(context);
                    var newModel = model.clone();
                    newModel.set('x', 2);
                    expect(model.get('x')).toBe(1);
                });
            });

            describe('getAsModel method', function () {
                it('should return a model constructed by the property value if property is an object', function () {
                    var model = new Model();
                    var object = { x: 1, y: 2 };
                    model.set('x', object);
                    var newModel = model.getAsModel('x');
                    expect(newModel.dump()).toEqual(object);
                });

                it('should return an empty model if property value is not an object', function () {
                    var model = new Model();
                    model.set('x', 1);
                    var xModel = model.getAsModel('x');
                    expect(xModel.dump()).toEqual({});
                    model.set('y', [ 1, 2 ]);
                    var yModel = model.getAsModel('y');
                    expect(yModel.dump()).toEqual({});
                });

                it('should throw if name is not provided', function () {
                    var model = new Model();
                    expect(function () { model.getAsModel(); }).toThrow();
                    expect(function () { model.getAsModel(undefined); }).toThrow();
                    expect(function () { model.getAsModel(null); }).toThrow();
                });
            });

            describe('has* method', function () {
                it('should determine whether a property exists by has method', function () {
                    var model = new Model();
                    model.set('x', 1);
                    model.set('y', undefined);
                    expect(model.has('x')).toBe(true);
                    expect(model.has('y')).toBe(true);
                    expect(model.has('z')).toBe(false);
                });

                it('should throw if name is not provided', function () {
                    var model = new Model();
                    expect(function () { model.has(); }).toThrow();
                    expect(function () { model.has(undefined); }).toThrow();
                    expect(function () { model.has(null); }).toThrow();
                    expect(function () { model.hasValue(); }).toThrow();
                    expect(function () { model.hasValue(undefined); }).toThrow();
                    expect(function () { model.hasValue(null); }).toThrow();
                    expect(function () { model.hasReadableValue(); }).toThrow();
                    expect(function () { model.hasReadableValue(undefined); }).toThrow();
                    expect(function () { model.hasReadableValue(null); }).toThrow();
                });

                it('should determine whether a property has a non-null value by hasValue method', function () {
                    var model = new Model();
                    model.set('x', 1);
                    model.set('y', undefined);
                    expect(model.hasValue('x')).toBe(true);
                    expect(model.hasValue('y')).toBe(false);
                    expect(model.hasValue('z')).toBe(false);
                });

                it('should determine whether a property has a readable value by hasValue method', function () {
                    var model = new Model();
                    model.set('x', 1);
                    model.set('y', undefined);
                    model.set('z', '');
                    expect(model.hasReadableValue('x')).toBe(true);
                    expect(model.hasReadableValue('y')).toBe(false);
                    expect(model.hasReadableValue('z')).toBe(false);
                });
            });

            describe('dispose method', function () {
                it('should throw error on get or set after dispose', function () {
                    var model = new Model();
                    model.dispose();
                    expect(function () { model.get('x'); }).toThrow();
                    expect(function () { model.set('x', 1); }).toThrow();
                    expect(function () { model.fill({}); }).toThrow();
                    expect(function () { model.remove('x'); }).toThrow();
                    expect(function () { model.getAsModel('x'); }).toThrow();
                    expect(function () { model.clone(); }).toThrow();
                });

                it('should have no side effect when dispose multiple times', function () {
                    var model = new Model();
                    model.dispose();
                    expect(function () { model.dispose(); }).not.toThrow();
                });

                it('should always dump an empty object after dispose', function () {
                    var model = new Model();
                    model.dispose();
                    expect(model.dump()).toEqual({});
                });

                it('should always return false for has* method after dispose', function () {
                    var model = new Model();
                    model.set('x', 1);
                    model.dispose();
                    expect(model.has('x')).toBe(false)
                    expect(model.hasValue('x')).toBe(false)
                    expect(model.hasReadableValue('x')).toBe(false)
                });
            });
        });
    }
);
