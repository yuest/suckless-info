var connect = require('connect')
    ,connectStatic = connect['static']
    ,switchman = require('switchman')
    ,quip = require('quip')
    ,fs = require('fs')
    ,dot = require('dot')
    ,util = require('util')
    ,urlRules = switchman()
    ,U = require('./lib/utils')
    ,S = require('./settings')
    ,Model = require('./lib/model')
    ;

var M = Model( S.db );

var T = (function () {
    var cache = {};
    return function ( path ) {
        var pTemplate = cache[ path ]
            ,dTemplate
            ;
        if (S.debug || !pTemplate) {
            dTemplate = U.deferred();
            pTemplate = cache[ path ] = dTemplate.promise;
            U.a2p( fs.readFile, fs, path, 'utf-8').then( function ( rawTemplate ){
                dTemplate.resolve( dot.template( rawTemplate ));
            }, function ( err ) {
                dTemplate.reject('error while loading '+ path + ': ' + err );
            });
        }
        return function ( context ) {
            var d = U.deferred();
            pTemplate.then( function ( tplt ) {
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

connect(
    quip()
    ,function ( req, res, next ) {
        res.renderHtml = function ( path, context ) {
            T( path )( context ).then( function ( html ) {
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
        M('post').find({ tag: 'trivial' }, { _id:1, author:1, topic:1, content:1 }, 0, 20).toArray( function ( err, topics ) {
            res.renderHtml('./views/index.html', { topics: topics });
        });
    }
    ,'/post/new': switchman.addSlash
    ,'/post/new/': {
        'GET': function ( req, res, next ) {
            res.renderHtml('./views/post-new.html' );
        }
        ,'POST': function ( req, res, next ) {
            var reqBody = U.extend( {}, req.body );
            reqBody.tag = 'trivial';
            if (req.session.user) {
                reqBody.author = req.session.user.username;
            }
            M('post').p( 'insertOne', reqBody ).then( function ( docs ) {
                console.log( docs );
                res.redirect('/post/' + docs[0]._id + '/');
            });
        }
    }
    ,'GET /post/:id': switchman.addSlash
    ,'GET /post/:id/': function ( req, res, next, id ) {
        M('post').findOne({ _id: parseInt( id )}, function ( err, doc ) {
            res.html().ok( JSON.stringify( doc ));
        });
    }
});

urlRules.add( require('./site/accout') );
