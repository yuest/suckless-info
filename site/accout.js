var switchman = require('switchman')
    ,U = require('../lib/utils')
    ;
function redirectToSignin( req, res, next ) {
    res.redirect('/account/');
}

module.exports = {
    '/account': switchman.addSlash
    ,'/account/': {
        'GET': function ( req, res, next ) {
            res.renderHtml('./views/signin.html');
        }
        ,'POST': function ( req, res, next ) {
            var reqBody = U.extend({}, req.body);
            if ( reqBody.action == '注册' ) {
                delete reqBody.password_confirm;
                delete reqBody.action;
                reqBody.password = U.crypt( S.secret + reqBody.username + reqBody.password );
                M('user').p('insertOne', reqBody, -1 ).then( function ( doc ) {
                    console.log( doc );
                });
                res.redirect('/account/registered/');
            } else {
                if ( reqBody.action == '登入' ) {
                }
                M('user').p('findOne', {
                    username: reqBody.username
                    ,password: U.crypt( S.secret + reqBody.username + reqBody.password )
                }, { fields: { username:1, nickname:1, email:1, _id:0 }}).then( function ( doc ) {
                    console.log( doc );
                    req.session.user = doc;
                    res.redirect('/account/registered/');
                });
            }
        }
        ,'GET registered/': function ( req, res, next ) {
            res.html().ok( JSON.stringify( req.session.user || false ));
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
}
