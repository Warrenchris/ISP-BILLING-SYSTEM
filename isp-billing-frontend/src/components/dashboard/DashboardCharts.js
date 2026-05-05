import React from 'react';
import { useTheme } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import CustomCard from '../common/CustomCard';

/** userGrowthHistory: [{ name|date: string, newUsers?: number, usageMB?: number }] */
const DashboardCharts = ({ userGrowthHistory = [], usageHistory = [], userStatusData }) => {
    const theme = useTheme();
    const growthSeries = Array.isArray(userGrowthHistory) && userGrowthHistory.length > 0
        ? userGrowthHistory
        : (Array.isArray(usageHistory) ? usageHistory : []);
    const samplePoint = growthSeries[0] || {};
    const xAxisKey = Object.prototype.hasOwnProperty.call(samplePoint, 'name') ? 'name' : 'date';
    const yAxisKey = Object.prototype.hasOwnProperty.call(samplePoint, 'newUsers') ? 'newUsers' : 'usageMB';

    const chartColors = [
        theme.palette.charts.blue,
        theme.palette.charts.green,
        theme.palette.charts.orange,
        theme.palette.charts.purple,
        theme.palette.charts.teal,
        theme.palette.charts.pink,
    ];

    const formatTick = (label) => {
        if (xAxisKey === 'name') return label || '';
        const dateStr = label;
        if (!dateStr) return '';
        const d = new Date(`${dateStr}T12:00:00`);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2">
                <CustomCard className="h-full">
                    <div className="p-6 sm:p-8">
                        <h6 className="text-lg font-bold text-white mb-6">User Growth Trend</h6>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={growthSeries}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
                                    <XAxis
                                        dataKey={xAxisKey}
                                        tickFormatter={formatTick}
                                        stroke={theme.palette.text.secondary}
                                        tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        stroke={theme.palette.text.secondary}
                                        tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey={yAxisKey}
                                        stroke={theme.palette.charts.blue}
                                        strokeWidth={3}
                                        dot={{ fill: theme.palette.charts.blue, strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6, stroke: theme.palette.charts.blue, strokeWidth: 4 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </CustomCard>
            </div>
            <div className="lg:col-span-1">
                <CustomCard className="h-full">
                    <div className="p-6 sm:p-8">
                        <h6 className="text-lg font-bold text-white mb-6">User Status Distribution</h6>
                        <div className="h-[250px] w-full relative flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={userStatusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {userStatusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-6 space-y-3">
                            {userStatusData.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: chartColors[index % chartColors.length] }}
                                        />
                                        <span className="text-sm text-gray-300 font-medium">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-bold text-white">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </CustomCard>
            </div>
        </div>
    );
};

export default DashboardCharts;
