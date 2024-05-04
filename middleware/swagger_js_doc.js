const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

/**
 * configuration and use:
 * 
 * swaggerJsDoc:
 *  path: @nxn/middleware/swaggerJsDoc
 *  openapi_version: "3.0.0"
 *  url: /api_doc
 *  title: MY API
 *  version: 1.1
 *  paths:
 *  - /applications/auth/routes/*.route.js
 * 
 *  NB. check : https://www.npmjs.com/package/swagger-jsdoc
 */
class swaggerJsDocMiddleware {
    constructor() {}

    init(config,ctxt) 
    {
        const options = 
        {
            definition: 
            {
                openapi: config.openapi_version || '3.0.0',

                info: 
                {
                    title: config.title || 'Your API Name',
                    version: config.version || '1.0.0',
                },
          },
        
          apis: config.paths || [
            "./applications/*/routes/*.route.js"
          ],
        };

        const swaggerSpec = swaggerJsdoc(options);
        const urlDoc = config.url || '/api-docs';

        ctxt.app.use(
            urlDoc, 
            swaggerUi.serve, 
            swaggerUi.setup(swaggerSpec));

        console.log("Serving swagger doc on "+urlDoc);        
    }
}

module.exports = new swaggerJsDocMiddleware();