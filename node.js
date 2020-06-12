const _debug = require("@nxn/debug");

const debug = _debug("NODE");
const arraySce = require("@nxn/ext/array.service");

let nodes = [];

class Node
{
    constructor() {
        this._idx = this._id = nodes.length;
        nodes.push(this);

        this._status='created';
        this.debug = debug;
        this._isInit = false;
    }

    init(config,ctxt,injections) {
        if(this._isInit)
            return;

        this.config = config;
        if(this.config.id)
            this._id = this.config.id;
        this.registerReceivers(injections);

        // set debugger with node id
        this.debug = _debug(this.id());

        this._status='initialised';
        this._isInit = true;
    }

    isInit() { 
        return this._isInit;
    }

    invalidParam(p) {
        throw new Error(this.id() +" missing configuration attribute "+p);
    }

    log(s)   { this.debug.log(s); }
    error(s) { this.debug.error(s); }

    canSendMessage() {
        return (this._nodes && this._nodes.length);
    }

    name() {
        return this._name || (this.config && this.config.name) || this.id();
    }

    id() {
        return this._id || 'node-'+this._idx;
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
            this.log(name1+" connecting to "+nodes.length+" Message listeners");

            let i = 0;
            nodes.forEach(p=> {
                i++;
                const name = p.name && p.name() || ("Processor #"+i);
                if(!p.processMessage)
                {
                    this.error(name+" has no processMessage(obj) function => ignored");
                    throw new Error(name+" has no processMessage(obj) function => ignored");
                }
                else {
                    this._nodes.push(p);
                    this.log(name+" connected on "+name1);
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

    getInjection(inj,isArray=false) {
        if(!this.injections || !this.injections[inj])
            return null;

        if(isArray)
            return this.injections[inj];
        else
            return this.injections[inj][0];
    }

    getInjections(inj=null) {
        if(!this.injections)
            return null;

        if(inj)
            return this.injections[inj];
        else
            return this.injections;
    }

    sendError(data) {
        if(this.injections.errors)
            this.sendMessage({name:this.name(),data:data},this.injections.errors);            
    }
    
    async _sendOneMessage(message,node,i=0) {
        const name = message.name || '';
        this.log(" ---> ["+ node.id()+ "] send(" + name + ")") ;
        await node.processMessage(message);
    }

    async nodeStatus(str='') {               
        this._status = str;
    }

    async processMessage(message) {
        if(!message)
        {
            this.error("empty message received")
            return;
        }

        const name=message.name||'Unknown node';
        throw new Error("received message from "+message.name+" but we do nothing");
    }
}

module.exports = Node;