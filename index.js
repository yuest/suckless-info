var connect = require('connect')
    ,connectStatic = connect['static']
    ,switchman = require('switchman')
    ,quip = require('quip')
    ,dot = require('dot')
    ,FS = require('q-fs')
    ,util = require('util')
    ,urlRules = switchman()
    ,U = require('./lib/utils')
    ,Model = require('./lib/model')
    ;


var M = Model('localhost:27017/suckless-info?auto_reconnect');
M('user').p('count')( function ( count ) { console.log( count ); });


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
            dTemplate = U.deferred();
            pTemplate = cache[ path ] = dTemplate.promise;
            FS.read( path, { charset: 'utf-8' }).then( function ( rawTemplate ){
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
        var u = req.session && req.session.user && JSON.stringify( req.session.user) || '欢迎光临，请<a href="/signin/">登入或注册</a>';
        res.renderHtml('./views/index.html', { username: u });
    }
});

urlRules.add( require('./site/accout') );
