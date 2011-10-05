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
    ,__slice = Array.prototype.slice
    ;

function extend( a, b ) {
    Object.keys( b ).forEach( function ( k ) {
        a[ k ] = b[ k ];
    });
    return a;
}

function crypt( raw ) {
    return raw;
}


var a2p = function () {
    if (arguments.length < 1) {
        return Q.ref( false );
    }
    var p = Q.defer() ;
    arguments[0].apply( arguments[1], __slice.call( arguments, 2 ).concat([ function ( err ) {
        if (err) {
            p.reject( err );
        } else if (arguments.length > 2) {
            p.resolve.call( p, __slice.call( arguments, 1 ));
        } else {
            p.resolve.apply( p, __slice.call( arguments, 1 ));
        }
    }]));
    return p.promise;
};

var pD = function ( _db_name, _server, _port ) {
    var _db = new Db( _db_name, new mongodb.Server( _server, 27017 ))
        ,pDb = a2p( _db.open, _db )
        ,cache = {}
        ;
    return function ( _coll ) {
        return cache[ _coll ] || (cache[ _coll ] = (function ( pColl ) {
            return function ( action ) {
                if (arguments.length < 1) {
                    throw new Error('at least one argument');
                }
                var args = __slice.call( arguments );
                return pColl.then( function ( coll ) {
                    var offset
                        ,doc
                        ,fmArgs = [
                            coll.findAndModify
                            ,coll
                            ,{ _id: 'counter' }
                            ,[['_id', 'asc']]
                            ,{ $inc: { next: 1 }}
                            ,{
                                'new': true
                                ,upsert: true
                            }
                        ]
                        ;
                    if (action == 'insertOne') {
                        doc = args[1];
                        offset = args[2] || 0;
                        return a2p.apply( null, fmArgs ).then( function ( counter ) {
                            doc.id = counter.next + offset;
                            return a2p( coll.insert, coll, doc );
                        });
                    }
                    if (action == 'counter') {
                        args = fmArgs;
                    } else {
                        args.splice( 0, 1, coll[ action ], coll);
                    }
                    return a2p.apply( null, args );
                }, function ( err ) {
                    console.log( err );
                });
            };
        }( pDb.then( function ( db ) {
            return a2p( db.collection, db, _coll );
        }, function ( err ) {
            console.log( err );
        }) )));
    };
}


var S = {}; // global settings
S.debug = true;
S.secret = 'suckless.info';

var T = (function () {
    var cache = {};
    return function ( path ) {
        var pTemplate = cache[ path ]
            ,dTemplate
            ;
        if (S.debug || !pTemplate) {
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

var M = pD('suckless-info', 'localhost', 27017);
M('user')('count').then( function ( count ) { console.log( count ); });
//M('test').counter.then( function ( counter ) { console.log( counter.next - 1 ); });

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
    ,connect.cookieParser()
    ,connect.session({ secret: S.secret })
    ,urlRules
).listen(10086);

urlRules.add({
    '/': function ( req, res, next ) {
        var u = req.session && req.session.u || '欢迎光临，请<a href="/signin/">登入或注册</a>';
        res.renderHtml('./views/index.html', { username: u });
    }
});

function redirectToSignin( req, res, next ) {
    res.redirect('/account/');
}
urlRules.add({
    '/account': switchman.addSlash
    ,'/account/': {
        'GET': function ( req, res, next ) {
            res.renderHtml('./views/signin.html');
        }
        ,'POST': function ( req, res, next ) {
            var reqBody = extend({}, req.body);
            if ( reqBody.action == '注册' ) {
                delete reqBody.password_confirm;
                delete reqBody.action;
                reqBody.password = crypt( reqBody.password );
                when( M('user')('insertOne', reqBody, -1 ), function ( doc ) {
                    console.log( doc );
                });
                res.redirect('/signin/done/');
            } else {
                if ( reqBody.action == '登入' ) {
                }
                M('user')('findOne', {
                    username: reqBody.username
                    ,password: crypt( reqBody.password )
                }).then( function ( doc ) {
                    console.log( doc );
                    req.session.user = doc;
                    res.redirect('/account/registered/');
                }).then( function ( err ) {
                    console.log( err );
                    res.html().ok( 'error' );
                });
            }
        }
        ,'GET registered/': function ( req, res, next ) {
            req.session.c = req.session.c && req.session.c + 1 || 1;
            res.html().ok( JSON.stringify( req.session.user ));
            //res.ok().html(req.session.c + '注册成功');
        }
    }
    ,'GET /signin': redirectToSignin
    ,'GET /signin/': redirectToSignin
    ,'GET /signup': redirectToSignin
    ,'GET /signup/': redirectToSignin
    ,'GET /register': redirectToSignin
    ,'GET /register/': redirectToSignin
    ,'GET /reg': redirectToSignin
    ,'GET /reg/': redirectToSignin
    ,'GET /login': redirectToSignin
    ,'GET /login/': redirectToSignin
});
