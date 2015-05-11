exports.port = 8848;
exports.directoryIndexes = true;
exports.documentRoot = __dirname;

var BABEL_OPTIONS = {
    loose: 'all',
    modules: 'amd',
    compact: false,
    ast: false,
    blacklist: ['strict']
};

exports.getLocations = function () {
    return [
        {
            key: 'source',
            location: /^\/src\/.+\.js(\?.+)?/,
            handler: [
                file(),
                function compileBabel(context) {
                    console.log('babel', context.request.url);
                    if (context.status !== 200) {
                        return;
                    }

                    var code = context.content;
                    var babelResult = require('babel').transform(code, BABEL_OPTIONS);
                    context.content = babelResult.code;
                }
            ]
        },
        {
            location: /^.*$/,
            handler: [
                file()
            ]
        }
    ];
};

exports.injectResource = function ( res ) {
    for ( var key in res ) {
        global[ key ] = res[ key ];
    }
};
