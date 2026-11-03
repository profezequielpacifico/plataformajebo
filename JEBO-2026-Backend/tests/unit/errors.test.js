const {
  AppError,
  ValidationError,
  NotFoundError,
  BusinessError,
  UnauthorizedError,
  ForbiddenError
} = require('../../src/utils/errors');
const { HTTP_STATUS } = require('../../src/constants');

describe('Custom Errors', () => {
  it('AppError tiene propiedades correctas', () => {
    const err = new AppError('Test error', 400);
    expect(err.message).toBe('Test error');
    expect(err.statusCode).toBe(400);
    expect(err.isOperational).toBe(true);
  });

  it('ValidationError tiene status 400', () => {
    const err = new ValidationError();
    expect(err.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(err.name).toBe('ValidationError');
  });

  it('NotFoundError tiene status 404', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(HTTP_STATUS.NOT_FOUND);
  });

  it('BusinessError tiene status 409', () => {
    const err = new BusinessError();
    expect(err.statusCode).toBe(HTTP_STATUS.CONFLICT);
  });

  it('UnauthorizedError tiene status 401', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
  });

  it('ForbiddenError tiene status 403', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(HTTP_STATUS.FORBIDDEN);
  });
});
