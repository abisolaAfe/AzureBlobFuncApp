const { app } = require('@azure/functions');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const jwt = require('jsonwebtoken');

const msalConfig = {
    auth: {
        clientId: process.env.CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
        clientSecret: process.env.CLIENT_SECRET,
    },
};

const pca = new ConfidentialClientApplication(msalConfig);
const jwtSecret = process.env.JWT_SECRET; // Retrieve the JWT secret from environment variables

app.http('GetGraphToken', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`HTTP function processed request for URL "${request.url}"`);
        context.log('requestheader', request.headers.get('authorization'));
        // Log the headers object for debugging
        context.log('Request Headers:', JSON.stringify(request.headers));

        // Attempt to access the authorization header directly
        const authHeader = request.headers.get('authorization') //|| request.headers['Authorization'];
        context.log('Authorization Header:', authHeader);

        if (!authHeader) {
            context.log('Authorization header missing');
            return {
                status: 401,
                body: JSON.stringify({ error: 'Authorization header missing' }),
            };
        }

        // Extract the token from the authorization header
        const token = authHeader.split(' ')[1];
        context.log('Token:', token);

        if (!token) {
            context.log('Token missing');
            return {
                status: 401,
                body: JSON.stringify({ error: 'Token missing' }),
            };
        }

        try {
            jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }); // Verify the token using the JWT secret

            const result = await pca.acquireTokenByClientCredential({
                scopes: ['https://graph.microsoft.com/.default'],
            });

            context.log(`Token acquisition result: ${JSON.stringify(result)}`);

            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ accessToken: result.accessToken }),
            };
        } catch (error) {
            context.log(`Error acquiring token: ${error.message}`);
            return {
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ error: error.message }),
            };
        }
    },
});


















