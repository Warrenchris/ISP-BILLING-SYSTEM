import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Snackbar, Alert, Typography, Box } from '@mui/material';
import { keyframes } from '@mui/system';

// Define custom animations for a "premium" feel
const glowAnimation = keyframes`
  0% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.2); }
  50% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.5); }
  100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.2); }
`;

const NotificationContext = createContext();

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [open, setOpen] = useState(false);
    const [messageInfo, setMessageInfo] = useState(undefined);
    const [snackPack, setSnackPack] = useState([]);
    const [hovering, setHovering] = useState(false);

    // Ref to store the current timer ID so we can pause/resume
    const timerRef = useRef(null);
    // Track remaining time if paused (default autoHideDuration is usually 6000ms)
    const remainingTimeRef = useRef(6000);
    const startTimeRef = useRef(Date.now());

    useEffect(() => {
        if (snackPack.length && !messageInfo) {
            // Set a new snack when we don't have an active one
            setMessageInfo({ ...snackPack[0] });
            setSnackPack((prev) => prev.slice(1));
            setOpen(true);
            remainingTimeRef.current = snackPack[0].autoHideDuration || 6000;
            startTimeRef.current = Date.now();
        } else if (snackPack.length && messageInfo && open) {
            // Close an active snack when a new one is added if needed, 
            // but standard Queue behavior is to wait until current one closes.
            // We'll let the current one finish unless we want to force next.
            // For now, let's stick to standard queue: wait for close.
        }
    }, [snackPack, messageInfo, open]);

    const notify = useCallback((message, severity = 'info', options = {}) => {
        const id = new Date().getTime() + Math.random();
        setSnackPack((prev) => [
            ...prev,
            { message, severity, key: id, ...options },
        ]);
    }, []);

    const notifySuccess = useCallback((message, options) => notify(message, 'success', options), [notify]);
    const notifyError = useCallback((message, options) => notify(message, 'error', options), [notify]);
    const notifyWarning = useCallback((message, options) => notify(message, 'warning', options), [notify]);
    const notifyInfo = useCallback((message, options) => notify(message, 'info', options), [notify]);

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setOpen(false);
    };

    const handleExited = () => {
        setMessageInfo(undefined);
    };

    const getAlertStyle = (severity) => {
        const baseStyle = {
            width: '100%',
            backdropFilter: 'blur(10px)',
            border: '1px solid',
            borderRadius: '12px',
            alignItems: 'center',
            '& .MuiAlert-icon': {
                fontSize: '24px',
            },
        };

        switch (severity) {
            case 'success':
                return {
                    ...baseStyle,
                    backgroundColor: 'rgba(20, 20, 20, 0.95)',
                    color: '#ffffff',
                    borderColor: 'rgba(34, 197, 94, 0.3)',
                    borderLeft: '4px solid #22c55e',
                    boxShadow: '0 4px 20px rgba(34, 197, 94, 0.15)',
                    animation: `${glowAnimation} 2s infinite ease-in-out`,
                    '& .MuiAlert-icon': { color: '#22c55e' },
                };
            case 'error':
                return {
                    ...baseStyle,
                    backgroundColor: 'rgba(20, 20, 20, 0.95)',
                    color: '#ffffff',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    borderLeft: '4px solid #ef4444',
                    boxShadow: '0 4px 20px rgba(239, 68, 68, 0.15)',
                    animation: `${glowAnimation} 2s infinite ease-in-out`,
                    '& .MuiAlert-icon': { color: '#ef4444' },
                };
            case 'warning':
                return {
                    ...baseStyle,
                    backgroundColor: 'rgba(20, 20, 20, 0.95)',
                    color: '#ffffff',
                    borderColor: 'rgba(234, 179, 8, 0.3)',
                    borderLeft: '4px solid #eab308',
                    boxShadow: '0 4px 20px rgba(234, 179, 8, 0.15)',
                    '& .MuiAlert-icon': { color: '#eab308' },
                };
            default: // info
                return {
                    ...baseStyle,
                    backgroundColor: 'rgba(20, 20, 20, 0.95)',
                    color: '#ffffff',
                    borderColor: 'rgba(59, 130, 246, 0.3)',
                    borderLeft: '4px solid #3b82f6',
                    boxShadow: '0 4px 20px rgba(59, 130, 246, 0.15)',
                    '& .MuiAlert-icon': { color: '#3b82f6' },
                };
        }
    };

    return (
        <NotificationContext.Provider
            value={{
                notify,
                notifySuccess,
                notifyError,
                notifyWarning,
                notifyInfo,
            }}
        >
            {children}
            <Snackbar
                key={messageInfo ? messageInfo.key : undefined}
                open={open}
                autoHideDuration={messageInfo ? (messageInfo.autoHideDuration || 6000) : 6000}
                onClose={handleClose}
                TransitionProps={{ onExited: handleExited }}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                sx={{ mt: 7 }} // Offset from top nav
            >
                <Alert
                    onClose={handleClose}
                    severity={messageInfo ? messageInfo.severity : 'info'}
                    sx={getAlertStyle(messageInfo ? messageInfo.severity : 'info')}
                    elevation={6}
                    variant="filled"
                >
                    {messageInfo ? (
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                {messageInfo.severity.charAt(0).toUpperCase() + messageInfo.severity.slice(1)}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.875rem' }}>
                                {messageInfo.message}
                            </Typography>
                        </Box>
                    ) : undefined}
                </Alert>
            </Snackbar>
        </NotificationContext.Provider>
    );
};
