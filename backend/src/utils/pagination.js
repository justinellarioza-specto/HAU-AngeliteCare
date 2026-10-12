function getPagination(query, defaultLimit = 20, maxLimit = 100) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

function paged(items, total, { page, limit }) {
  return {
    data: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

// Escape user input before using it inside a RegExp search
function escapeRegex(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { getPagination, paged, escapeRegex };
