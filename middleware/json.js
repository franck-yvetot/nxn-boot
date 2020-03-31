const fileUpload = require('express-fileupload');

class jsonPolicy {
    constructor() {}

    init(config,ctxt) {

        // Middleware : decode request body
        ctxt.app.use(ctxt.express.json());
    }
}

module.exports = new jsonPolicy();