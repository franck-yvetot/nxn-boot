class corsPolicy {
    constructor() {}

    init(config,ctxt) {
        /* ================ CORS ================== */
        ctxt.app.use(function(req, res, next) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Authorization, gtoken, Content-Length");
            res.header("Access-Control-Allow-Credentials", "true");
            next();
        });
        
        ctxt.app.options("*", function(req, res, next){
            res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
            res.sendStatus(200);
        });
    }
}

module.exports = new corsPolicy();