import { useState, useEffect, useCallback, useRef } from 'react';
import { supportService } from '../services/supportService';

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
                const [cats, pris, stats, cfg, staffRes] = await Promise.allSettled([
                    supportService.getCategories(),
                    supportService.getPriorities(),
                    supportService.getStatuses(),
                    supportService.getLabelsConfig(),
                    supportService.getStaff(),
                ]);

                if (cancelled) return;

                if (cats.status   === 'fulfilled') setCategories(cats.value.data?.data   || []);
                if (pris.status   === 'fulfilled') setPriorities(pris.value.data?.data   || []);
                if (stats.status  === 'fulfilled') setStatuses(stats.value.data?.data    || []);
                if (cfg.status    === 'fulfilled') setLabelsConfig(cfg.value.data?.data  || { statuses: {}, priorities: {} });
                if (staffRes.status === 'fulfilled') setStaff(staffRes.value.data?.data  || []);
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
