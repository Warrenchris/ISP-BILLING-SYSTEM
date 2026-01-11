import { useState, useEffect, useCallback } from 'react';

const usePaginatedFetch = (fetchFunction, initialPage = 1, initialLimit = 10, initialParams = {}) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(initialPage);
    const [limit, setLimit] = useState(initialLimit);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Additional parameters (e.g., search, filters)
    const [params, setParams] = useState(initialParams);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchFunction({ page, limit, ...params });

            // Standardize response: look for common paginated structures
            // Expected: { data: [...], pagination: { total, pages, ... } }
            // Or: { data: { users: [...], pagination: {...} } }

            let items = [];
            let totalCount = 0;
            let totalPgs = 0;

            const resData = result.data || result; // Handle axios response vs direct data

            if (resData.data && Array.isArray(resData.data)) {
                items = resData.data;
            } else if (resData.data && resData.data.data) {
                // Nested data.data (common in some APIs)
                items = resData.data.data || [];
            } else if (resData.data && typeof resData.data === 'object') {
                // Look for array values in object
                const arrayKey = Object.keys(resData.data).find(k => Array.isArray(resData.data[k]));
                if (arrayKey) items = resData.data[arrayKey];
            } else if (Array.isArray(resData)) {
                items = resData;
            }

            // Extract pagination info
            const pagination = resData.pagination || resData.data?.pagination || {};
            totalCount = pagination.total || items.length;
            totalPgs = pagination.pages || Math.ceil(totalCount / limit);

            setData(items);
            setTotal(totalCount);
            setTotalPages(totalPgs);

        } catch (err) {
            console.error('Paginated fetch error:', err);
            setError(err.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    }, [fetchFunction, page, limit, params]);

    // Fetch on mount and when dependencies change
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handlePageChange = (newPage) => {
        setPage(newPage);
    };

    const handleLimitChange = (newLimit) => {
        setLimit(newLimit);
        setPage(1); // Reset to first page
    };

    const handleFilterChange = (newParams) => {
        setParams(prev => ({ ...prev, ...newParams }));
        setPage(1);
    };

    const refresh = () => {
        fetchData();
    };

    return {
        data,
        loading,
        error,
        page,
        limit,
        total,
        totalPages,
        setPage: handlePageChange,
        setLimit: handleLimitChange,
        setParams: handleFilterChange,
        refresh
    };
};

export default usePaginatedFetch;
