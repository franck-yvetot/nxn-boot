const debug = require("@nxn/debug")("OUTPUT NODE");
const arraySce = require("@nxn/ext/array.service");

let nodes = [];

class Node
{
    constructor() {
        this._id = nodes.length;
        nodes.push(this);

        this._status='created';
    }

    canSendMessage() {
        return (this._nodes && this._nodes.length);
    }

    name() {
        return this._name || (this.config && this.config.name) || 'node #'+this._id;
    }

    id() {
        return this._id;
    }

    registerReceivers(nodes) {
        if(this._nodes && this._nodes.length)
            return;
            
        this._nodes = [];
        let i = 0;
        if(nodes && nodes.length)
        {
            var name1 = this.name && this.name() || '';
            debug.log(name1+" connecting to "+nodes.length+" Message listeners");
            nodes.forEach(p=> {
                i++;
                const name = p.name && p.name() || ("Processor #"+i);
                if(!p.processMessage)
                {
                    debug.error(name+" has no processMessage(obj) function => ignored");
                    throw new Error(name+" has no processMessage(obj) function => ignored");
                }
                else {
                    this._nodes.push(p);
                    debug.log(name+" connected on "+name1);
                }
            })
        }

        this._status='initialised';
    }

    sendMessage(message) {
        if(this._nodes && this._nodes.length)
        {
            let i=0;
            this._status='sending...';
            if(!message.name)
                message.name = this.name();

            arraySce.forEachAsync(this._nodes,
                async (p) => {
                i++;
                const name = p.name && p.name() || ("Processor #"+i);
                debug.log(this.name()+" Send message to "+name);
                await p.processMessage(message)
            });
            this._status='sent';
        }
    }

    async nodeStatus(str='') {               
        this._status = str;
    }

    async processMessage(message) {
        if(!message)
        {
            debug.error("empty message received")
            return;
        }

        const name=message.name||'Unknown node';
        throw new Error("received message from "+message.name+" but we do nothing");
    }
}

module.exports = Node;