const fileUpload = require('express-fileupload');

class fileUploadsPolicy {
    constructor() {}

    init(config,ctxt) {

        // Middleware : manage uploads
        ctxt.app.use(fileUpload());
    }
}

module.exports = new fileUploadsPolicy();