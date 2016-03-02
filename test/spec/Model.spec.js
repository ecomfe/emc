import Model from 'Model';

describe('Model', () => {
    it('should be a constructor', () => {
        expect(typeof Model).toBe('function');
    });

    describe('constructor', () => {
        it('should work without any argument', () => {
            let model = new Model();
            expect(model).toBeDefined();
        });

        it('should fill itself if a context is given', () => {
            let context = { x: 1, y: 2 };
            let model = new Model(context);
            expect(model.get('x')).toBe(1);
            expect(model.get('y')).toBe(2);
        });

        it('should not effect the model if context object is modified', () => {
            let context = { x: 1, y: 2 };
            let model = new Model(context);
            context.x = 2;
            expect(model.get('x')).toBe(1);
        });
    });

    describe('get method', () => {
        it('should return the property value', () => {
            let model = new Model({ x: 1 });
            expect(model.get('x')).toBe(1);
        });

        it('should return undefined if property does not exist', () => {
            let model = new Model();
            expect(model.get('x')).toBeUndefined();
        });

        it('should not read properties on Object.prototype', () => {
            Object.prototype.x = 1;
            let model = new Model();
            expect(model.get('x')).toBeUndefined();
            delete Object.prototype.x;
        });

        it('should throw if name is not provided', () => {
            let model = new Model();
            expect(() => { model.get(); }).toThrow();
            expect(() => { model.get(undefined); }).toThrow();
            expect(() => { model.get(null); }).toThrow();
        });
    });

    describe('set method', () => {
        it('should change the value of a property', () => {
            let model = new Model();
            model.set('x', 1);
            expect(model.get('x')).toBe(1);
        });

        it('should accept undefined value', () => {
            let model = new Model();
            model.set('x', undefined);
            expect(model.get('x')).toBeUndefined();
        });

        it('should throw if name is not provided', () => {
            let model = new Model();
            expect(() => { model.set(undefined, 1); }).toThrow();
            expect(() => { model.set(null, 1); }).toThrow();
        });

        it('should fire beforechange event when change a property', () => {
            let model = new Model();
            model.set('x', 1);
            let beforeChange = jasmine.createSpy('beforechange');
            model.on('beforechange', beforeChange);
            model.set('x', 2);
            expect(beforeChange).toHaveBeenCalled();
            let eventObject = beforeChange.calls.mostRecent().args[0];
            expect(eventObject.type).toBe('beforechange');
            expect(eventObject.changeType).toBe('change');
            expect(eventObject.oldValue).toBe(1);
            expect(eventObject.newValue).toBe(2);
            expect(eventObject.actualValue).toBe(2);
        });

        it('should fire beforechange event when add a property', () => {
            let model = new Model();
            let beforeChange = jasmine.createSpy('beforechange');
            model.on('beforechange', beforeChange);
            model.set('x', 1);
            expect(beforeChange).toHaveBeenCalled();
            let eventObject = beforeChange.calls.mostRecent().args[0];
            expect(eventObject.type).toBe('beforechange');
            expect(eventObject.changeType).toBe('add');
            expect(eventObject.oldValue).toBe(undefined);
            expect(eventObject.newValue).toBe(1);
            expect(eventObject.actualValue).toBe(1);
        });

        it('should not fire beforechange event when value is not changed', () => {
            let model = new Model();
            let beforeChange = jasmine.createSpy('beforechange');
            model.set('x', 1);
            model.on('beforechange', beforeChange);
            model.set('x', 1);
            expect(beforeChange).not.toHaveBeenCalled();
        });

        it('should not fire beforechange event if silent flag is explicitly set', () => {
            let model = new Model();
            let beforeChange = jasmine.createSpy('beforechange');
            model.set('x', 1);
            model.on('beforechange', beforeChange);
            model.set('x', 2, { silent: true });
            expect(beforeChange).not.toHaveBeenCalled();
            expect(model.get('x')).toBe(2);
        });

        it('should not change value if beforechange event is default prevented', () => {
            let model = new Model();
            let beforeChange = function (e) {
                e.preventDefault();
            };
            model.on('beforechange', beforeChange);
            let change = jasmine.createSpy('change');
            model.on('change', change);
            model.set('x', 1);
            expect(model.has('x')).toBe(false);
            expect(change).not.toHaveBeenCalled();
        });

        it('should use actualValue of event object instead of value given by set method call', () => {
            let model = new Model();
            let beforeChange = function (e) {
                e.actualValue = 2;
            };
            model.on('beforechange', beforeChange);
            model.set('x', 1);
            expect(model.get('x')).toBe(2);
        });

        it('should not fire change event if actualValue is set to the same previous value', () => {
            let model = new Model();
            model.set('x', 1);
            model.on('beforechange', (e) => e.actualValue = 1);
            let change = jasmine.createSpy('change');
            model.on('change', change);
            model.set('x', 2);
            expect(change).not.toHaveBeenCalled();
        });
    });

    describe('remove method', () => {
        it('should remove a property', () => {
            let model = new Model();
            model.set('x', 1);
            model.remove('x');
            expect(model.get('x')).toBeUndefined();
        });

        it('should throw if name is not provided', () => {
            let model = new Model();
            expect(() => model.remove()).toThrow();
            expect(() => model.remove(undefined)).toThrow();
            expect(() => model.remove(null)).toThrow();
        });

        it('should fire beforechange event if property previously has a value', () => {
            let model = new Model();
            model.set('x', 1);
            let change = jasmine.createSpy('beforechange');
            model.on('beforechange', change);
            model.remove('x');
            expect(change).toHaveBeenCalled();
            let eventObject = change.calls.mostRecent().args[0];
            expect(eventObject.changeType).toBe('remove');
            expect(eventObject.oldValue).toBe(1);
            expect(eventObject.newValue).toBe(undefined);
        });

        it('should fire beforechange event if property previously exists (even undefined)', () => {
            let model = new Model();
            model.set('x', undefined);
            let beforeChange = jasmine.createSpy('beforechange');
            model.on('beforechange', beforeChange);
            model.remove('x');
            expect(beforeChange).toHaveBeenCalled();
            let eventObject = beforeChange.calls.mostRecent().args[0];
            expect(eventObject.changeType).toBe('remove');
            expect(eventObject.oldValue).toBe(undefined);
            expect(eventObject.newValue).toBe(undefined);
        });

        it('should not fire beforechange event is property did not previously exist', () => {
            let model = new Model();
            let beforeChange = jasmine.createSpy('beforechange');
            model.on('beforechange', beforeChange);
            model.remove('x');
            expect(beforeChange).not.toHaveBeenCalled();
        });

        it('should not fire beforechange event if silent flag is explicitly set', () => {
            let model = new Model();
            model.set('x', 1);
            let beforeChange = jasmine.createSpy('beforechange');
            model.on('beforechange', beforeChange);
            model.remove('x', { silent: true });
            expect(beforeChange).not.toHaveBeenCalled();
        });

        it('should not remove value if beforechange event is default prevented', () => {
            let model = new Model();
            let beforeChange = function (e) {
                e.preventDefault();
            };
            model.set('x', 1);
            model.on('beforechange', beforeChange);
            model.remove('x');
            expect(model.get('x')).toBe(1);
        });

        it('should fire update event for existing property', (done) => {
            let model = new Model({x: 1});
            let update = (e) => {
                expect(e.diff).toEqual({
                    x: {
                        changeType: 'remove',
                        oldValue: 1,
                        newValue: undefined
                    }
                });
                done();
            };
            model.on('update', update);
            model.remove('x');
        });
    });

    describe('update method', () => {
        it('should update a property', () => {
            let model = new Model({x: 1, y: [1, 2, 3], z: [2, 3, 4]});
            model.update({x: {$set: 2}, y: {$push: 4}, z: {$unshift: 1}});
            expect(model.get('x')).toBe(2);
            expect(model.get('y')).toEqual([1, 2, 3, 4]);
            expect(model.get('z')).toEqual([1, 2, 3, 4]);
        });

        it('should update a nested property', () => {
            let model = new Model({x: {y: 1}});
            model.update({x: {y: {$set: 2}}});
            expect(model.get('x').y).toBe(2);
        });

        it('should fire beforechange events for each property modified', () => {
            let model = new Model({x: 1, y: [1, 2, 3], z: {a: 1, b: 2}});
            let beforeChange = jasmine.createSpy('beforeChange');
            model.on('beforechange', beforeChange);
            model.update({
                // `x` is not modifed.
                x: {$set: 1},
                // `y` is modified to a new array.
                y: {$push: 4},
                // `z` becomes a new object although its properties are not changed.
                z: {$merge: {a: 1}}
            });
            expect(beforeChange.calls.count()).toBe(2);
        });

        it('should cancel value assignment if beforechange event is default prevented', () => {
            let z = {a: 1, b: 2};
            let model = new Model({x: 1, y: [1, 2, 3], z: z});
            let beforeChange = jasmine.createSpy('beforeChange');
            model.on('beforechange', (e) => {
                e.name === 'z' && e.preventDefault();
            });
            model.update({
                z: {$merge: {a: 2}}
            });
            // `z` is not changed since `beforechange` is default prevented.
            expect(model.get('z')).toBe(z);
        });
    });

    describe('dump method', () => {
        it('should return a plain object with all properties', () => {
            let context = { x: 1, y: 2 };
            let model = new Model(context);
            let dumpValue = model.dump();
            expect(dumpValue).toEqual(context);
        });

        it('should not effect the model if the dump object is modified', () => {
            let context = { x: 1, y: 2 };
            let model = new Model(context);
            let dumpValue = model.dump();
            dumpValue.x = 2;
            expect(model.get('x')).toBe(1);
        });

        it('should not dump properties on prototype chain', () => {
            Object.prototype.x = 1;
            let model = new Model();
            let dumpValue = model.dump();
            delete Object.prototype.x;
            expect(model.x).toBeUndefined();
        });
    });

    describe('has* method', () => {
        it('should determine whether a property exists by has method', () => {
            let model = new Model();
            model.set('x', 1);
            model.set('y', undefined);
            expect(model.has('x')).toBe(true);
            expect(model.has('y')).toBe(true);
            expect(model.has('z')).toBe(false);
        });

        it('should throw if name is not provided', () => {
            let model = new Model();
            expect(() => model.has()).toThrow();
            expect(() => model.has(undefined)).toThrow();
            expect(() => model.has(null)).toThrow();
            expect(() => model.hasValue()).toThrow();
            expect(() => model.hasValue(undefined)).toThrow();
            expect(() => model.hasValue(null)).toThrow();
            expect(() => model.hasReadableValue()).toThrow();
            expect(() => model.hasReadableValue(undefined)).toThrow();
            expect(() => model.hasReadableValue(null)).toThrow();
        });

        it('should determine whether a property has a non-null value by hasValue method', () => {
            let model = new Model();
            model.set('x', 1);
            model.set('y', undefined);
            expect(model.hasValue('x')).toBe(true);
            expect(model.hasValue('y')).toBe(false);
            expect(model.hasValue('z')).toBe(false);
        });

        it('should determine whether a property has a readable value by hasValue method', () => {
            let model = new Model();
            model.set('x', 1);
            model.set('y', undefined);
            model.set('z', '');
            expect(model.hasReadableValue('x')).toBe(true);
            expect(model.hasReadableValue('y')).toBe(false);
            expect(model.hasReadableValue('z')).toBe(false);
        });
    });

    describe('dispose method', () => {
        it('should throw error on get or set after dispose', () => {
            let model = new Model();
            model.dispose();
            expect(() => model.get('x')).toThrow();
            expect(() => model.set('x', 1)).toThrow();
            expect(() => model.fill({})).toThrow();
            expect(() => model.remove('x')).toThrow();
            expect(() => model.getAsModel('x')).toThrow();
            expect(() => model.clone()).toThrow();
        });

        it('should have no side effect when dispose multiple times', () => {
            let model = new Model();
            model.dispose();
            expect(() => model.dispose()).not.toThrow();
        });

        it('should always dump an empty object after dispose', () => {
            let model = new Model();
            model.dispose();
            expect(model.dump()).toEqual({});
        });

        it('should always return false for has* method after dispose', () => {
            let model = new Model();
            model.set('x', 1);
            model.dispose();
            expect(model.has('x')).toBe(false)
            expect(model.hasValue('x')).toBe(false)
            expect(model.hasReadableValue('x')).toBe(false)
        });
    });

    describe('update event', () => {
        it('should fire when a property is changed', (done) => {
            let model = new Model();
            model.set('x', 1);
            model.set('y', 2);
            model.on('update', (e) => {
                expect(e.diff).toEqual({
                    x: {
                        changeType: 'add',
                        oldValue: undefined,
                        newValue: 2
                    },
                    y: {
                        changeType: 'add',
                        oldValue: undefined,
                        newValue: 2
                    }
                });
                done();
            });
            model.set('x', 2);
        });

        it('should not fire when there is actually no change', (done) => {
            let model = new Model({x: 1});
            let update = jasmine.createSpy('update');
            model.on('update', update);
            model.set('x', 2);
            model.set('x', 1);
            setTimeout(() => {
                expect(update).not.toHaveBeenCalled();
                done();
            }, 10);
        });

        it('should not fire if a nested property has updates but no changes', (done) => {
            let o = {z: 1};
            let model = new Model({x: {y: o}});
            let update = jasmine.createSpy('update');
            model.on('update', update);
            model.update({x: {y: {$merge: {a: 1, b: 2}}}});
            model.update({x: {y: {$set: o}}});
            setTimeout(() => {
                expect(update).not.toHaveBeenCalled();
                done();
            }, 10);
        });

        it('should merge diffs from multiple $set command', (done) => {
            let model = new Model({x: {a: 1, b: 2}});
            model.on('update', (e) => {
                expect(e.diff).toEqual({
                    x: {
                        a: {
                            changeType: 'change',
                            oldValue: 1,
                            newValue: 3
                        }
                    }
                });
                done();
            });
            model.update({x: {a: {$set: 2}, b: {$set: 3}}});
            model.update({x: {a: {$set: 3}, b: {$set: 2}}});
        });

        it('should merge diff for an update of property after its child prpoerty updates', (done) => {
            let model = new Model({x: {y: {a: 1, b: 2}}});
            model.on('update', (e) => {
                expect(e.diff).toEqual({
                    x: {
                        changeType: 'change',
                        oldValue: {
                            y: {
                                a: 1,
                                b: 2
                            }
                        },
                        newValue: 1
                    }
                });
                done();
            });
            model.update({x: {y: {$merge: {c: 3}}}});
            model.update({x: {$set: 1}});
        });

        it('should merge diff for an update of property after its parent prpoerty updates', (done) => {
            let model = new Model({x: {y: {a: 1, b: 2}}});
            model.on('update', (e) => {
                expect(e.diff).toEqual({
                    x: {
                        changeType: 'change',
                        oldValue: {
                            y: {
                                a: 1,
                                b: 2
                            }
                        },
                        newValue: {
                            y: [1]
                        }
                    }
                });
                done();
            });
            model.update({x: {$set: {y: []}}});
            model.update({x: {y: {$push: 1}}});
        });
    });

    class Rectangle extends Model {
        constructor(initialData) {
            super(initialData);

            this.defineComputedProperty(
                'size',
                ['width', 'height'],
                {
                    get() {
                        if (!this.has('width') || !this.has('height')) {
                            return undefined;
                        }

                        return this.get('width') + '*' + this.get('height');
                    },
                    set(value, options) {
                        let [width, height] = value ? value.split('*').map(Number) : [undefined, undefined];
                        this.set('width', width, options);
                        this.set('height', height, options);
                    },
                    evaluate: true
                }

            );

            this.defineComputedProperty(
                'perimeter',
                ['width', 'height'],
                function () {
                    return this.get('width') * 2 + this.get('height') * 2;
                }
            );

            this.defineComputedProperty(
                'shorterEdge',
                ['width', 'height'],
                {
                    get() {
                        return Math.min(this.get('width'), this.get('height'));
                    },
                    evaluate: true
                }
            );
        }
    }

    describe('computed properties', () => {
        it('should accept custom get function', () => {
            let rectangle = new Rectangle({width: 2, height: 3});
            expect(rectangle.get('size')).toBe('2*3');
        });

        it('should change with dependencies', () => {
            let rectangle = new Rectangle({width: 2, height: 3});
            rectangle.set('width', 3);
            expect(rectangle.get('size')).toBe('3*3');
        });

        it('should change with dependency updates', () => {
            let rectangle = new Rectangle({width: 2, height: 3});
            rectangle.update({width: {$set: 3}, height: {$set: 4}});
            expect(rectangle.get('size')).toBe('3*4');
        });

        it('should accept custom set function', () => {
            let rectangle = new Rectangle({width: 2, height: 3});
            rectangle.set('size', '4*5');
            expect(rectangle.get('width')).toBe(4);
            expect(rectangle.get('height')).toBe(5);
        });

        it('should fire change event when dependency changes', () => {
            let rectangle = new Rectangle({width: 2, height: 3});
            let change = jasmine.createSpy('change');
            rectangle.on('change', change);
            rectangle.set('width', 3);
            expect(change.calls.count()).toBe(4); // width + perimeter + size + shorterEdge
            let changeEvent = change.calls.all().filter(e => e.args[0].name === 'size')[0];
            expect(changeEvent).not.toBeUndefined();
            expect(changeEvent.args[0].oldValue).toBe('2*3');
            expect(changeEvent.args[0].newValue).toBe('3*3');
        });

        it('should fire change event when dependency updates', () => {
            let rectangle = new Rectangle({width: 2, height: 3});
            let change = jasmine.createSpy('change');
            rectangle.on('change', change);
            rectangle.update({width: {$set: 3}, height: {$set: 4}});
            expect(change.calls.count()).toBe(5); // width + height + perimeter + size + shorterEdge
            let changeEvent = change.calls.all().filter(e => e.args[0].name === 'size')[0];
            expect(changeEvent).not.toBeUndefined();
            expect(changeEvent.args[0].oldValue).toBe('2*3');
            expect(changeEvent.args[0].newValue).toBe('3*4');
        });

        it('should fire change event for dependencies when set', () => {
            let rectangle = new Rectangle({width: 2, height: 3});
            let change = jasmine.createSpy('change');
            rectangle.on('change', change);
            rectangle.set('size', '3*4');

            expect(change.calls.count()).toBe(5); // width + height + perimeter + size + shorterEdge

            let widthChangeEvent = change.calls.all().filter(e => e.args[0].name === 'width')[0];
            expect(widthChangeEvent).not.toBeUndefined();
            expect(widthChangeEvent.args[0].oldValue).toBe(2);
            expect(widthChangeEvent.args[0].newValue).toBe(3);

            let heightChangeEvent = change.calls.all().filter(e => e.args[0].name === 'height')[0];
            expect(heightChangeEvent).not.toBeUndefined();
            expect(heightChangeEvent.args[0].oldValue).toBe(3);
            expect(heightChangeEvent.args[0].newValue).toBe(4);

            let perimeterChangeEvent = change.calls.all().filter(e => e.args[0].name === 'perimeter')[0];
            expect(perimeterChangeEvent).not.toBeUndefined();
            expect(perimeterChangeEvent.args[0].oldValue).toBe(undefined); // lazy
            expect(perimeterChangeEvent.args[0].newValue).toBe(14);
        });

        it('should compare values and filter only real changes', () => {
            let rectangle = new Rectangle({width: 2, height: 3});
            let change = jasmine.createSpy('change');
            rectangle.on('change', change);
            rectangle.set('size', '3*2');

            expect(change.calls.count()).toBe(4); // Only width + height + size + shorterEdge

            let shorterEdgeChangeEvent = change.calls.all().filter(e => e.args[0].name === 'shorterEdge')[0];
            expect(shorterEdgeChangeEvent).toBeUndefined();
        });

        it('should not fire beforechange event when set', () => {
            let rectangle = new Rectangle({width: 2, height: 3});
            let beforeChange = jasmine.createSpy('beforeChange');
            rectangle.on('beforechange', beforeChange);
            rectangle.set('size', '3*4');

            let sizeBeforeChangeEvent = beforeChange.calls.all().filter(e => e.args[0].name === 'size')[0];
            expect(sizeBeforeChangeEvent).toBeUndefined();
        });

        it('should fire update event', (done) => {
            let rectangle = new Rectangle({width: 2, height: 3});
            rectangle.on('update', (e) => {
                expect(e.diff).toEqual({
                    width: {
                        changeType: 'change',
                        oldValue: 2,
                        newValue: 3
                    },
                    height: {
                        changeType: 'change',
                        oldValue: 3,
                        newValue: 4
                    },
                    perimeter: {
                        changeType: 'change',
                        oldValue: undefined,
                        newValue: 14
                    },
                    size: {
                        changeType: 'change',
                        oldValue: '2*3',
                        newValue: '3*4'
                    },
                    shorterEdge: {
                        changeType: 'change',
                        oldValue: 2,
                        newValue: 3
                    }
                });
                done();
            });
            rectangle.set('size', '3*4');
        });
    });
});
