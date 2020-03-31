class bootInfo {
    constructor() {}

    init(config,ctxt) {
        const title = config.title || ctxt.config.title;
        console.log("========= CONFIG "+title);
    }
}

module.exports = new bootInfo();