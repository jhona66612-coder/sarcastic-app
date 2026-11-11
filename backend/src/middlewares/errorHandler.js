const PG_ERRORS = {
  '23505': [409, 'Registro duplicado'],
  '23503': [409, 'Referencia inválida: el registro relacionado no existe o está en uso'],
  '23514': [400, 'Los datos no cumplen una regla de validación'],
  '23502': [400, 'Falta un dato obligatorio'],
  '22P02': [400, 'Formato de dato inválido (por ejemplo, un UUID mal escrito)'],
  '22007': [400, 'Formato de fecha u hora inválido'],
  '22008': [400, 'Fecha u hora fuera de rango'],
};

function notFound(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.status) return res.status(err.status).json({ error: err.message });

  const known = PG_ERRORS[err.code];
  if (known) {
    return res.status(known[0]).json({ error: known[1], detalle: err.detail || err.message });
  }

  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}

module.exports = { notFound, errorHandler };
