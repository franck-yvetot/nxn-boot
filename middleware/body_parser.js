const bodyParser = require('body-parser');

class bodyParserMiddleware {
    constructor() {}

    init(config,ctxt) 
    {
        ctxt.app.use(bodyParser.json());
    }
}

module.exports = new bodyParserMiddleware();