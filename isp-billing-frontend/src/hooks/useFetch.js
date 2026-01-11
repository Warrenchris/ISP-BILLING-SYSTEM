import { useState, useEffect, useCallback } from 'react';

const useFetch = (fetchFunction, initialData = null, immediate = true) => {
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(immediate);
    const [error, setError] = useState(null);

    const execute = useCallback(async (...args) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetchFunction(...args);
            // Handle both { data: ... } and direct data responses
            const result = response.data?.data || response.data || response;
            setData(result);
            return result;
        } catch (err) {
            setError(err);
            return null;
        } finally {
            setLoading(false);
        }
    }, [fetchFunction]);

    useEffect(() => {
        if (immediate) {
            execute();
        }
    }, [execute, immediate]);

    return { data, loading, error, execute, setData };
};

export default useFetch;
