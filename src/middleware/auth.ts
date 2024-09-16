import jwksClient, { RsaSigningKey, SigningKey } from 'jwks-rsa';
import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload, JwtHeader } from 'jsonwebtoken';

// Environment variables
const userPoolId = process.env.USER_POOL_ID;
const region = process.env.AWS_REGION;
const audience = process.env.APP_CLIENT_ID;

if (!userPoolId || !region || !audience) {
  throw new Error('Missing required environment variables for authentication');
}

// Configure JWKS client to fetch signing keys from Cognito
const client = jwksClient({
  jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
});

// Helper function to get the signing key
function getKey(header: JwtHeader, callback: (error: Error | null, signingKey?: string) => void) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
    } else {
      const signingKey = (key as RsaSigningKey).getPublicKey();
      callback(null, signingKey);
    }
  });
}

// Middleware function to authenticate JWT
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expecting format "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: 'Missing token' });
  }

  jwt.verify(
    token,
    getKey,
    {
      algorithms: ['RS256'],
      audience: audience,
      issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
    },
    (err, decoded) => {
      if (err) {
        console.error('Token verification failed:', err);
        return res.status(403).json({ message: 'Invalid token' });
      }
      req.user = decoded as JwtPayload; // Add user to request object
      next();
    }
  );
}