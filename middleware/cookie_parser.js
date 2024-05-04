const cookieParser = require('cookie-parser');

class cookieParser {
    constructor() {}

    init(config,ctxt) 
    {
        ctxt.app.use(cookieParser());
    }
}

module.exports = new cookieParser();