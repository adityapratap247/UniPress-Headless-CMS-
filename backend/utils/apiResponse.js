const apiResponse = {
  success(res, data = {}, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({ success: true, message, data, timestamp: new Date().toISOString() });
  },
  created(res, data = {}, message = 'Created successfully') { return this.success(res, data, message, 201); },
  error(res, message = 'Internal server error', statusCode = 500, errors = null) {
    const body = { success: false, message, timestamp: new Date().toISOString() };
    if (errors) body.errors = errors;
    return res.status(statusCode).json(body);
  },
  notFound(res, message = 'Resource not found') { return this.error(res, message, 404); },
  unauthorized(res, message = 'Unauthorized') { return this.error(res, message, 401); },
  forbidden(res, message = 'Forbidden') { return this.error(res, message, 403); },
  badRequest(res, message = 'Bad request', errors = null) { return this.error(res, message, 400, errors); },
  paginated(res, data, pagination, message = 'Success') {
    return res.status(200).json({ success: true, message, data, pagination, timestamp: new Date().toISOString() });
  },
};
module.exports = apiResponse;
