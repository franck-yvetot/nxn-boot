const cookieParser = require('cookie-parser');

class cookieParserMid {
    constructor() {}

    init(config,ctxt) 
    {
        ctxt.app.use(cookieParser());
    }
}

module.exports = new cookieParserMid();