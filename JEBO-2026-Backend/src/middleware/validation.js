const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

const validate = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    return next(new ValidationError(messages.join('. ')));
  }
  next();
};

module.exports = { validate };
