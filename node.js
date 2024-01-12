const _debug = require("@nxn/debug");

const debug = _debug("NODE");
const arraySce = require("@nxn/ext/array.service");
const nodeManager = require("./node_manager");

class NodeMessage 
{
    constructor(data=null,prevMsg=null) 
    {
        if(prevMsg)
            Object.assign(this, prevMsg);
        
        if(data)
            this.data = data;
    }

    getParam(name,dft)
    {
        return this.req && this.req.params && (this.req.params[name]!=null) ? 
            this.req.params[name] 
            : dft;
    }

    getQueryParam(name,dft)  
    {
        return this.req && this.req.query && (this.req.query[name]!=null) ? 
            this.req.query[name] 
            : dft;
    }

    setReq(req,res,user) 
    {
        this.req = req;
        this.res = res;
        return this;
    }

    setMeta(n,v) 
    {
        this[n] = v;
        return this;
    }

    getMeta(n,dft) 
    {
        return (this[n] != null) && this[n] || dft;
    }

    setData(data)
    {
        this.data = data;
        return this;
    }

}

class Node
{
    constructor(instName=null) {
        this._idx = this._id = nodeManager.addNode(this);

        this._status='created';
        this.debug = debug;
        this._isInit = false;
        this.injections = {}
        this._nodes = [];
        this._instName = instName || this._id;
    }

    // locale string mapping
    _(s) {
        if(this.locale)
            return this.locale._(s);
        return s;
    }

    static nodeManager() {
        return nodeManager;
    }

    init(config,ctxt,injections) {
        if(this._isInit)
            return;

        if(config.id)
            this._id = config.id;
        
        this.registerReceivers(injections);

        let $config = this.getInjection('$config');
        if($config && $config.config)
        {
            this.config = {...$config.config, ...config};
            this.$config = $config;
        }
        else
            this.config = config;

        // set debugger with node id
        this.debug = _debug(this.id());

        this.locale = this.getInjection('locale');

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

    createMessage(data,prevMsg) {
        return new NodeMessage(data,prevMsg);
    }

    static buildMessage(data,prevMsg) {
        return new NodeMessage(data,prevMsg);
    }

    logExec(message,str,debug) {
        debug = debug || this.debug;

        let s = this.name();
        if(str)
            s+=" "+str;

        if(debug)
            debug.log("Executed : "+s);

        if(!message.workflow)
            message.workflow = {};

        if(!message.workflow.log)
            message.workflow.log = [];

        message.workflow.log.push(s);
    }

    name() {
        return this._name || (this.config && this.config.name) || this.id();
    }

    id() {
        return this._id || 'node-'+this._idx;
    }

    instance() {
        return this._instName;
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

    addInjection(toNode,injName) {
        if(!injName)
            injName = 'output';

        if(!toNode.processMessage)
            throw new Error("cant inject a node that has no processMessage()");

        if(!this.injections[injName])
            this.injections[injName]=[];

        this.injections[injName].push(toNode);
        this._nodes.push(toNode);
        this.log(this.name()+" connected to "+toNode.name());
        
        return true;
    }

    sendMessage(message,nodes) {
        if(!nodes)
            nodes = this._nodes;

        if(!message.name)
            message.name = this.name();

        if(typeof nodes == "string")
            nodes = this.getInjections(nodes);

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

    async sendMessage2(message,nodes) {
        if(!nodes)
            nodes = this._nodes;

        if(!message.name)
            message.name = this.name();

        if(typeof nodes == "string")
            nodes = this.getInjections(nodes);

        if(typeof nodes.length=="undefined" && nodes._status)
            this._sendOneMessage(message,nodes);
        else if(nodes && nodes.length)
        {
            let i=0;
            this._status='sending...';
            if(!message.name)
                message.name = this.name();

            await arraySce.forEachAsync(nodes,
                async (p) => {
                i++;
                await this._sendOneMessage(message,p,i)
            });
            this._status='sent';
        }
    }    

    getInjection(inj,isMultiple=false) {
        if(!this.injections || !this.injections[inj])
            if(this.$config && this.$config.getInjection)
                return this.$config.getInjection(inj,isMultiple);
            else
                return null;

        if(isMultiple)
            return this.injections[inj];
        else
            return this.injections[inj][0];
    }

    getInjections(inj=null) {
        if(!this.injections)
            if(this.$config && this.$config.getInjections)
                return this.$config.getInjections(inj);
            else
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
        if(node.id) {
        this.log(" ---> ["+ node.id()+ "] send(" + name + ")") ;
        await node.processMessage(message);
    }
        else 
            throw new Error("node unknown");
    }

    async nodeStatus(str='') {               
        this._status = str;
    }

    async run(config,ctxt) {        
        this.processMessage(config);
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