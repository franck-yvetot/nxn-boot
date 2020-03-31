const nunjucks = require("nunjucks");

class nunjucksPolicy {
    constructor() {}

    init(config,ctxt) {
        // add html render engine
        nunjucks.configure('templates', {
            autoescape: true,
            express: ctxt.app
        });
    }
}

module.exports = new nunjucksPolicy();