function normalizeDateInput(value) {
    if (typeof value !== 'string') return '';

    const trimmed = value.trim();

    return /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
        ? trimmed
        : '';
}

function buildDateRange(queryParams, options = {}) {
    const fromKey = options.fromKey || 'fromDate';
    const toKey = options.toKey || 'toDate';

    const fromDate = normalizeDateInput(queryParams[fromKey]);
    const toDate = normalizeDateInput(queryParams[toKey]);

    const range = {};

    if (fromDate) {
        const from = new Date(`${fromDate}T00:00:00.000+07:00`);
        if (!Number.isNaN(from.getTime())) {
            range.$gte = from;
        }
    }

    if (toDate) {
        const to = new Date(`${toDate}T23:59:59.999+07:00`);
        if (!Number.isNaN(to.getTime())) {
            range.$lte = to;
        }
    }

    return {
        fromDate,
        toDate,
        range
    };
}

function applyDateRangeFilter(query, queryParams, options = {}) {
    const field = options.field || 'createdAt';
    const dateRange = buildDateRange(queryParams, options);

    if (Object.keys(dateRange.range).length > 0) {
        query[field] = {
            ...(query[field] || {}),
            ...dateRange.range
        };
    }

    return dateRange;
}

function buildQueryString(queryParams, overrides = {}) {
    const params = new URLSearchParams();
    const merged = {
        ...queryParams,
        ...overrides
    };

    Object.keys(merged).forEach(key => {
        const value = merged[key];

        if (
            value === undefined
            ||
            value === null
            ||
            value === ''
        ) {
            return;
        }

        params.set(key, value);
    });

    return params.toString();
}

module.exports = {
    applyDateRangeFilter,
    buildQueryString
};
