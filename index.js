var connect = require('connect')
  , connectStatic = connect['static']
  , switchman = require('switchman')
  , quip = require('quip')
  , Q = require('q')
  , when = Q.when
  , mongodb = require('mongodb')
  , Db = mongodb.Db
  , urlRules = switchman()
  ;

var a2p = function () {
    if ( arguments.length < 1 ) {
        return Q.ref( false );
    }
    var __slice = Array.prototype.slice
      , p = Q.defer()
      ;
    arguments[0].apply( arguments[1], __slice.call( arguments, 2 ).concat([ function ( err ) {
        if ( err ) {
            p.reject( err );
        } else if ( arguments.length > 2 ) {
            p.resolve.call( p, __slice.call( arguments, 1 ));
        } else {
            p.resolve.apply( p, __slice.call( arguments, 1 ));
        }
    }]));
    return p.promise;
};

var M = function ( _db_name, _server, _port ) {
    var _db = new Db( _db_name, new mongodb.Server( _server, 27017 ))
      , pDb = a2p( _db.open, _db )
      , cache = {}
      , Collection = function ( coll ) {
            this.coll = cache[ coll ] = pDb.then( function( db ) {
                return a2p( db.collection, db, coll );
            });
        }
      ;
    Collection.prototype.insert = function ( obj ) {
        return this.coll.then( function ( coll ) {
            return a2p( coll.insert, coll, obj );
        });
    };
    Collection.prototype.count = function () {
        return this.coll.then( function ( coll ) {
            return a2p( coll.count, coll );
        });
    };
    return function ( _coll ) {
        return cache[ _coll ] || (cache[ _coll ] = new Collection( _coll ));
    };
}

var pD = M('suckless-info', 'localhost', 27017);
pD('test').count().then( function ( count ) { console.log( count ); });

connect(
    quip()
  , urlRules
).listen(8088);

urlRules.add({
    '/hello/:visitor': function ( req, res, next, visitor ) {
        pD('test').insert([{ visitor: visitor }]).then( function ( docs ) {
            console.log( docs );
        });
        pD('test').count().then( function ( count ) {
            res.text().ok( visitor + ', you are the ' + count + 'th visitor');
        });
    }
  , '/signup/': function ( req, res, next ) {
    }
});
