const ApiError = require('../utils/ApiError');

// validate(schema)            -> validates req.body
// validate(schema, 'query')   -> validates req.query
// Parsed (cleaned/coerced) values are stored back on req.body / req.validatedQuery
function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.') || source,
        message: i.message,
      }));
      throw ApiError.badRequest('Validation failed', details);
    }
    if (source === 'query') req.validatedQuery = result.data;
    else req[source] = result.data;
    next();
  };
}

module.exports = validate;
