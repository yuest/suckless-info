var connect = require('connect')
    ,connectStatic = connect['static']
    ,switchman = require('switchman')
    ,quip = require('quip')
    ,dot = require('dot')
    ,Q = require('q')
    ,when = Q.when
    ,FS = require('q-fs')
    ,mongodb = require('mongodb')
    ,Db = mongodb.Db
    ,urlRules = switchman()
    ;

var a2p = function () {
    if ( arguments.length < 1 ) {
        return Q.ref( false );
    }
    var __slice = Array.prototype.slice
        ,p = Q.defer()
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
        ,pDb = a2p( _db.open, _db )
        ,cache = {}
        ,Collection = function ( coll ) {
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

var S = {}; // global settings
S.debug = true;

var T = (function () {
    var cache = {};
    return function ( path ) {
        var pTemplate = cache[ path ]
            ,dTemplate
            ;
        if ( S.debug || !pTemplate ) {
            dTemplate = Q.defer();
            pTemplate = cache[ path ] = dTemplate.promise;
            when( FS.read( path, { charset: 'utf-8' }), function ( rawTemplate ){
                dTemplate.resolve( dot.template( rawTemplate ));
            }, function ( err ) {
                dTemplate.reject('error while loading '+ path + ': ' + err );
            });
        }
        return function ( context ) {
            var d = Q.defer();
            when( pTemplate, function ( tplt ) {
                try {
                    d.resolve( tplt( context || {}));
                } catch ( err ) {
                    d.reject('error while rending '+ path + ': ' + err );
                }
            }, function ( err ) {
                d.reject('error while rending '+ path + ': ' + err );
            });
            return d.promise;
        }
    };
}());

var pD = M('suckless-info', 'localhost', 27017);
pD('test').count().then( function ( count ) { console.log( count ); });

connect(
    quip()
    ,function ( req, res, next ) {
        res.renderHtml = function ( path, context ) {
            when( T( path )( context ), function ( html ) {
                res.html().ok( html );
            }, function ( err ) {
                res.html().error( err )
            });
        };
        next();
    }
    ,connect.bodyParser()
    ,urlRules
).listen(10086);

urlRules.add({
    '/': function ( req, res, next ) {
        res.renderHtml('./views/index.html');
    }
    ,'/hello/:visitor': function ( req, res, next, visitor ) {
        pD('test').insert([{ visitor: visitor }]).then( function ( docs ) {
            console.log( docs );
        });
        pD('test').count().then( function ( count ) {
            res.text().ok( visitor + ', you are the ' + count + 'th visitor');
        });
    }
    ,'/ok': function ( req, res, next ) {
        res.ok('ok');
    }
    ,'/ok/': switchman.removeSlash
    ,'/ok/ok': switchman.addSlash
    ,'/ok//ok/': function ( req, res, next ) {
        res.ok('okook');
    }
    ,'/signup': switchman.addSlash
    ,'/signup/': {
        'GET': function ( req, res, next ) {
            res.renderHtml('./views/signup.html');
        }
        ,'POST': function ( req, res, next ) {
            console.log( req.body );
            res.redirect('/signup/done/');
        }
        ,'GET done/': function ( req, res, next ) {
            res.ok().html('注册成功');
        }
    }
});
