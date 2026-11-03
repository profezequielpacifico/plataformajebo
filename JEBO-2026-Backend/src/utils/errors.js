const { HTTP_STATUS } = require('../constants');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Error de validación') {
    super(message, HTTP_STATUS.BAD_REQUEST);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(message, HTTP_STATUS.NOT_FOUND);
    this.name = 'NotFoundError';
  }
}

class BusinessError extends AppError {
  constructor(message = 'Conflicto en la operación') {
    super(message, HTTP_STATUS.CONFLICT);
    this.name = 'BusinessError';
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, HTTP_STATUS.UNAUTHORIZED);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Acción no permitida') {
    super(message, HTTP_STATUS.FORBIDDEN);
    this.name = 'ForbiddenError';
  }
}

class ForeignKeyError extends AppError {
  constructor(message = 'No se puede eliminar porque tiene registros asociados') {
    super(message, HTTP_STATUS.CONFLICT);
    this.name = 'ForeignKeyError';
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  BusinessError,
  UnauthorizedError,
  ForbiddenError,
  ForeignKeyError
};
