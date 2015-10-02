import update, {set, push, unshift, merge, defaults, invoke} from 'update';

function createSourceObject() {
    return {
        x: {
            y: {
                z: [1, 2, 3]
            }
        },
        foo: [1, 2, 3],
        alice: 1,
        bob: 2,
        tom: {
            jack: 1
        }
    };
}

describe('update method', () => {
    it('should update a single property value', () => {
        let source = createSourceObject();
        let [result, diff] = update(source, {alice: {$set: 2}});
        expect(result.alice).toBe(2);
        expect(diff).toEqual({
            alice: {
                $change: 'change',
                oldValue: 1,
                newValue: 2
            }
        });
        expect(source).toEqual(createSourceObject());
        result.alice = 1;
        expect(result).toEqual(source);
    });

    it('shoud update a nested property value', () => {
        let source = createSourceObject();
        let [result, diff] = update(source, {tom: {jack: {$set: 2}}});
        expect(result.tom.jack).toBe(2);
        expect(diff).toEqual({
            tom: {
                jack: {
                    $change: 'change',
                    oldValue: 1,
                    newValue: 2
                }
            }
        });
        expect(source).toEqual(createSourceObject());
        result.tom.jack = 1;
        expect(result).toEqual(source);
    });

    it('should create nested property if not exist', () => {
        let source = createSourceObject();
        let [result, diff] = update(source, {a: {b: {$set: 2}}});
        expect(result.a.b).toBe(2);
        expect(diff).toEqual({
            a: {
                b: {
                    $change: 'add',
                    oldValue: undefined,
                    newValue: 2
                }
            }
        });
        expect(source).toEqual(createSourceObject());
        delete result.a;
        expect(result).toEqual(source);
    });

    it('should recognize push command', () => {
        let source = createSourceObject();
        let [result, diff] = update(source, {x: {y: {z: {$push: 4}}}});
        expect(result.x.y.z).toEqual([1, 2, 3, 4]);
        expect(diff).toEqual({
            x: {
                y: {
                    z: {
                        $change: 'change',
                        oldValue: [1, 2, 3],
                        newValue: [1, 2, 3, 4]
                    }
                }
            }
        });
        expect(source).toEqual(createSourceObject());
        result.x.y.z.pop();
        expect(result).toEqual(source);
    });

    it('should recognize unshift command', () => {
        let source = createSourceObject();
        let [result, diff] = update(source, {x: {y: {z: {$unshift: 0}}}});
        expect(result.x.y.z).toEqual([0, 1, 2, 3]);
        expect(diff).toEqual({
            x: {
                y: {
                    z: {
                        $change: 'change',
                        oldValue: [1, 2, 3],
                        newValue: [0, 1, 2, 3]
                    }
                }
            }
        });
        expect(source).toEqual(createSourceObject());
        result.x.y.z.shift();
        expect(result).toEqual(source);
    });

    it('should recognize merge command', () => {
        let source = createSourceObject();
        let [result, diff] = update(source, {x: {y: {$merge: {a: 1, b: 2, z: source.x.y.z}}}});
        expect(result.x.y).toEqual({a: 1, b: 2, z: [1, 2, 3]});
        expect(diff).toEqual({
            x: {
                y: {
                    a: {
                        $change: 'add',
                        oldValue: undefined,
                        newValue: 1
                    },
                    b: {
                        $change: 'add',
                        oldValue: undefined,
                        newValue: 2
                    }
                    // Should not have `z` in diff
                }
            }
        });
        expect(source).toEqual(createSourceObject());
    });

    it('should recognize defaults command', () => {
        let source = createSourceObject();
        let [result, diff] = update(source, {x: {y: {$defaults: {a: 1, b: 2, z: 3}}}});
        expect(result.x.y).toEqual({a: 1, b: 2, z: [1, 2, 3]});
        expect(diff).toEqual({
            x: {
                y: {
                    a: {
                        $change: 'add',
                        oldValue: undefined,
                        newValue: 1
                    },
                    b: {
                        $change: 'add',
                        oldValue: undefined,
                        newValue: 2
                    }
                    // Should not have `z` in diff
                }
            }
        });
        expect(source).toEqual(createSourceObject());
    });

    it('should recognize invoke command', () => {
        let source = createSourceObject();
        let [result, diff] = update(source, {tom: {jack: {$invoke(x) { return x * 2; }}}});
        expect(result.tom.jack).toBe(2);
        expect(diff).toEqual({
            tom: {
                jack: {
                    $change: 'change',
                    oldValue: 1,
                    newValue: 2
                }
            }
        });
        expect(source).toEqual(createSourceObject());
    });

    it('should expose set function', () => {
        let source = createSourceObject();
        let result = set(source, ['tom', 'jack'], 2);
        expect(result.tom.jack).toBe(2);
        expect(source).toEqual(createSourceObject());
        result.tom.jack = 1;
        expect(result).toEqual(source);
    });

    it('should expose push function', () => {
        let source = createSourceObject();
        let result = push(source, ['x', 'y', 'z'], 4);
        expect(result.x.y.z).toEqual([1, 2, 3, 4]);
        expect(source).toEqual(createSourceObject());
        result.x.y.z.pop();
        expect(result).toEqual(source);
    });

    it('should expose unshift function', () => {
        let source = createSourceObject();
        let result = unshift(source, ['x', 'y', 'z'], 0);
        expect(result.x.y.z).toEqual([0, 1, 2, 3]);
        expect(source).toEqual(createSourceObject());
        result.x.y.z.shift();
        expect(result).toEqual(source);
    });

    it('should expose merge function', () => {
        let source = createSourceObject();
        let result = merge(source, ['x', 'y'], {a: 1, b: 2, z: 3});
        expect(result.x.y).toEqual({a: 1, b: 2, z: 3});
        expect(source).toEqual(createSourceObject());
    });

    it('should expose defaults function', () => {
        let source = createSourceObject();
        let result = defaults(source, ['x', 'y'], {a: 1, b: 2, z: 3});
        expect(result.x.y).toEqual({a: 1, b: 2, z: [1, 2, 3]});
        expect(source).toEqual(createSourceObject());
    });

    it('should expose invoke function', () => {
        let source = createSourceObject();
        let result = invoke(source, ['tom', 'jack'], (x) => x * 2);
        expect(result.tom.jack).toBe(2);
        expect(source).toEqual(createSourceObject());
    });

    describe('run with first level command', () => {
        it('should work with $set', () => {
            let source = {};
            let [result, diff] = update(source, {$set: 1});
            expect(result).toBe(1);
            expect(diff).toEqual({
                $change: 'change',
                oldValue: source,
                newValue: result
            });
            expect(source).toEqual({});
        });

        it('should work with $push', () => {
            let source = [1, 2, 3];
            let [result, diff] = update(source, {$push: 4});
            expect(result).toEqual([1, 2, 3, 4]);
            expect(diff).toEqual({
                $change: 'change',
                oldValue: source,
                newValue: result
            });
            expect(source).toEqual([1, 2, 3]);
        });

        it('should work with $unshift', () => {
            let source = [1, 2, 3];
            let [result, diff] = update(source, {$unshift: 0});
            expect(result).toEqual([0, 1, 2, 3]);
            expect(diff).toEqual({
                $change: 'change',
                oldValue: source,
                newValue: result
            });
            expect(source).toEqual([1, 2, 3]);
        });

        it('should work with $merge', () => {
            let source = {foo: 1};
            let [result, diff] = update(source, {$merge: {foo: 3, bar: 2}});
            expect(result).toEqual({foo: 3, bar: 2});
            expect(diff).toEqual({
                foo: {
                    $change: 'change',
                    oldValue: 1,
                    newValue: 3
                },
                bar: {
                    $change: 'add',
                    oldValue: undefined,
                    newValue: 2
                }
            });
            expect(source).toEqual({foo: 1});
        });

        it('should work with $defaults', () => {
            let source = {foo: 1};
            let [result, diff] = update(source, {$defaults: {foo: 2, bar: 2}});
            expect(result).toEqual({foo: 1, bar: 2});
            expect(diff).toEqual({
                bar: {
                    $change: 'add',
                    oldValue: undefined,
                    newValue: 2
                }
                // Should not have `foo` in diff
            });
            expect(source).toEqual({foo: 1});
        });

        it('should work with $invoke', () => {
            let source = 1;
            let [result, diff] = update(source, {$invoke(x) { return x * 2; }});
            expect(result).toEqual(2);
            expect(diff).toEqual({
                $change: 'change',
                oldValue: source,
                newValue: result
            });
            expect(source).toEqual(1);
        });

        it('should not generate diff if value is not modified', () => {
            let source = createSourceObject();

            expect(update(source, {$set: source})[1]).toBe(null);
            expect(update(source, {$merge: source})[1]).toBe(null);
            expect(update(source, {$defaults: source})[1]).toBe(null);
            expect(update(source, {$invoke() { return source; }})[1]).toBe(null);

            expect(update(source, {foo: {$set: source.foo}})[1]).toBe(null);
            expect(update(source, {x: {y: {$merge: {z: source.x.y.z}}}})[1]).toBe(null);
        });
    });

    describe('shortcut function with first level command', () => {
        it('should work with $set', () => {
            let source = {};
            let result = set(source, null, 1);
            expect(result).toBe(1);
            expect(source).toEqual({});
        });

        it('should work with $push', () => {
            let source = [1, 2, 3];
            let result = push(source, null, 4);
            expect(result).toEqual([1, 2, 3, 4]);
            expect(source).toEqual([1, 2, 3]);
        });

        it('should work with $unshift', () => {
            let source = [1, 2, 3];
            let result = unshift(source, null, 0);
            expect(result).toEqual([0, 1, 2, 3]);
            expect(source).toEqual([1, 2, 3]);
        });

        it('should work with $merge', () => {
            let source = {foo: 1};
            let result = merge(source, null, {bar: 2})
            expect(result).toEqual({foo: 1, bar: 2});
            expect(source).toEqual({foo: 1});
        });

        it('should work with $defaults', () => {
            let source = {foo: 1};
            let result = defaults(source, null, {foo: 2, bar: 2});
            expect(result).toEqual({foo: 1, bar: 2});
            expect(source).toEqual({foo: 1});
        });

        it('should work with $invoke', () => {
            let source = 1;
            let result = invoke(source, null, (x) => x * 2);
            expect(result).toEqual(2);
            expect(source).toEqual(1);
        });
    });
});
