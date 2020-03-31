const cors = require('cors');        

class corsPolicy {
    constructor() {}

    init(config,ctxt) {
        if(ctxt.app)
            ctxt.app.use(cors());        
    }
}

module.exports = new corsPolicy();