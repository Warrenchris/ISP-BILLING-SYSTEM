import api from './api';

export const authService = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (data) => api.post('/auth/register', data),

    getProfile: () => api.get('/auth/profile'),
    updateProfile: (data) => api.put('/auth/profile', data),
    changePassword: (data) => api.put('/auth/change-password', data),

    // Optional: Verify token validity
    verifyToken: () => api.get('/auth/verify'),
};
