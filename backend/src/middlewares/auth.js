const jwt = require('jsonwebtoken');

// Protege las rutas privadas: exige "Authorization: Bearer <token>"
module.exports = (req, res, next) => {
  const [type, token] = (req.headers.authorization || '').split(' ');
  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o vencido' });
  }
};
