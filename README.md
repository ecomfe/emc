# EFE Model & Collection

`emc`提供一个基本的`Model`类的实现，用于存储数据并提供数据变化时的相关事件

`2.x`版本主要希望应用于以“不可变”为基础的场景之下，如果只需要更简单的一个实现，可以直接使用`1.x`版本

## API文档

```shell
npm i
npm run doc
open doc/api/index.html
```

## 更新历史

### 2.0.0

- 完全重新设计
- 支持不可变数据的管理

### 2.1.0

- 依赖库更新至`mini-event@2.x`及`diffy-update@2.x`
- 汉化所有文档
- 取消了`set`方法对`value`未提供的检查
