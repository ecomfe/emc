## 事件

`emc`的`Model`会提供3种事件，分别为`change`、`beforechange`和`update`

### change事件

`change`事件和其它类似的数据模型实现相同，在一个属性的值发生变化后触发

在`Model`类的实现中，对值相等的判定使用`===`运算符，所以如果一个属性是对象类型，则引用不同时就会触发`change`事件，并不会检测其内容相同性

### beforechange事件

`beforechange`事件在一个属性发生变化的前一刻触发，这个事件同时是属性变更的一个钩子

在`beforechange`事件里，可以调用`event.preventDefault()`阻止最后的赋值：

```js
import Model from 'emc/Model';

let model = new Model();
model.on(
    'beforechange',
    e => {
        if (e.name === 'username' && e.newValue.length > 10) {
            e.preventDefault();
        }
    }
);
model.set('name', 'This is a very long name');
model.get('name'); // undefined
```

还可以修改事件对象中`actualValue`属性的值，来改变最终赋值的内容：

```js
import Model from 'emc/Model';

let model = new Model();
model.on(
    'beforechange',
    e => {
        if (e.name === 'age') {
            e.actualValue = Math.min(e.newValue, 18);
        }
    }
);
model.set('age', 22);
model.get('age'); // 18
```

可以在这个事件中进行实时值校验或最大、最小值限制之类的工作


### udpate事件

`update`事件是`emc`库提供的特殊事件，它和`change`有以下区别：

1. 事件是**异步**触发的
2. 在两次`update`事件之间产生的所有属性的修改会合并在一起
3. 对同一个属性的多次修改产生的差异对象也会合并为一个

该事件的事件对象中有一个`diff`属性，如果我们有以下的代码：

```js
import Model from 'emc/Model';

let user = {
    name: 'Alice',
    age: 12
};
let model = new Model(user);

model.on('update', e => console.log(e.diff));

model.set('name', 'Bob');
model.set('age', 18);
model.remove('age');
model.set('gender', 'male');
```

`diff`属性会类似这样：

```js
{
    name: {
        changeType: 'change',
        oldValue: 'Alice',
        newValue: 'Bob'
    },
    age: {
        changeType: 'remove',
        oldValue: 12,
        newValue: undefined
    },
    gender: {
        changeType: 'add',
        oldValue: undefined,
        newValue: 'male'
    }
}
```

具体的差异对象结构请参考[diffy-update](https://github.com/ecomfe/diffy-update)库的说明

`update`事件可以应用在数据绑定的场景下，利用其异步特性和属性变化合并的功能来有效减少UI更新的次数
