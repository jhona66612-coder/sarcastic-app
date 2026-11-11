class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Verifica que existan los campos obligatorios en el cuerpo de la solicitud
function required(body, fields) {
  const missing = fields.filter(
    (f) => body[f] === undefined || body[f] === null || body[f] === ''
  );
  if (missing.length) {
    throw new HttpError(400, `Faltan campos obligatorios: ${missing.join(', ')}`);
  }
}

// Paginación: ?page=1&limit=20
function paginate(req, defaultLimit = 20) {
  const limit = Math.min(parseInt(req.query.limit, 10) || defaultLimit, 100);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  return { limit, offset: (page - 1) * limit };
}

// Convierte un objeto a JSON para columnas jsonb (undefined = no cambiar)
const toJson = (v) => (v === undefined ? null : JSON.stringify(v));

// "Hoy" en la zona horaria de Bolivia
const TODAY_SQL = "(now() at time zone 'America/La_Paz')::date";

module.exports = { HttpError, required, paginate, toJson, TODAY_SQL };
