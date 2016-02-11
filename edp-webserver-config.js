exports.port = 8848;
exports.directoryIndexes = true;
exports.documentRoot = __dirname;

var BABEL_OPTIONS = {
    presets: ['es2015', 'stage-0'],
    ast: false
};
var babelCore = require('babel-core');

exports.getLocations = function () {
    return [
        {
            // All source and spec files
            key: 'source',
            location: /(src|spec)\/.+\.js/,
            handler: [
                babel(BABEL_OPTIONS, {babel: babelCore})
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
