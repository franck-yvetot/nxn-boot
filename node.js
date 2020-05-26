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

    registerReceivers(injections) {

        if(this._nodes && this._nodes.length)
            return;
            
        let nodes;

        // default : injection array of nodes
        if(typeof injections == 'array')
        {
            if(injections.length)
            {
                this.injections = {output: injections};
                nodes = injections
            }
        }
        else 
        {
            if(injections.length==1 && !injections[0]._status) {
                // object
                const inj2 = injections[0];
                if(inj2.output)
                    nodes = inj2.output;

                this.injections = inj2;
            }
            else if(injections.length>1) {
                // array
                this.injections = nodes = Object.values(injections);
            }
            else if(injections && injections.length!==0)
            {
                // not empty array (object)
                if(injections.output)                                                        
                    nodes = (this.injections = injections).output;
                else
                    this.injections = nodes = Object.values(injections);
            }

        }
            
        this._nodes = [];
        if(nodes && nodes.length)
        {
            var name1 = this.name && this.name() || '';
            debug.log(name1+" connecting to "+nodes.length+" Message listeners");

            let i = 0;
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

    sendMessage(message,nodes) {
        if(!nodes)
            nodes = this._nodes;

        if(!message.name)
            message.name = this.name();

        if(typeof nodes.length=="undefined" && nodes._status)
            this._sendOneMessage(message,nodes);
        else if(nodes && nodes.length)
        {
            let i=0;
            this._status='sending...';
            if(!message.name)
                message.name = this.name();

            arraySce.forEachAsync(nodes,
                async (p) => {
                i++;
                await this._sendOneMessage(message,p,i)
            });
            this._status='sent';
        }
    }

    sendError(data) {
        if(this.injections.errors)
            this.sendMessage({name:this.name(),data:data},this.injections.errors);            
    }
    
    async _sendOneMessage(message,node,i=0) {
        const name = node.name && node.name() || ("Processor #"+i);
        debug.log(this.name()+" Send message to "+name);
        await node.processMessage(message);
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