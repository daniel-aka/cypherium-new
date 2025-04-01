const roles = (allowedRoles) => {
    return (req, res, next) => {
        try {
            if (req.isAdmin || allowedRoles.includes(req.user.role)) {
                next();
            } else {
                res.status(403).json({ message: 'Access denied: insufficient permissions' });
            }
        } catch (error) {
            res.status(500).json({ message: 'Role verification failed' });
        }
    };
};

module.exports = roles; 