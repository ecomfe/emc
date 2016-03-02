## 如何使用

`emc`由ES Next代码编写，所以在当前常见的JavaScript环境下无法运行，需要使用工具将其转为ES5代码

在`emc`中有使用到以下新的语言特性：

- `let`及`const`关键字
- `Symbol`定义私有方法
- `for .. of`循环语法
- `class`关键字
- `import`及`export`关键字
- `Set`类
- 函数参数默认值
- 箭头函数

建议使用[babel](https://babeljs.io)来转换代码，使用时至少需要[es2015 preset](http://babeljs.io/docs/plugins/preset-es2015/)插件集([diffy-update](https://github.com/ecomfe/diffy-update)需要额外的插件集，具体参考该项目信息），随后可以根据具体运行环境选择对应的模块格式，如[es2015-modules-amd](http://babeljs.io/docs/plugins/transform-es2015-modules-amd/)等
