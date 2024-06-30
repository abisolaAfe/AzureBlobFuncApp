/*const { app } = require('@azure/functions');
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

app.http('GetTokenFunction', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`HTTP function processed request for URL "${request.url}"`);

        // Log the headers object for debugging
        context.log('Request Headers:', JSON.stringify(request.headers));

        // Attempt to access the authorization header directly
        const authHeader = request.headers.get('authorization');
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
            // Verify the token using the JWT secret
            jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });;

            // Acquire the token using MSAL
            const result = await pca.acquireTokenByClientCredential({
                scopes: ['https://management.azure.com/.default'],
            });

            context.log(`Token acquisition result: ${JSON.stringify(result)}`);

            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ accessToken: result.accessToken }), // Ensure body is JSON string
            };
        } catch (error) {
            context.log(`Error acquiring token: ${error.message}`);
            return {
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ error: error.message }), // Ensure body is JSON string
            };
        }
    },
});*/

const { app } = require('@azure/functions');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const msalConfig = {
    auth: {
        clientId: process.env.CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
        clientSecret: process.env.CLIENT_SECRET,
    },
};

const pca = new ConfidentialClientApplication(msalConfig);
const jwtSecret = process.env.JWT_SECRET; // Retrieve the JWT secret from environment variables
const jwksUri = 'https://login.microsoftonline.com/common/discovery/keys'; // Replace with your JWKS URI

const client = jwksClient({
    jwksUri: jwksUri
});

function getKey(header) {
    return new Promise((resolve, reject) => {
        client.getSigningKey(header.kid, function (err, key) {
            if (err) {
                reject(err);
            } else {
                const signingKey = key.getPublicKey();
                resolve(signingKey);
            }
        });
    });
}

app.http('GetTokenFunction', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`HTTP function processed request for URL "${request.url}"`);

        // Log the headers object for debugging
        context.log('Request Headers:', JSON.stringify(request.headers));

        // Attempt to access the authorization header directly
        const authHeader = request.headers.get('authorization');
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
            // Decode the token to get the algorithm
            const decodedToken = jwt.decode(token, { complete: true });
            if (!decodedToken || !decodedToken.header) {
                throw new Error('Invalid token');
            }

            const alg = decodedToken.header.alg;
            context.log('Token algorithm:', alg);

            let verifiedToken;

            // Verify the token based on the algorithm
            if (alg === 'HS256') {
                verifiedToken = await new Promise((resolve, reject) => {
                    jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }, (err, decoded) => {
                        if (err) {
                            reject(new Error('Token verification failed'));
                        } else {
                            resolve(decoded);
                        }
                    });
                });
            } else if (alg === 'RS256') {
                const signingKey = await getKey(decodedToken.header);
                verifiedToken = await new Promise((resolve, reject) => {
                    jwt.verify(token, signingKey, { algorithms: ['RS256'] }, (err, decoded) => {
                        if (err) {
                            reject(new Error('Token verification failed'));
                        } else {
                            resolve(decoded);
                        }
                    });
                });
            } else {
                throw new Error('Unsupported JWT algorithm');
            }

            // Acquire the token using MSAL
            const result = await pca.acquireTokenByClientCredential({
                scopes: ['https://management.azure.com/.default'],
            });

            context.log(`Token acquisition result: ${JSON.stringify(result)}`);

            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ accessToken: result.accessToken }), // Ensure body is JSON string
            };
        } catch (error) {
            context.log(`Error acquiring token: ${error.message}`);
            return {
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ error: error.message }), // Ensure body is JSON string
            };
        }
    },
});







