import React, { useEffect } from 'react';
import { Users, Activity, CreditCard, QrCode, UserPlus, Download } from 'lucide-react';
import { DashboardStats, AnalyticsData, SubscriptionBreakdown } from '../../types/dashboard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useLogger } from '../../hooks/useLogger';

interface OverviewScreenProps {
  stats: DashboardStats;
  analyticsData: AnalyticsData[];
  subscriptionBreakdown: SubscriptionBreakdown[];
  setShowVerificationPanel: (show: boolean) => void;
  exportAttendance: () => void;
}

const OverviewScreen: React.FC<OverviewScreenProps> = ({
  stats,
  analyticsData,
  subscriptionBreakdown,
  setShowVerificationPanel,
  exportAttendance
}) => {
  console.log('🔍 OverviewScreen: Component rendering with props:', {
    stats,
    analyticsDataLength: analyticsData?.length,
    subscriptionBreakdownLength: subscriptionBreakdown?.length
  });
  
  // Initialize logging hooks
  const { logClick, logAction, logInfo, logUserInteraction } = useLogger('OverviewScreen');
  
  // Log component mount
  useEffect(() => {
    console.log('🔍 OverviewScreen: Component mounted');
    logInfo('OverviewScreen mounted', { 
      statsLoaded: !!stats,
      analyticsDataCount: analyticsData?.length || 0,
      subscriptionBreakdownCount: subscriptionBreakdown?.length || 0
    });
  }, [logInfo]);
  
  // Log stats updates
  useEffect(() => {
    logAction('stats_updated', { stats });
  }, [stats, logAction]);
  
  console.log('🔍 OverviewScreen: About to return JSX');
  return (
    <>
      {/* Dashboard Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="p-6 rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Admins</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalAdmins}</p>
            </div>
            <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800">
              <Users className="w-6 h-6 text-gray-900 dark:text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="font-medium text-gray-900 dark:text-white">Active</span>
            <span className="ml-1 text-gray-700 dark:text-gray-300">system users</span>
          </div>
        </div>

        <div className="p-6 rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">System Uptime</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.systemUptime}%</p>
            </div>
            <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800">
              <Activity className="w-6 h-6 text-gray-900 dark:text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-700 dark:text-gray-300">Status:</span>
            <span className="font-medium ml-1 text-gray-900 dark:text-white">Healthy</span>
          </div>
        </div>

        <div className="p-6 rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeUsers}</p>
            </div>
            <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800">
              <CreditCard className="w-6 h-6 text-gray-900 dark:text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="font-medium text-gray-900 dark:text-white">Online</span>
            <span className="ml-1 text-gray-700 dark:text-gray-300">right now</span>
          </div>
        </div>

        <div className="p-6 rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Today's Logins</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.todayLogins}</p>
            </div>
            <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800">
              <QrCode className="w-6 h-6 text-gray-900 dark:text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="font-medium text-gray-900 dark:text-white">Secure</span>
            <span className="ml-1 text-gray-700 dark:text-gray-300">access only</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-6 rounded-lg mb-6 bg-white dark:bg-black border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Removed duplicate "Add Admin" action — admins are managed from Admin Management */}
          <button
            onClick={() => {
              logClick('export_attendance_quick_action');
              logUserInteraction('data_export', 'quick_action', {
                action: 'export_attendance_click',
                source: 'overview_screen'
              });
              logAction('attendance_export_initiated', { source: 'quick_actions' });
              exportAttendance();
            }}
            className="flex items-center gap-3 p-4 rounded-lg hover:opacity-80 transition-opacity bg-white dark:bg-black border border-gray-200 dark:border-gray-700"
          >
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <Download className="w-5 h-5 text-gray-900 dark:text-white" />
            </div>
            <div className="text-left">
              <div className="font-medium text-gray-900 dark:text-white">Export Data</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">Download attendance</div>
            </div>
          </button>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visits Chart */}
        <div className="p-6 rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Daily Visits</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-primary)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'var(--text-primary)'
                }}
              />
              <Line type="monotone" dataKey="visits" stroke="#FFFFFF" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Subscription Breakdown */}
        <div className="p-6 rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Subscription Types</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={subscriptionBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {subscriptionBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-primary)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'var(--text-primary)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
};

export default OverviewScreen;