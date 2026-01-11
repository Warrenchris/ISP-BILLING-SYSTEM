import React from 'react';
import { useTheme } from '@mui/material';

const CustomCard = ({ children, className = '', ...props }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
        <div
            className={`
                relative overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                rounded-2xl border
                ${isDark ? 'bg-background-paper border-white/10 hover:shadow-[0_12px_24px_rgba(0,0,0,0.5)]' : 'bg-white border-black/10 hover:shadow-[0_12px_24px_rgba(0,0,0,0.1)]'}
                hover:-translate-y-1 hover:border-primary
                ${className}
            `}
            {...props}
        >
            {children}
        </div>
    );
};

export default CustomCard;
