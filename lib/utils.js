function extend( a, b ) {
    Object.keys( b ).forEach( function ( k ) {
        a[ k ] = b[ k ];
    });
    return a;
}

exports = module.exports = {
    extend: extend
    ,slice: Array.prototype.slice
};

var deferred = require('deferred')
extend( exports, {
    deferred: deferred
    ,a2p: function () {
        if (arguments.length < 1) {
            return deferred.promise( new Error('at least one argument'));
        }
        var d = deferred() ;
        arguments[0].apply( arguments[1] || null, exports.slice.call( arguments, 2 ).concat(function ( err, value ) {
            if ( err ) {
                d.relosve( err instanceof Error ? err : new Error( err ));
            } else if (arguments.length <= 2) {
                d.resolve( value );
            } else {
                d.resolve.call( d, exports.slice.call( arguments, 1 ));
            }
        }));
        return d.promise;
    }
});

var crypto = require('crypto');
exports.crypt = function( str, method, encoding ){
  return crypto
    .createHash( method || 'sha1' )
    .update( str )
    .digest( encoding || 'hex' );
};

