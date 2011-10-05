var U = require('./utils.js')
    ,S = require('../settings')
    ,mongo = require('mongoskin')
    ;

module.exports = function( db ) {
    db = (typeof db == 'string') ? mongo.db( db ) : db;
    var collection = function ( _coll ) {
        var coll = db.collection( _coll );
        coll.p = function ( action ) { // 以 promise 的方式调用 collection 方法
            if (arguments.length < 1) {
                throw new Error('at least one argument');
            }
            var args = U.slice.call( arguments )
                ,offset
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
                return U.a2p.apply( null, fmArgs ).then( function ( counter ) {
                    doc.id = counter.next + offset;
                    return U.a2p( coll.insert, coll, doc );
                });
            }
            if (action == 'counter') {
                args = fmArgs;
            } else {
                args.splice( 0, 1, coll[ action ], coll);
            }
            return U.a2p.apply( null, args );
        };
        return coll;
    };
    collection.db = db;
    return collection;
}
