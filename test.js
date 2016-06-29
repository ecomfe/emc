let checkCircularDependency = (root, node = root, path = []) => {
    let dependencies = dependencyTable[node];

    if (!dependencies) {
        return;
    }

    let currentPath = path.concat(node);
    if (dependencies.includes(root)) {
        console.warn(currentPath.concat(root).join('->'));
        return;
    }
    dependencies.forEach(name => checkCircularDependency(root, name, currentPath));
};


let dependencyTable = {
    a: ['x', 'y'],
    x: ['b', 'c'],
    y: ['b', 'd'],
    d: ['x', 'z'],
    z: ['a', 'e']
};

checkCircularDependency('x');
