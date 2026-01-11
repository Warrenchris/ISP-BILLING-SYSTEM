import axios from 'axios';

// Create Axios instance
const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || "http://localhost:3000/api",
    timeout: 10000,
    headers: {
        "Content-Type": "application/json"
    }
});

// Request Interceptor
api.interceptors.request.use(
    (config) => {
        // Add cache-buster to query params
        config.params = { ...(config.params || {}), _t: Date.now() };

        // Get token from local storage
        const token = localStorage.getItem('token') ||
            localStorage.getItem('authToken') ||
            localStorage.getItem('accessToken');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
            // Clear storage
            localStorage.clear();

            // Redirect using window.location for full reload and auth guard trigger
            // Only redirect if not already on login page to avoid loops
            if (!window.location.pathname.includes('/login')) {
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export default api;
