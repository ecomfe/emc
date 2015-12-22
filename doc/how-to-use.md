## How to use

EMC is written with some edge ECMAScript features, so it doesn't work in most JavaScript environment, we should transform it to more standard ES5 code first.

Here is a list of language features EMC uses beyond ES5:

- `let` and `const` variable declarations.
- `Symbol` for private members.
- `for .. of` iteration syntax.
- `class` syntax.
- `import` and `export` ES6 module syntax.
- `Set` class.
- Parameter default values.
- Arrow function syntax.

When imported from a package manager such as npm, a `dist` directory will contain a UMD version runnable source for quick use. We can also run `npm run build` on source to get the `dist` directory.

We using [babel](https://babeljs.io) to build your customized version, the [es2015 preset](http://babeljs.io/docs/plugins/preset-es2015/) is a minimun requirement, use a different module plugin such as [es2015-modules-amd](http://babeljs.io/docs/plugins/transform-es2015-modules-amd/) to transform code to your destination module system.

It is also recommended to integrate babel in coding environment including dev servers and build scripts so we can have a seamless experience.
