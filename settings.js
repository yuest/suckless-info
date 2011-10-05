exports.db = 'localhost:27017/suckless-info?auto_reconnect';
exports.secret = 'suckless.info';

// 生产环境配置
if (process.env.NODE_ENV != 'production') {
    exports.debug = true;
}
