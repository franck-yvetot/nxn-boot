class corsPolicy {
    constructor() {}

    init(config,ctxt) 
    {
        let allowHeaders = config.allowed_headers || "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Authorization, X-CLIENT-ID, gtoken, Content-Length";

        /* ================ CORS ================== */
        ctxt.app.use(function(req, res, next) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", allowHeaders);
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