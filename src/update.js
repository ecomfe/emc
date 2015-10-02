/**
 * EMC (EFE Model & Collection)
 * Copyright 2015 Baidu Inc. All rights reserved.
 *
 * @file update helper module
 * @author otakustay
 */
import u from 'underscore';

const AVAILABLE_COMMANDS = {
    $set(container, propertyName, newValue) {
        let oldValue = container[propertyName];
        if (newValue === oldValue) {
            return [oldValue, null];
        }
        return [
            newValue,
            {
                $change: container.hasOwnProperty(propertyName) ? 'change' : 'add',
                oldValue: oldValue,
                newValue: newValue
            }
        ];
    },

    $push(container, propertyName, newValue) {
        let array = container[propertyName];
        let result = array.slice();
        result.push(newValue);
        return [
            result,
            {
                $change: 'change',
                oldValue: array,
                newValue: result
            }
        ];
    },

    $unshift(container, propertyName, newValue) {
        let array = container[propertyName];
        let result = array.slice();
        result.unshift(newValue);
        return [
            result,
            {
                $change: 'change',
                oldValue: array,
                newValue: result
            }
        ];
    },

    $merge(container, propertyName, extensions) {
        let target = container[propertyName];
        if (target == null) {
            let newValue = u.clone(extensions);
            return [
                newValue,
                {
                    $change: container.hasOwnProperty(propertyName) ? 'change' : 'add',
                    oldValue: target,
                    newValue: newValue
                }
            ];
        }

        let diff = {};
        let newValue = u.clone(target);
        for (let key of Object.keys(extensions)) {
            let [propertyValue, propertyDiff] = AVAILABLE_COMMANDS.$set(newValue, key, extensions[key]);
            if (propertyDiff) {
                diff[key] = propertyDiff;
                newValue[key] = propertyValue;
            }
        }
        if (!Object.keys(diff).length) {
            diff = null;
        }
        return [newValue, diff];
    },

    $defaults(container, propertyName, defaults) {
        let target = container[propertyName];
        let overrideKeys = Object.keys(defaults).filter((key) => target[key] === undefined);
        let extensions = u.pick(defaults, overrideKeys);
        return AVAILABLE_COMMANDS.$merge(container, propertyName, extensions);
    },

    $invoke(container, propertyName, factory) {
        let newValue = factory(container[propertyName]);
        return AVAILABLE_COMMANDS.$set(container, propertyName, newValue);
    }
};

/**
 * Update an object following given command, return a new obejct
 * and a diff between 2 objects, original object is not modified to ensure immutability.
 *
 * Available commands are：
 *
 * - `$set` for changing the value.
 * - `$push` for adding a value at the end of an array.
 * - `$unshift` for adding a value at the beginning of an array.
 * - `$merge` for shallow merging two objects.
 * - `$defaults` for filling default (override `undefined`) values.
 * - `$invoke` for invoking a factory function to get the value and then perform a `$set` command,
 *     the old value is provided as the only parameter for the factory function
 *
 * It is possible to use multiple commands simultaneously：
 *
 * ```javascript
 * import update from 'emc/update';
 *
 * let [newObject, diff] = update(
 *     source,
 *     {
 *         foo: {bar: {$set: 1}},
 *         alice: {$push: 1},
 *         tom: {jack: {$set: {x: 1}}
 *     }
 * );
 * ```
 *
 * `update` function returns a `diff` object as the second item of the returning array, `diff` object is something like:
 *
 * ```javascript
 * {
 *     foo: {
 *         bar: {
 *             $change: 'add' // can be "add", "change" or "remove",
 *             oldValue: [1, 2, 3],
 *             newValue: [2, 3, 4]
 *         }
 *     }
 * }
 * ```
 *
 * We can use a simple object iteration over this object to find a minumum difference between 2 objects,
 * all leaves of `diff` object contains a `$change` property which indicates the change type of this property.
 *
 * @param {Object} source The source obejct.
 * @param {Object} commands The update command.
 * @return {Array} A tuple contains [newObject, diff].
 *     `newObject` is a new obejct with properties updated,
 *     `diff` is a diff object between the original object and the modified one.
 */
export default function update(source, commands) {
    // If the root is a update command, perform update on `source` object, no further property iteration is required.
    let possibleRootCommand = u.find(
        Object.keys(AVAILABLE_COMMANDS),
        (command) => {
            return commands.hasOwnProperty(command);
        }
    );
    if (possibleRootCommand) {
        let wrapper = {source};
        let commandValue = commands[possibleRootCommand];
        let [newValue, diff] = AVAILABLE_COMMANDS[possibleRootCommand](wrapper, 'source', commandValue);
        return [newValue, diff];
    }

    let diff = {};
    let result = Object.keys(commands).reduce(
        (result, key) => {
            let propertyCommand = commands[key];
            // If this is a command node, perform update on current property
            let isCommand = u.any(
                AVAILABLE_COMMANDS,
                (execute, command) => {
                    if (propertyCommand.hasOwnProperty(command)) {
                        let [newValue, propertyDiff] = execute(result, key, propertyCommand[command]);
                        result[key] = newValue;
                        if (propertyDiff) {
                            diff[key] = propertyDiff;
                        }
                        return true;
                    }
                    return false;
                }
            );
            // If it is not a command node, it indicates a command in nested objects, recurse to find that.
            if (!isCommand) {
                let [newValue, propertyDiff] = update(result[key] || {}, propertyCommand);
                result[key] = newValue;
                if (propertyDiff) {
                    diff[key] = propertyDiff;
                }
            }

            return result;
        },
        u.clone(source)
    );

    if (!Object.keys(diff).length) {
        diff = null;
    }
    return [result, diff];
}

function buildPathObject(path, value) {
    if (!path) {
        return value;
    }

    if (typeof path === 'string') {
        path = [path];
    }

    let result = {};
    let current = result;
    for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]] = {};
    }
    current[path[path.length - 1]] = value;
    return result;
}

/**
 * A shortcut function for `$set` command.
 *
 * @param {Object} source The source object.
 * @param {string?|Array.<string>} path The path of a property, use array for nested property path,
 *     if this parameter is not not `undefined` or `null`, the command will be performed on the source object.
 * @param {*} value The new value.
 * @return {Object} A new obejct with properties updated.
 */
export function set(source, path, value) {
    let [result] = update(source, buildPathObject(path, {$set: value}));
    return result;
}

/**
 * A shortcut function for `$push` command.
 *
 * @param {Object} source The source object.
 * @param {string?|Array.<string>} path The path of a property, use array for nested property path,
 *     if this parameter is not not `undefined` or `null`, the command will be performed on the source object.
 * @param {*} value The new value.
 * @return {Object} A new obejct with properties updated.
 */
export function push(source, path, value) {
    let [result] = update(source, buildPathObject(path, {$push: value}));
    return result;
}

/**
 * A shortcut function for `$unshift` command.
 *
 * @param {Object} source The source object.
 * @param {string?|Array.<string>} path The path of a property, use array for nested property path,
 *     if this parameter is not not `undefined` or `null`, the command will be performed on the source object.
 * @param {*} value The new value.
 * @return {Object} A new obejct with properties updated.
 */
export function unshift(source, path, value) {
    let [result] = update(source, buildPathObject(path, {$unshift: value}));
    return result;
}

/**
 * A shortcut function for `$merge` command.
 *
 * @param {Object} source The source object.
 * @param {string?|Array.<string>} path The path of a property, use array for nested property path,
 *     if this parameter is not not `undefined` or `null`, the command will be performed on the source object.
 * @param {*} value The new value.
 * @return {Object} A new obejct with properties updated.
 */
export function merge(source, path, value) {
    let [result] = update(source, buildPathObject(path, {$merge: value}));
    return result;
}

/**
 * A shortcut function for `$defaults` command.
 *
 * @param {Object} source The source object.
 * @param {string?|Array.<string>} path The path of a property, use array for nested property path,
 *     if this parameter is not not `undefined` or `null`, the command will be performed on the source object.
 * @param {*} value The new value.
 * @return {Object} A new obejct with properties updated.
 */
export function defaults(source, path, value) {
    let [result] = update(source, buildPathObject(path, {$defaults: value}));
    return result;
}

/**
 * A shortcut function for `$invoke` command.
 *
 * @param {Object} source The source object.
 * @param {string?|Array.<string>} path The path of a property, use array for nested property path,
 *     if this parameter is not not `undefined` or `null`, the command will be performed on the source object.
 * @param {Function} factory The factory function.
 * @return {Object} A new obejct with properties updated.
 */
export function invoke(source, path, factory) {
    let [result] = update(source, buildPathObject(path, {$invoke: factory}));
    return result;
}
