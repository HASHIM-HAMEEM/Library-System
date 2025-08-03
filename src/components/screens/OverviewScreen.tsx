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
        <div className="p-6 rounded-lg" style={{backgroundColor: 'var(--bg-secondary)'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>Total Admins</p>
              <p className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{stats.totalAdmins}</p>
            </div>
            <div className="p-3 rounded-full" style={{backgroundColor: 'var(--bg-tertiary)'}}>
              <Users className="w-6 h-6" style={{color: 'var(--text-primary)'}} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="font-medium" style={{color: 'var(--text-primary)'}}>Active</span>
            <span className="ml-1" style={{color: 'var(--text-secondary)'}}>system users</span>
          </div>
        </div>

        <div className="p-6 rounded-lg" style={{backgroundColor: 'var(--bg-secondary)'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>System Uptime</p>
              <p className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{stats.systemUptime}%</p>
            </div>
            <div className="p-3 rounded-full" style={{backgroundColor: 'var(--bg-tertiary)'}}>
              <Activity className="w-6 h-6" style={{color: 'var(--text-primary)'}} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span style={{color: 'var(--text-secondary)'}}>Status:</span>
            <span className="font-medium ml-1" style={{color: 'var(--text-primary)'}}>Healthy</span>
          </div>
        </div>

        <div className="p-6 rounded-lg" style={{backgroundColor: 'var(--bg-secondary)'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>Active Users</p>
              <p className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{stats.activeUsers}</p>
            </div>
            <div className="p-3 rounded-full" style={{backgroundColor: 'var(--bg-tertiary)'}}>
              <CreditCard className="w-6 h-6" style={{color: 'var(--text-primary)'}} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="font-medium" style={{color: 'var(--text-primary)'}}>Online</span>
            <span className="ml-1" style={{color: 'var(--text-secondary)'}}>right now</span>
          </div>
        </div>

        <div className="p-6 rounded-lg" style={{backgroundColor: 'var(--bg-secondary)'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>Today's Logins</p>
              <p className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{stats.todayLogins}</p>
            </div>
            <div className="p-3 rounded-full" style={{backgroundColor: 'var(--bg-tertiary)'}}>
              <QrCode className="w-6 h-6" style={{color: 'var(--text-primary)'}} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="font-medium" style={{color: 'var(--text-primary)'}}>Secure</span>
            <span className="ml-1" style={{color: 'var(--text-secondary)'}}>access only</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-6 rounded-lg mb-6" style={{backgroundColor: 'var(--bg-secondary)'}}>
        <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>Quick Actions</h3>
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
            style={{backgroundColor: 'var(--bg-secondary)'}}
            className="flex items-center gap-3 p-4 rounded-lg hover:opacity-80 transition-opacity"
          >
            <div className="p-2 rounded-lg" style={{backgroundColor: 'var(--bg-tertiary)'}}>
              <Download className="w-5 h-5" style={{color: 'var(--text-primary)'}} />
            </div>
            <div className="text-left">
              <div className="font-medium" style={{color: 'var(--text-primary)'}}>Export Data</div>
              <div className="text-sm" style={{color: 'var(--text-secondary)'}}>Download attendance</div>
            </div>
          </button>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visits Chart */}
        <div className="p-6 rounded-lg" style={{backgroundColor: 'var(--bg-secondary)'}}>
          <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>Daily Visits</h3>
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
        <div className="p-6 rounded-lg" style={{backgroundColor: 'var(--bg-secondary)'}}>
          <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>Subscription Types</h3>
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