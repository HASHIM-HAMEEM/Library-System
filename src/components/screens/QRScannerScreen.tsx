import React, { useState, useEffect } from 'react';
import { QrCode, Camera, Users, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import QRScanner from '../QRScanner';
import QRGenerator from '../QRGenerator';
import EntryExitLogs from '../EntryExitLogs';
import { qrCodeService } from '../../lib/qrCodeService';

interface DashboardStats {
  totalScansToday: number;
  activeUsers: number;
  avgSessionTime: string;
  successRate: number;
}

const QRScannerScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scanner' | 'generator' | 'logs'>('scanner');
  const [stats, setStats] = useState<DashboardStats>({
    totalScansToday: 0,
    activeUsers: 0,
    avgSessionTime: '0h',
    successRate: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setIsLoadingStats(true);
      
      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
      
      // Fetch today's logs
      const todayLogs = await qrCodeService.getScanLogs({
        dateFrom: startOfDay,
        dateTo: endOfDay,
        limit: 1000
      });

      // Calculate stats
      const totalScans = todayLogs.total;
      const successfulScans = todayLogs.logs.filter(log => log.status === 'entry' || log.status === 'exit').length;
      const successRate = totalScans > 0 ? Math.round((successfulScans / totalScans) * 100) : 0;
      
      // Get unique users who entered today
      const uniqueUsers = new Set(todayLogs.logs.filter(log => log.status === 'entry').map(log => log.user_id));
      const activeUsers = uniqueUsers.size;
      
      // Calculate average session time
      const completedSessions = todayLogs.logs.filter(log => log.duration);
      let avgMinutes = 0;
      if (completedSessions.length > 0) {
        const totalMinutes = completedSessions.reduce((sum, log) => {
          if (log.duration) {
            const match = log.duration.match(/(\d+):(\d+):(\d+)/);
            if (match) {
              const [, hours, minutes] = match;
              return sum + (parseInt(hours) * 60) + parseInt(minutes);
            }
          }
          return sum;
        }, 0);
        avgMinutes = Math.round(totalMinutes / completedSessions.length);
      }
      
      const avgSessionTime = avgMinutes > 60 
        ? `${Math.floor(avgMinutes / 60)}h ${avgMinutes % 60}m`
        : `${avgMinutes}m`;

      setStats({
        totalScansToday: totalScans,
        activeUsers,
        avgSessionTime,
        successRate
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const statsCards = [
    {
      title: 'Total Scans Today',
      value: stats.totalScansToday.toString(),
      icon: QrCode,
      change: '+12%',
      changeType: 'positive' as const
    },
    {
      title: 'Active Users',
      value: stats.activeUsers.toString(),
      icon: Users,
      change: '+5%',
      changeType: 'positive' as const
    },
    {
      title: 'Avg. Session Time',
      value: stats.avgSessionTime,
      icon: Clock,
      change: '+8%',
      changeType: 'positive' as const
    },
    {
      title: 'Success Rate',
      value: `${stats.successRate}%`,
      icon: TrendingUp,
      change: '+3%',
      changeType: 'positive' as const
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">QR Management System</h1>
        <button
          onClick={fetchDashboardStats}
          className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors"
        >
          Refresh Stats
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-[#18181b] rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{stat.title}</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {isLoadingStats ? '...' : stat.value}
                  </p>
                  <p className={`text-sm mt-1 ${
                    stat.changeType === 'positive' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {stat.change} from yesterday
                  </p>
                </div>
                <Icon className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab Navigation */}
      <div className="bg-[#18181b] rounded-lg p-1">
        <div className="flex space-x-1">
          {[
            { id: 'scanner', label: 'Live Scanner', icon: Camera },
            { id: 'generator', label: 'QR Generator', icon: QrCode },
            { id: 'logs', label: 'Entry/Exit Logs', icon: Clock }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'scanner' && (
          <QRScanner 
            onScanSuccess={(result) => {
              console.log('Scan successful:', result);
              // Refresh stats after successful scan
              fetchDashboardStats();
            }}
            onScanError={(error) => {
              console.error('Scan error:', error);
            }}
          />
        )}

        {activeTab === 'generator' && (
          <QRGenerator />
        )}

        {activeTab === 'logs' && (
          <EntryExitLogs />
        )}

      </div>
    </div>
  );
};

export default QRScannerScreen;