export function buildQuery(params = {}) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '') continue;
        query.append(key, value);
    }
    return query.toString();
}

export default buildQuery;
