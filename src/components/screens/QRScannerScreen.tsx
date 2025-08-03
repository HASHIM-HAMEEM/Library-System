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
      
      // Mock data for today's logs since getScanLogs method doesn't exist
      const mockTodayLogs = {
        total: Math.floor(Math.random() * 50) + 20,
        logs: Array.from({ length: Math.floor(Math.random() * 30) + 10 }, (_, i) => ({
          user_id: `user_${i + 1}`,
          status: Math.random() > 0.5 ? 'entry' : 'exit',
          scan_time: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          duration: Math.random() > 0.7 ? `${Math.floor(Math.random() * 3)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:00` : null
        }))
      };

      // Calculate stats
      const totalScans = mockTodayLogs.total;
      const successfulScans = mockTodayLogs.logs.filter(log => log.status === 'entry' || log.status === 'exit').length;
      const successRate = totalScans > 0 ? Math.round((successfulScans / totalScans) * 100) : 95;
      
      // Get unique users who entered today
      const uniqueUsers = new Set(mockTodayLogs.logs.filter(log => log.status === 'entry').map(log => log.user_id));
      const activeUsers = uniqueUsers.size;
      
      // Calculate average session time
      const completedSessions = mockTodayLogs.logs.filter(log => log.duration);
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
        <h1 className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>QR Management System</h1>
        <button
          onClick={fetchDashboardStats}
          className="px-4 py-2 rounded-lg hover:opacity-80 transition-opacity"
          style={{backgroundColor: 'var(--accent-color)', color: 'var(--text-primary)'}}
        >
          Refresh Stats
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="rounded-lg p-6" style={{backgroundColor: 'var(--bg-secondary)'}}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{color: 'var(--text-secondary)'}}>{stat.title}</p>
            <p className="text-2xl font-bold mt-1" style={{color: 'var(--text-primary)'}}>
                    {isLoadingStats ? '...' : stat.value}
                  </p>
                  <p className="text-sm mt-1" style={{
                    color: stat.changeType === 'positive' ? 'var(--success-color)' : 'var(--error-color)'
                  }}>
                    {stat.change} from yesterday
                  </p>
                </div>
                <Icon className="w-8 h-8" style={{color: 'var(--text-secondary)'}} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab Navigation */}
      <div className="rounded-lg p-1" style={{backgroundColor: 'var(--bg-secondary)'}}>
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
                    ? 'hover:opacity-80 transition-opacity'
                    : 'hover:opacity-80 transition-opacity'
                }`}
                style={{
                  backgroundColor: activeTab === tab.id ? 'var(--accent-color)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    (e.target as HTMLElement).style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    (e.target as HTMLElement).style.color = 'var(--text-secondary)';
                  }
                }}
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