require('dotenv').config(); // Load environment variables
const jwt = require('jsonwebtoken');

const combinedMiddleware = (req, res, next) => {
    const authHeader = req.header('Authorization');
    console.log('Authorization Header:', authHeader); // Log the Authorization header

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('Missing or invalid Authorization header');
        return res.status(401).json({ error: 'Authorization token is required' });
    }

    const token = authHeader.split(' ')[1]; // Extract token
    console.log('Extracted Token:', token); // Log extracted token

    try {
        let decodedToken;
        let source;

        try {
            decodedToken = jwt.verify(token, process.env.JWT_SIGNUP_SECRET); // Signup secret
            source = 'signup';
        } catch (signupErr) {
            console.warn('Signup token verification failed, trying login secret...');
            decodedToken = jwt.verify(token, process.env.JWT_LOGIN_SECRET); // Login secret
            source = 'login';
        }

        console.log('Decoded Token:', decodedToken); // Log decoded token
        console.log('Token Source:', source); // Log token source

        // Correctly assign user ID
        req.userId = decodedToken.id || decodedToken.userId; // Handle both cases
        req.tokenSource = source;

        next(); // Proceed to next middleware or route
    } catch (err) {
        console.error('Token verification failed:', err.message); // Log token error
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = combinedMiddleware;
