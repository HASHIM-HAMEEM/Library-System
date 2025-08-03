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
        <div className="p-6 rounded-lg" style={{backgroundColor: '#18181b'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Admins</p>
              <p className="text-2xl font-bold text-white">{stats.totalAdmins}</p>
            </div>
            <div className="p-3 bg-gray-800 rounded-full">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-white font-medium">Active</span>
            <span className="text-gray-400 ml-1">system users</span>
          </div>
        </div>

        <div className="p-6 rounded-lg" style={{backgroundColor: '#18181b'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">System Uptime</p>
              <p className="text-2xl font-bold text-white">{stats.systemUptime}%</p>
            </div>
            <div className="p-3 bg-gray-800 rounded-full">
              <Activity className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-400">Status:</span>
            <span className="text-white font-medium ml-1">Healthy</span>
          </div>
        </div>

        <div className="p-6 rounded-lg" style={{backgroundColor: '#18181b'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Active Users</p>
              <p className="text-2xl font-bold text-white">{stats.activeUsers}</p>
            </div>
            <div className="p-3 bg-gray-800 rounded-full">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-white font-medium">Online</span>
            <span className="text-gray-400 ml-1">right now</span>
          </div>
        </div>

        <div className="p-6 rounded-lg" style={{backgroundColor: '#18181b'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Today's Logins</p>
              <p className="text-2xl font-bold text-white">{stats.todayLogins}</p>
            </div>
            <div className="p-3 bg-gray-800 rounded-full">
              <QrCode className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-white font-medium">Secure</span>
            <span className="text-gray-400 ml-1">access only</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-6 rounded-lg mb-6" style={{backgroundColor: '#18181b'}}>
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Removed duplicate “Add Admin” action — admins are managed from Admin Management */}
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
            style={{backgroundColor: '#18181b'}}
            className="flex items-center gap-3 p-4 rounded-lg hover:opacity-80 transition-opacity"
          >
            <div className="p-2 bg-black rounded-lg">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="font-medium text-white">Export Data</div>
              <div className="text-sm text-gray-400">Download attendance</div>
            </div>
          </button>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visits Chart */}
        <div className="p-6 rounded-lg" style={{backgroundColor: '#18181b'}}>
          <h3 className="text-lg font-semibold text-white mb-4">Daily Visits</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#000000',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF'
                }}
              />
              <Line type="monotone" dataKey="visits" stroke="#FFFFFF" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Subscription Breakdown */}
        <div className="p-6 rounded-lg" style={{backgroundColor: '#18181b'}}>
          <h3 className="text-lg font-semibold text-white mb-4">Subscription Types</h3>
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
                  backgroundColor: '#000000',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF'
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