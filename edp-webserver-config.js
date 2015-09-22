exports.port = 8848;
exports.directoryIndexes = true;
exports.documentRoot = __dirname;

var BABEL_OPTIONS = {
    loose: 'all',
    modules: 'amd',
    compact: false,
    ast: false,
    blacklist: ['strict'],
    externalHelpers: true
};

exports.getLocations = function () {
    return [
        {
            key: 'source',
            location: /^\/src\/.+\.js(\?.+)?/,
            handler: [
                babel(BABEL_OPTIONS)
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
