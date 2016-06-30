## 计算属性

计算属性是在数据模型上额外定义的`get`（以及可选的`set`）逻辑，使用计算属性可以创建“动态”的属性，以免除到处写属性之间值同步的逻辑，在代码的可维护性方面有着扮演着重要的角色

### 注意事项

计算属性在提供便利性之余，其本身是一个相对危险的事物。这一危险性来源于对逻辑和数据流的破坏

在一个传统意义上的应用中，逻辑和数据流应该是单向的，即：

1. 视图触发相关动作
2. 引起业务逻辑执行
3. 逻辑修改数据
4. 数据的变化引发视图更新

而计算属性是由数据的变化触发的，引起一段逻辑的执行，并进一步修改另一个数据，与上文所述的步骤对应，是一个由4至3的过程，和应用的单向逻辑及数据流相反

这一反向的流会引起诸多隐患，如逻辑不合理导致4-3-4的死循环，以及在应用逐渐复杂化的情况下数据流变得很不清晰，出现问题难以定位和排查等

因此，在大部分情况下，**不建议使用计算属性**，计算属性的使用应尽可能符合以下条件：

1. 仅包含简单的数据计算（如`filter`、`map`、普通数学运算、字符串连接等），不要加入实际业务上的逻辑
2. 避免过多层的计算属性间的相互依赖（建议不要超过2层）
3. 随时随地有清晰的计算属性与其它属性的依赖关系图，避免出现环型依赖

### 定义计算属性

使用`defineComputedProperty`可以定义计算属性，该函数参数如下：

1. `name`字符串指定属性名称
2. `dependencies`字符串数组指定属性所依赖的其它属性
3. `getter`函数或一个`descriptor`属性描述对象

如果要定义一个只读的计算属性，第3个参数给出`getter`函数就行了：

```js
class Rectangle {
    constructor() {
        this.defineComputedProperty(
            'size',
            ['width', 'height'],
            () => {
                return this.get('width') + '*' + this.get('height');
            }
        );
    }
}
```

这样定义的`size`属性会在`width`或`height`发生变化时自动更新，其值是`{width} * {height}`形式的字符串

`getter`函数不接收任何参数，其内部的`this`为当前`Model`实例

如果要一个更复杂些的计算属性，可以将第三个参数改为一个属性描述对象：

```js
class Rectangle {
    constructor() {
        this.defineComputedProperty(
            'size',
            ['width', 'height'],
            {
                get() {
                    return this.get('width') + '*' + this.get('height');
                },
                set(value, options) {
                    let [width, height] = value.split('*');
                    this.set('width', width, options);
                    this.set('height', height, options);
                }
            }
        );
    }
}
```

属性描述对象可以有以下属性:

- `get`属性用于指定读取属性的函数
- `set`属性用于指定给属性赋值的函数，可选
- `evaluate`属性用于指定是否立即对属性求值，默认状态下属性会在第一次被读取或者其依赖的属性变化时才求值，使用`evaluate: true`可以让其立即求值

如果一个计算属性定义时没有`set`函数，则它是只读的，对一个只读的计算属性赋值会抛出`Cannot set readonly computed property ${name}`异常

计算属性和普通属性在使用上是一样的，通过`get`获取值，通过`set`设置值，当其依赖的属性变化时，计算属性的值会自动更新（通过执行`get`获得新值）

### defineComputedProperty的实际可访问性

`defineComputedProperty`在文档上的可访问性为`public`，但是我们推荐一个`Model`仅在其内部实现里定义计算属性，不要接收外部的`defineComputedProperty`方法的调用，一个数据模型的结构应该是内部实现对外保持稳定接口的，如果由外部访问`defineComputedProperty`方法随意修改数据结构，会大大降低代码的可维护性

同时，也建议在构造函数期间完成所有计算属性的定义，这样在一个实例构造完成后，就拥有完整的属性定义。同时这一原则也有助于日后的一些程序层面的优化（如基于构造函数的分析做预编译等）

### 延迟求值

定义计算属性时提供的`descriptor`属性描述对象可以带有一个`evaluate`属性，如果这个属性的值为`true`，则在属性定义后会立即求值

但是由于我们推荐在构造函数中进行所有计算属性的定义，而此时`Model`本身并不包含任何实际数据，所以立即对计算属性求值会得到不可预期的结果甚至出现异常。使用各种`if`判断依赖的属性值是否满足预期是一种解决方法但会耗费更多的代码。因此在实现上，`emc`支持计算属性的延迟求值，以解决这一问题

`evaluate`属性的默认值为`false`，所以所有不特别标识的计算属性都是延迟求值的，其求值时机为第一次通过`get`访问时，或者其依赖的属性第一次发生变化时

如果使用延迟求值，那么这个属性第一次`change`事件提供的`oldValue`就会恒定为`undefined`，如果你确实需要`oldValue`作为后续逻辑的输入，那么就必须显式地使用`evaluate: true`配置，同时也需要为此增加部分逻辑来避免上文中所提到的问题：

```js
class Rectangle {
    constructor() {
        this.defineComputedProperty(
            'size',
            ['width', 'height'],
            {
                get() {
                    // 对于width或height为undefined的场景进行处理
                    if (!this.has('width') || !this.has('height')) {
                        return undefined;
                    }
                    return this.get('width') + '*' + this.get('height');
                },
                evaluate: true
            }
        );
    }
}
```

### 计算属性的get与set的额外约束

一个计算属性的`get`函数**应当**满足以下约束：

1. 稳定性：在`Model`实例状态未变化的情况下，多次访问`get`应该返回相同（绝对的引用相等）的值
2. 无副作用：调用`get`不应该修改当前`Model`实例或任何外部状态


相对的，计算属性的`set`函数**应当**满足以下约束：

1. 与`get`配对：当使用`set`为计算属性赋值后，立即使用`get`获取应该能得到与`set`调用时给的参数相同的值
2. 主动实现相关钩子：`beforechange`默认不会在计算属性的赋值过程中触发，所以如果需要阻止赋值或修改实际值，则应当在`set`函数中给予实现

需要注意的是，由于`set`函数是自定义的，其通常修改的是计算属性所依赖的属性，所以最后计算属性的值不一定会是`set`调用时给的参数。计算属性的值始终由调用`get`函数得到，所以假设`set`时接受的是一个对象，那么很可能完成赋值后实际通过`get`得到的是一个“内容一致但引用不同的新对象”，这一逻辑与上文提到的“`set`函数与`get`函数配对”存在一定的矛盾，需要进行妥善的处理和权衡：

```js
class User {
    constructor() {
        this.defineComputedProperty(
            'name',
            ['firstName', 'lastName'],
            {
                get: function () {
                    return [this.get('firstName'), this.get('lastName')];
                },
                set: function ([first, last]) {
                    this.set('firstName', first);
                    this.set('lastName', last);
                }
            }
        )
    }
}

let user = new User();
let name = ['Gray', 'Zhang'];
user.set('name', name);
user.get(name) === name; // false
```

### 推荐实践

如果一个计算属性有多个依赖属性，对这些属性一个接一个地赋值会造成多个`change`事件，并引起计算属性多次求值：

```js
let rectangle = new Rectangle({width: 2, height: 3});
rectangle.on('change', e => console.log(e.name, e.oldValue, e.newValue));

rectangle.set('width', 3);
// width 2 3
// size undefined 3*3
rectangle.set('height', 4);
// height 3 4
// size 3*3 3*4
```

这个大部分时候不符合我们的预期，多次`change`事件如果反应到UI的更新上会带来不好的用户体验。此时可以使用`update`方法同时对多个属性进行更新，以去除多余的`change`事件：

```js
let rectangle = new Rectangle({width: 2, height: 3});
rectangle.on('change', e => console.log(e.name, e.oldValue, e.newValue));

rectangle.update({width: {$set: 3}, height: {$set: 4}});
// width 2 3
// height 3 4
// size undefined 3*4
```

### 应当避免的实践

千万不要在`update`方法中同时更新计算属性和它的依赖 属性：

```js
let rectangle = new Rectangle({width: 2, height: 3});
rectangle.update({size: {$set: '3*4'}, width: {$set: 5}}); // 别这么干！
```

其实`emc`的开发者也不知道这么干会发生啥，所以请自重

同时，不要在给计算属性的依赖属性赋值时使用`silent: true`配置，这会阻止相应的`change`事件产生从而导致计算属性无法更新
