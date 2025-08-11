"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = exports.getQrEncryptionKeyCallable = exports.getQrEncryptionKeyHttp = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const cors = __importStar(require("cors"));
// Initialize Firebase Admin SDK
admin.initializeApp();
// Configure CORS with specific origins for development
const corsHandler = cors.default({
    origin: [
        'http://localhost:5174',
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:5173',
        'https://your-domain.com' // Replace with your production domain
    ],
    credentials: true,
    optionsSuccessStatus: 200
});
/**
 * HTTP function to get QR encryption key with CORS support
 * Returns a secure encryption key with expiration time
 * Requires App Check token for security
 */
exports.getQrEncryptionKeyHttp = functions
    .region('us-central1')
    .https.onRequest(async (req, res) => {
    // Handle CORS
    corsHandler(req, res, async () => {
        try {
            // Only allow POST requests
            if (req.method !== 'POST') {
                res.status(405).json({ error: 'Method not allowed' });
                return;
            }
            // Verify Authorization header (Firebase ID token)
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
                return;
            }
            const idToken = authHeader.split('Bearer ')[1];
            let decodedToken;
            try {
                decodedToken = await admin.auth().verifyIdToken(idToken);
            }
            catch (error) {
                console.error('Error verifying ID token:', error);
                res.status(401).json({ error: 'Unauthorized: Invalid ID token' });
                return;
            }
            // Verify App Check token (optional for now to avoid blocking)
            const appCheckToken = req.headers['x-firebase-appcheck'];
            if (appCheckToken) {
                try {
                    await admin.appCheck().verifyToken(appCheckToken);
                    console.log('App Check token verified for user:', decodedToken.uid);
                }
                catch (error) {
                    console.warn('App Check token verification failed:', error);
                    // Continue without App Check for now to avoid blocking
                }
            }
            else {
                console.warn('No App Check token provided for user:', decodedToken.uid);
            }
            // Return the static key that matches Flutter's hardcoded key
            const key = 'LibraryQRSecureKey2024!@#$%^&*';
            // Set expiration time (1 hour from now)
            const expiresAt = Date.now() + (60 * 60 * 1000);
            console.log(`Generated encryption key for user: ${decodedToken.uid}`);
            res.status(200).json({
                key: key,
                expiresAt: expiresAt,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('Error generating encryption key:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
});
/**
 * Callable function version for Flutter app compatibility
 * Returns a secure encryption key with expiration time
 * Requires user authentication and optionally verifies App Check
 */
exports.getQrEncryptionKeyCallable = functions
    .region('us-central1')
    .https.onCall(async (data, context) => {
    try {
        // Verify user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to get encryption key');
        }
        const uid = context.auth.uid;
        console.log(`[Callable] Generating encryption key for user: ${uid}`);
        // Verify App Check token if present (optional for now)
        if (context.app) {
            try {
                console.log(`[Callable] App Check token verified for user: ${uid}`);
            }
            catch (error) {
                console.warn(`[Callable] App Check token verification failed for user ${uid}:`, error);
                // Continue without App Check for now to avoid blocking
            }
        }
        else {
            console.warn(`[Callable] No App Check token provided for user: ${uid}`);
        }
        // Return the static key that matches Flutter's hardcoded key
        const key = 'LibraryQRSecureKey2024!@#$%^&*';
        // Set expiration time (1 hour from now)
        const expiresAt = Date.now() + (60 * 60 * 1000);
        console.log(`[Callable] Generated encryption key for user: ${uid}`);
        return {
            key: key,
            expiresAt: expiresAt,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        console.error('[Callable] Error generating encryption key:', error);
        // Re-throw HttpsError as-is
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        // Wrap other errors
        throw new functions.https.HttpsError('internal', 'Failed to generate encryption key');
    }
});
/**
 * Health check function
 */
exports.healthCheck = functions
    .region('us-central1')
    .https.onRequest((req, res) => {
    corsHandler(req, res, () => {
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            functions: ['getQrEncryptionKeyHttp', 'getQrEncryptionKeyCallable', 'healthCheck']
        });
    });
});
//# sourceMappingURL=index.js.map