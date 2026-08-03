import React from 'react';
import { alpha } from '@mui/material';
import CustomCard from './CustomCard';
import GrowthIndicator from './GrowthIndicator';

const StatCard = ({
    icon,
    title,
    value,
    subtitle,
    color = '#DDA15E',
    trend,
}) => {
    return (
        <CustomCard>
            <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-text-secondary mb-1.5">
                            {title}
                        </p>
                        <h4 className="text-2xl font-semibold tracking-tight text-text-primary">
                            {value}
                        </h4>
                    </div>
                    <div
                        className="flex items-center justify-center w-10 h-10 rounded-xl"
                        style={{
                            backgroundColor: alpha(color, 0.08),
                            color: color }}
                    >
                        {React.cloneElement(icon, { sx: { fontSize: 20, color: 'inherit' } })}
                    </div>
                </div>

                {(subtitle || trend !== undefined) && (
                    <div className="flex items-center gap-2 flex-wrap">
                        {trend !== undefined && (
                            <GrowthIndicator value={trend} />
                        )}
                        {subtitle && (
                            <span className="text-xs text-text-secondary">
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
