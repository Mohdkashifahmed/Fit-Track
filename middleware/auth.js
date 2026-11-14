// Blocks the request unless the user has logged in (session cookie present).
function requireLogin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Please log in again' });
  }
  next();
}

module.exports = { requireLogin };
