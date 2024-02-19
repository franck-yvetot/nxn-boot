const asyncHooks = require('async_hooks');
const { v4 } = require('uuid');

// doc : https://stackabuse.com/using-async-hooks-for-request-context-handling-in-node-js/

/**
 * 
 * Async context management. Allow to store a context (object) for current API request.
 * cf. doc : https://stackabuse.com/using-async-hooks-for-request-context-handling-in-node-js/
 */
class AsyncContext
{
    constructor() {
        this.store = null;        
        this.init();
    }

    init() {
        if(this.store)
            return;

        this.store = new Map();

        this.asyncHook = asyncHooks.createHook(
        {
            init: (asyncId, _, triggerAsyncId) => {
                if (this.store.has(triggerAsyncId)) 
                {
                    this.store.set(asyncId, this.store.get(triggerAsyncId));
                }
            },

            destroy: (asyncId) => 
            {
                if (this.store.has(asyncId)) 
                {
                    this.store.delete(asyncId);
                }
            }
        });

        this.asyncHook.enable();        
    } 

    /**
     * store an object to be used as async context.
     * An async context is available in all functions that are async.
     * 
     * @param {*} context 
     * @param {*} reqId 
     * @returns 
     */
    setContext(context, reqId = v4())
    {
        const requestInfo = { reqId, ...context };
        this.store.set(asyncHooks.executionAsyncId(), requestInfo);
        return requestInfo;
    }
    
    /**
     * get current async context
     * 
     * @returns {Map}
     */
    getContext()
    {
        return this.store.get(asyncHooks.executionAsyncId());
    }    
}

module.exports = new AsyncContext();