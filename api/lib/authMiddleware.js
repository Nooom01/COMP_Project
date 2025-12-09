const jwt = require('jsonwebtoken');

function verifyToken(req) {
  let token = req.headers['x-auth-token'];

  if (!token) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return { error: 'No token, authorization denied', status: 401 };
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { user: decoded.user };
  } catch (err) {
    return { error: 'Token is not valid', status: 401 };
  }
}

module.exports = verifyToken;
