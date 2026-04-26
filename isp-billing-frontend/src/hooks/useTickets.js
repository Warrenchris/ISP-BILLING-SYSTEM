import { useState, useEffect, useCallback, useRef } from 'react';
import { supportService } from '../services/supportService';
import { useAuth } from '../contexts/AuthContext';

/**
 * useTickets({ search, filters, page, limit })
 *
 * Encapsulates all fetch logic, loading, error, and pagination state for the
 * Support Tickets page.  Also fetches label config, categories, priorities,
 * statuses, and staff once on mount so the page never has to know about those
 * individual API calls.
 */
const useTickets = ({ search = '', filters = {}, page = 1, limit = 20 } = {}) => {
    // ─── Tickets list state ───────────────────────────────────────────────────
    const [tickets, setTickets]         = useState([]);
    const [loading, setLoading]         = useState(false);
    const [error, setError]             = useState(null);
    const [pagination, setPagination]   = useState({ page: 1, limit, total: 0, pages: 0 });

    // ─── Metadata state ───────────────────────────────────────────────────────
    const [categories,   setCategories]   = useState([]);
    const [priorities,   setPriorities]   = useState([]);
    const [statuses,     setStatuses]     = useState([]);
    const [staff,        setStaff]        = useState([]);
    const [labelsConfig, setLabelsConfig] = useState({ statuses: {}, priorities: {} });
    const [metaLoading,  setMetaLoading]  = useState(false);
    
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    // Prevent stale-closure issues when refresh() is called externally
    const abortRef = useRef(null);

    // ─── Fetch tickets ────────────────────────────────────────────────────────
    const fetchTickets = useCallback(async () => {
        // Cancel any in-flight request
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        setLoading(true);
        setError(null);

        try {
            const params = {
                search:     search || undefined,
                page,
                limit,
                ...filters };

            const response = await supportService.getAll(params);
            const { data, pagination: pg } = response.data;

            setTickets(data || []);
            if (pg) setPagination(pg);
        } catch (err) {
            if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
            const msg = err.response?.data?.message || err.message || 'Failed to load tickets';
            setError(msg);
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, page, limit, JSON.stringify(filters)]);

    // Re-fetch whenever search / page / filters change
    useEffect(() => {
        fetchTickets();
        return () => { if (abortRef.current) abortRef.current.abort(); };
    }, [fetchTickets]);

    // ─── Fetch metadata once on mount ─────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        const loadMeta = async () => {
            setMetaLoading(true);
            try {
                const promises = [
                    supportService.getCategories(),
                    supportService.getPriorities(),
                    supportService.getStatuses(),
                    supportService.getLabelsConfig()
                ];
                if (isAdmin) {
                    promises.push(supportService.getStaff());
                }

                const results = await Promise.allSettled(promises);

                if (cancelled) return;

                if (results[0].status === 'fulfilled') setCategories(results[0].value.data?.data || []);
                if (results[1].status === 'fulfilled') setPriorities(results[1].value.data?.data || []);
                if (results[2].status === 'fulfilled') setStatuses(results[2].value.data?.data || []);
                if (results[3].status === 'fulfilled') setLabelsConfig(results[3].value.data?.data || { statuses: {}, priorities: {} });
                
                if (isAdmin && results[4]?.status === 'fulfilled') {
                    setStaff(results[4].value.data?.data || []);
                }
            } catch (_) {
                // Metadata failures are non-fatal; the table still renders
            } finally {
                if (!cancelled) setMetaLoading(false);
            }
        };

        loadMeta();
        return () => { cancelled = true; };
    }, []);

    // ─── Public API ───────────────────────────────────────────────────────────
    return {
        // Ticket list
        tickets,
        loading,
        error,
        pagination,
        refresh: fetchTickets,

        // Metadata
        categories,
        priorities,
        statuses,
        staff,
        labelsConfig,
        metaLoading };
};

export default useTickets;
