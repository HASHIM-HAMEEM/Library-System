import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, Activity, QrCode, Calendar, Clock, CheckCircle, XCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';

interface DailyVisit {
  date: string;
  visits: number;
  entries: number;
  exits: number;
}

interface SubscriptionType {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface QRScanStat {
  date: string;
  successful: number;
  failed: number;
  total: number;
}

interface EntryTimeHeat {
  hour: number;
  count: number;
}

const AnalyticsScreen: React.FC = () => {
  const [dailyVisits, setDailyVisits] = useState<DailyVisit[]>([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [subscriptionTypes, setSubscriptionTypes] = useState<SubscriptionType[]>([]);
  const [totalVisits, setTotalVisits] = useState(0);
  const [uniqueUsers, setUniqueUsers] = useState(0);
  const [qrScanStats, setQrScanStats] = useState<QRScanStat[]>([]);
  const [entryTimeHeat, setEntryTimeHeat] = useState<EntryTimeHeat[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      await Promise.all([
        fetchDailyVisits(),
        fetchActiveUsers(),
        fetchSubscriptionTypes(),
        fetchVisitSummary(),
        fetchQRScanStats(),
        fetchEntryTimeHeat()
      ]);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch analytics data
  useEffect(() => {
    fetchAnalyticsData();
    const interval = setInterval(fetchAnalyticsData, 300000); // Changed from 30 seconds to 5 minutes
    return () => clearInterval(interval);
  }, []); // Empty dependency array to prevent infinite loops

  const fetchDailyVisits = async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // Fetch from scan_logs collection
      const scanLogsQuery = query(
        collection(db, 'scan_logs'),
        where('entry_time', '>=', Timestamp.fromDate(thirtyDaysAgo)),
        orderBy('entry_time', 'desc')
      );
      const scanSnapshot = await getDocs(scanLogsQuery);
      const scanData = scanSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      // Fetch from attendance_logs collection
      const attendanceLogsQuery = query(
        collection(db, 'attendance_logs'),
        where('entry_time', '>=', Timestamp.fromDate(thirtyDaysAgo)),
        orderBy('entry_time', 'desc')
      );
      const attendanceSnapshot = await getDocs(attendanceLogsQuery);
      const attendanceData = attendanceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      const visitsByDate: Record<string, { entries: number; exits: number }> = {};
      
      // Process scan_logs data
      scanData.forEach(log => {
        if (log.entry_time) {
          const entryTime = log.entry_time?.toDate ? log.entry_time.toDate() : new Date(log.entry_time);
          const date = entryTime.toISOString().split('T')[0];
          if (!visitsByDate[date]) visitsByDate[date] = { entries: 0, exits: 0 };
          visitsByDate[date].entries++;
          
          if (log.exit_time) {
            visitsByDate[date].exits++;
          }
        }
      });
      
      // Process attendance_logs data
      attendanceData.forEach(log => {
        if (log.entry_time) {
          const entryTime = log.entry_time?.toDate ? log.entry_time.toDate() : new Date(log.entry_time);
          const date = entryTime.toISOString().split('T')[0];
          if (!visitsByDate[date]) visitsByDate[date] = { entries: 0, exits: 0 };
          visitsByDate[date].entries++;
          
          if (log.exit_time) {
            visitsByDate[date].exits++;
          }
        }
      });
      
      const visits = Object.entries(visitsByDate)
        .map(([date, data]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          visits: data.entries,
          entries: data.entries,
          exits: data.exits
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setDailyVisits(visits.slice(-14)); // Last 14 days
    } catch (error) {
      console.error('Error fetching daily visits:', error);
      setDailyVisits([]);
    }
  };

  const fetchActiveUsers = async () => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Fetch from scan_logs collection - users currently inside (no exit time)
      const scanLogsQuery = query(
        collection(db, 'scan_logs'),
        where('entry_time', '>=', Timestamp.fromDate(twentyFourHoursAgo)),
        where('exit_time', '==', null)
      );
      const scanSnapshot = await getDocs(scanLogsQuery);
      const scanData = scanSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      // Fetch from attendance_logs collection - users currently inside (no exit time)
      const attendanceLogsQuery = query(
        collection(db, 'attendance_logs'),
        where('entry_time', '>=', Timestamp.fromDate(twentyFourHoursAgo)),
        where('exit_time', '==', null)
      );
      const attendanceSnapshot = await getDocs(attendanceLogsQuery);
      const attendanceData = attendanceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      const activeUserIds = new Set<string>();
      
      // Add users from scan_logs
      scanData.forEach(log => {
        if (log.user_id) {
          activeUserIds.add(log.user_id);
        }
      });
      
      // Add users from attendance_logs
      attendanceData.forEach(log => {
        if (log.user_id) {
          activeUserIds.add(log.user_id);
        }
      });
      
      setActiveUsers(activeUserIds.size);
    } catch (error) {
      console.error('Error fetching active users:', error);
      setActiveUsers(0);
    }
  };

  const fetchSubscriptionTypes = async () => {
    const userProfilesQuery = query(
      collection(db, 'user_profiles'),
      where('role', '==', 'student')
    );
    const snapshot = await getDocs(userProfilesQuery);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
    
    if (data) {
      const now = new Date();
      const active = data.filter(user => 
        user.subscription_status === 'active' && 
        user.subscription_end && 
        new Date(user.subscription_end) > now
      ).length;
      const expired = data.filter(user => 
        user.subscription_status === 'expired' || 
        (user.subscription_end && new Date(user.subscription_end) <= now)
      ).length;
      const inactive = data.filter(user => user.subscription_status === 'inactive').length;
      
      const total = active + expired + inactive;
      if (total > 0) {
        setSubscriptionTypes([
          { name: 'Active', count: active, percentage: (active / total) * 100, color: '#10B981' },
          { name: 'Expired', count: expired, percentage: (expired / total) * 100, color: '#EF4444' },
          { name: 'Inactive', count: inactive, percentage: (inactive / total) * 100, color: '#6B7280' }
        ]);
      }
    }
  };

  const fetchVisitSummary = async () => {
    try {
      // Fetch visits from scan_logs collection
      const scanLogsQuery = query(collection(db, 'scan_logs'));
      const scanSnapshot = await getDocs(scanLogsQuery);
      const allScanVisits = scanSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      const scanVisits = allScanVisits.filter(visit => visit.user_id);
      
      // Fetch visits from attendance_logs collection
      const attendanceLogsQuery = query(collection(db, 'attendance_logs'));
      const attendanceSnapshot = await getDocs(attendanceLogsQuery);
      const attendanceVisits = attendanceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      let totalVisitsCount = 0;
      const uniqueUserIds = new Set<string>();
      
      // Process scan_logs data
      totalVisitsCount += scanVisits.length;
      scanVisits.forEach(visit => {
        if (visit.user_id) {
          uniqueUserIds.add(visit.user_id);
        }
      });
      
      // Process attendance_logs data
      totalVisitsCount += attendanceVisits.length;
      attendanceVisits.forEach(visit => {
        if (visit.user_id) {
          uniqueUserIds.add(visit.user_id);
        }
      });
      
      setTotalVisits(totalVisitsCount);
      setUniqueUsers(uniqueUserIds.size);
    } catch (error) {
      console.error('Error fetching visit summary:', error);
      setTotalVisits(0);
      setUniqueUsers(0);
    }
  };

  const fetchQRScanStats = async () => {
    try {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      
      // Fetch from qr_scan_logs collection which has scan_result field
      const qrScanLogsQuery = query(
        collection(db, 'qr_scan_logs'),
        where('created_at', '>=', Timestamp.fromDate(fourteenDaysAgo))
      );
      const qrScanSnapshot = await getDocs(qrScanLogsQuery);
      const qrScanData = qrScanSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      // Also fetch from scan_logs collection which has status field
      const scanLogsQuery = query(
        collection(db, 'scan_logs'),
        where('entry_time', '>=', Timestamp.fromDate(fourteenDaysAgo))
      );
      const scanSnapshot = await getDocs(scanLogsQuery);
      const scanData = scanSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      const statsByDate: Record<string, { successful: number; failed: number }> = {};
      
      // Process qr_scan_logs data
      qrScanData.forEach(log => {
        const createdAt = log.created_at?.toDate ? log.created_at.toDate() : new Date(log.created_at);
        const date = createdAt.toISOString().split('T')[0];
        if (!statsByDate[date]) statsByDate[date] = { successful: 0, failed: 0 };
        
        if (log.scan_result === 'success') {
          statsByDate[date].successful++;
        } else if (['expired_subscription', 'invalid_token', 'expired_token'].includes(log.scan_result)) {
          statsByDate[date].failed++;
        }
      });
      
      // Process scan_logs data
      scanData.forEach(log => {
        const entryTime = log.entry_time?.toDate ? log.entry_time.toDate() : new Date(log.entry_time);
        const date = entryTime.toISOString().split('T')[0];
        if (!statsByDate[date]) statsByDate[date] = { successful: 0, failed: 0 };
        
        if (['entry', 'exit'].includes(log.status)) {
          statsByDate[date].successful++;
        } else if (['invalid', 'expired'].includes(log.status)) {
          statsByDate[date].failed++;
        }
      });
      
      const stats = Object.entries(statsByDate).map(([date, stats]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        successful: stats.successful,
        failed: stats.failed,
        total: stats.successful + stats.failed
      }));
      
      setQrScanStats(stats.slice(-7)); // Last 7 days
    } catch (error) {
      console.error('Error fetching QR scan stats:', error);
      setQrScanStats([]);
    }
  };

  const fetchEntryTimeHeat = async () => {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      // Fetch from scan_logs collection
      const scanLogsQuery = query(
        collection(db, 'scan_logs'),
        where('entry_time', '>=', Timestamp.fromDate(sevenDaysAgo))
      );
      const scanSnapshot = await getDocs(scanLogsQuery);
      const allScanData = scanSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      const scanData = allScanData.filter(log => log.entry_time);
      
      // Fetch from attendance_logs collection
      const attendanceLogsQuery = query(
        collection(db, 'attendance_logs'),
        where('entry_time', '>=', Timestamp.fromDate(sevenDaysAgo))
      );
      const attendanceSnapshot = await getDocs(attendanceLogsQuery);
      const attendanceData = attendanceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      const heatByHour: Record<number, number> = {};
      
      // Process scan_logs data
      scanData.forEach(log => {
        if (log.entry_time) {
          const entryTime = log.entry_time?.toDate ? log.entry_time.toDate() : new Date(log.entry_time);
          const hour = entryTime.getHours();
          heatByHour[hour] = (heatByHour[hour] || 0) + 1;
        }
      });
      
      // Process attendance_logs data
      attendanceData.forEach(log => {
        if (log.entry_time) {
          const entryTime = log.entry_time?.toDate ? log.entry_time.toDate() : new Date(log.entry_time);
          const hour = entryTime.getHours();
          heatByHour[hour] = (heatByHour[hour] || 0) + 1;
        }
      });
      
      const heat = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: heatByHour[hour] || 0
      }));
      
      setEntryTimeHeat(heat);
    } catch (error) {
      console.error('Error fetching entry time heat data:', error);
      setEntryTimeHeat(Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 })));
    }
  };

  const handleExportAnalytics = async (format: 'json' | 'csv') => {
    try {
      toast.info('Starting analytics export...');
      
      // Fetch all analytics data for export
      const [scanLogsSnapshot, attendanceLogsSnapshot, userProfilesSnapshot] = await Promise.all([
        getDocs(collection(db, 'scan_logs')),
        getDocs(collection(db, 'attendance_logs')),
        getDocs(collection(db, 'user_profiles'))
      ]);
      
      const scanLogsResult = { data: scanLogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) };
      const attendanceLogsResult = { data: attendanceLogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) };
      const userProfilesResult = { data: userProfilesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) };
      
      const exportData = {
        summary: {
          totalVisits,
          uniqueUsers,
          activeUsers,
          exportedAt: new Date().toISOString()
        },
        dailyVisits,
        subscriptionTypes,
        qrScanStats,
        entryTimeHeat,
        rawData: {
          scanLogs: scanLogsResult.data,
          attendanceLogs: attendanceLogsResult.data,
          userProfiles: userProfilesResult.data
        }
      };
      
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Convert to CSV format
        const csvData = [
          'Analytics Summary:',
          'Metric,Value',
          `Total Visits,${totalVisits}`,
          `Unique Users,${uniqueUsers}`,
          `Active Users,${activeUsers}`,
          `Export Date,${new Date().toISOString()}`,
          '',
          'Daily Visits:',
          'Date,Visits,Entries,Exits',
          ...dailyVisits.map(d => `${d.date},${d.visits},${d.entries},${d.exits}`),
          '',
          'Subscription Types:',
          'Type,Count,Percentage',
          ...subscriptionTypes.map(s => `${s.name},${s.count},${s.percentage}%`),
          '',
          'QR Scan Statistics:',
          'Date,Successful,Failed,Total',
          ...qrScanStats.map(q => `${q.date},${q.successful},${q.failed},${q.total}`),
          '',
          'Entry Time Heat Map:',
          'Hour,Count',
          ...entryTimeHeat.map(e => `${e.hour}:00,${e.count}`)
        ].join('\n');
        
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      toast.success(`Analytics exported successfully in ${format.toUpperCase()} format`);
    } catch (error) {
      console.error('Error exporting analytics:', error);
      toast.error('Failed to export analytics data');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading analytics...</div>
      </div>
    );
  }
  return (
    <>
      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Total Visits */}
        <div className="p-6 rounded-lg" style={{backgroundColor: '#18181b'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Visits</p>
              <p className="text-2xl font-bold text-white">{totalVisits.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-gray-800 rounded-full">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-400">All time recorded</span>
          </div>
        </div>

        {/* Unique Users */}
        <div className="p-6 rounded-lg" style={{backgroundColor: '#18181b'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Unique Users</p>
              <p className="text-2xl font-bold text-white">{uniqueUsers.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-gray-800 rounded-full">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-400">Total scanned users</span>
          </div>
        </div>

        {/* Active Users */}
        <div className="p-6 rounded-lg" style={{backgroundColor: '#18181b'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Active Users</p>
              <p className="text-2xl font-bold text-white">{activeUsers}</p>
            </div>
            <div className="p-3 bg-gray-800 rounded-full">
              <Activity className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span className="text-white font-medium">Currently in library</span>
          </div>
        </div>

        {/* QR Scans Today */}
        <div className="p-6 rounded-lg" style={{backgroundColor: '#18181b'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">QR Scans Today</p>
              <p className="text-2xl font-bold text-white">
                {qrScanStats.length > 0 ? qrScanStats[qrScanStats.length - 1]?.total || 0 : 0}
              </p>
            </div>
            <div className="p-3 bg-gray-800 rounded-full">
              <QrCode className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-white font-medium">
              {qrScanStats.length > 0 ? qrScanStats[qrScanStats.length - 1]?.successful || 0 : 0} successful
            </span>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="mb-6">
        <div className="p-4 rounded-lg" style={{backgroundColor: '#18181b'}}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Export Analytics Data</h3>
              <p className="text-sm text-gray-400">Download comprehensive analytics reports</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleExportAnalytics('json')}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export as JSON
              </button>
              <button
                onClick={() => handleExportAnalytics('csv')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export as CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Visits Chart */}
        <div className="p-6 rounded-lg" style={{backgroundColor: '#18181b'}}>
          <h3 className="text-lg font-semibold text-white mb-4">Daily Visits</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyVisits}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF'
                  }}
                  formatter={(value) => [value, 'Visits']}
                />
                <Area
                  type="monotone"
                  dataKey="visits"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  fill="#FFFFFF"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subscription Types Breakdown */}
        <div className="p-6 rounded-lg" style={{backgroundColor: '#18181b'}}>
          <h3 className="text-lg font-semibold text-white mb-4">Subscription Types</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subscriptionTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${percent.toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {subscriptionTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF'
                  }}
                  formatter={(value, name) => [value, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="mt-4 space-y-2">
            {subscriptionTypes.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm text-gray-300">{item.name}</span>
                </div>
                <div className="text-sm text-gray-400">
                  {item.count} users
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* QR Scan Statistics */}
        <div className="p-6 rounded-lg" style={{backgroundColor: '#18181b'}}>
          <h3 className="text-lg font-semibold text-white mb-4">QR Scan Statistics</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={qrScanStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF'
                  }}
                />
                <Bar dataKey="successful" fill="#10B981" name="Successful" />
                <Bar dataKey="failed" fill="#EF4444" name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Entry Time Heatmap */}
        <div className="p-6 rounded-lg" style={{backgroundColor: '#18181b'}}>
          <h3 className="text-lg font-semibold text-white mb-4">Peak Entry Times</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={entryTimeHeat}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="hour" 
                  stroke="#9CA3AF" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}:00`}
                />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF'
                  }}
                  labelFormatter={(value) => `${value}:00 - ${value + 1}:00`}
                  formatter={(value) => [value, 'Entries']}
                />
                <Bar 
                  dataKey="count" 
                  fill="#FFFFFF" 
                  name="Entries"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
};

export default AnalyticsScreen;