"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.optionalAuthenticate = optionalAuthenticate;
exports.requireRole = requireRole;
const authService_1 = require("../services/authService");
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required. Missing or invalid Bearer token.' });
    }
    const token = authHeader.split(' ')[1];
    const payload = (0, authService_1.verifyToken)(token);
    if (!payload) {
        return res.status(401).json({ error: 'Session expired or invalid token.' });
    }
    req.user = payload;
    next();
}
function optionalAuthenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const payload = (0, authService_1.verifyToken)(token);
        if (payload) {
            req.user = payload;
        }
    }
    next();
}
function requireRole(role) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }
        if (req.user.role !== role && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: `Forbidden: Requires ${role} privileges.` });
        }
        next();
    };
}
