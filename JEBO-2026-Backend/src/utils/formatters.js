const formatDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString();
};

const formatResponse = (data, message = null) => {
  const response = { success: true, data };
  if (message) response.message = message;
  return response;
};

const formatPaginatedResponse = (data, total, page, limit) => {
  return {
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

const formatError = (message, errors = null) => {
  const response = { success: false, error: message };
  if (errors) response.errors = errors;
  return response;
};

module.exports = { formatDate, formatResponse, formatPaginatedResponse, formatError };
