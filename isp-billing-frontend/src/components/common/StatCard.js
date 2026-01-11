import React from 'react';
import { Typography, alpha } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import CustomCard from './CustomCard';

const StatCard = ({
    icon,
    title,
    value,
    subtitle,
    color = 'primary.main', // Default to Primary Yellow
    trend,
    trendLabel
}) => {
    return (
        <CustomCard>
            <div className="p-6 pb-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                            {title}
                        </p>
                        <h4 className="text-2xl font-bold tracking-tight text-white">
                            {value}
                        </h4>
                    </div>
                    <div
                        className="flex items-center justify-center w-12 h-12 rounded-xl"
                        style={{
                            backgroundColor: alpha(color, 0.15),
                            color: color,
                        }}
                    >
                        {React.cloneElement(icon, { sx: { fontSize: 24, color: 'inherit' } })}
                    </div>
                </div>

                {(subtitle || trend !== undefined) && (
                    <div className="flex items-center gap-2">
                        {trend !== undefined && (
                            <div
                                className={`flex items-center px-1.5 py-0.5 rounded-md text-xs font-bold ${trend > 0 ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'
                                    }`}
                            >
                                {trend > 0 ? (
                                    <TrendingUp sx={{ fontSize: 16, mr: 0.5 }} />
                                ) : (
                                    <TrendingDown sx={{ fontSize: 16, mr: 0.5 }} />
                                )}
                                {Math.abs(trend)}%
                            </div>
                        )}
                        {subtitle && (
                            <span className="text-sm text-gray-400">
                                {subtitle}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </CustomCard>
    );
};

export default StatCard;
