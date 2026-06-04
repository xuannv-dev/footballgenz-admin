function toIsoDate(value) {
    if (typeof value !== 'string') return '';

    const trimmed = value.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
    }

    const displayMatch =
        trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    if (!displayMatch) return '';

    const day = displayMatch[1];
    const month = displayMatch[2];
    const year = displayMatch[3];
    const isoDate = `${year}-${month}-${day}`;
    const date = new Date(`${isoDate}T00:00:00.000+07:00`);

    if (Number.isNaN(date.getTime())) return '';

    if (
        date.getFullYear() !== Number(year)
        ||
        date.getMonth() + 1 !== Number(month)
        ||
        date.getDate() !== Number(day)
    ) {
        return '';
    }

    return isoDate;
}

function toDisplayDate(value) {
    const isoDate = toIsoDate(value);

    if (!isoDate) return '';

    const [year, month, day] = isoDate.split('-');

    return `${day}/${month}/${year}`;
}

function buildDateRange(queryParams, options = {}) {
    const fromKey = options.fromKey || 'fromDate';
    const toKey = options.toKey || 'toDate';

    const fromIsoDate = toIsoDate(queryParams[fromKey]);
    const toIsoDateValue = toIsoDate(queryParams[toKey]);
    const hasInvalidDate =
        Boolean(queryParams[fromKey])
        &&
        !fromIsoDate
        ||
        Boolean(queryParams[toKey])
        &&
        !toIsoDateValue;

    const from =
        fromIsoDate
            ? new Date(`${fromIsoDate}T00:00:00.000+07:00`)
            : null;

    const to =
        toIsoDateValue
            ? new Date(`${toIsoDateValue}T23:59:59.999+07:00`)
            : null;

    const isInvalidRange = Boolean(
        from
        &&
        to
        &&
        from.getTime() > to.getTime()
    );

    const range = {};

    if (from && !isInvalidRange) {
        if (!Number.isNaN(from.getTime())) {
            range.$gte = from;
        }
    }

    if (to && !isInvalidRange) {
        if (!Number.isNaN(to.getTime())) {
            range.$lte = to;
        }
    }

    return {
        fromDate: toDisplayDate(fromIsoDate),
        toDate: toDisplayDate(toIsoDateValue),
        hasInvalidDate,
        isInvalidRange,
        range
    };
}

function applyDateRangeFilter(query, queryParams, options = {}) {
    const field = options.field || 'createdAt';
    const dateRange = buildDateRange(queryParams, options);

    if (
        dateRange.hasInvalidDate
        ||
        dateRange.isInvalidRange
    ) {
        query._id = null;
        return dateRange;
    }

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
