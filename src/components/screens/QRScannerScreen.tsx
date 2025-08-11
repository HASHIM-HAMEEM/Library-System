import React, { useState, useEffect } from 'react';
import { QrCode, Users, Clock, TrendingUp, Camera } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
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

interface ScanLogData {
  id: string;
  user_id?: string;
  entry_time?: string;
  exit_time?: string;
  scan_type?: 'entry' | 'exit';
  status?: string;
  created_at?: any;
  updated_at?: any;
  verified_by?: string;
  location?: string;
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
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      // Fetch today's scan logs from Firebase
      const scanLogsQuery = query(
        collection(db, 'scan_logs'),
        where('created_at', '>=', Timestamp.fromDate(startOfDay)),
        where('created_at', '<', Timestamp.fromDate(endOfDay))
      );
      
      const scanLogsSnapshot = await getDocs(scanLogsQuery);
      const todayLogs = scanLogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ScanLogData[];
      
      // Calculate total scans today
      const totalScans = todayLogs.length;
      
      // Calculate success rate (successful scans vs total attempts)
      const successfulScans = todayLogs.filter(log => 
        log.status === 'entry' || log.status === 'exit' || log.scan_type === 'entry' || log.scan_type === 'exit'
      ).length;
      const successRate = totalScans > 0 ? Math.round((successfulScans / totalScans) * 100) : 100;
      
      // Get active users (users currently inside - have entry but no exit)
      const currentlyInsideQuery = query(
        collection(db, 'scan_logs'),
        where('scan_type', '==', 'entry'),
        where('exit_time', '==', null)
      );
      const currentlyInsideSnapshot = await getDocs(currentlyInsideQuery);
      const activeUsers = currentlyInsideSnapshot.size;
      
      // Calculate average session time from completed sessions today
      const completedSessions = todayLogs.filter(log => 
        log.entry_time && log.exit_time
      );
      
      let avgMinutes = 0;
      if (completedSessions.length > 0) {
        const totalMinutes = completedSessions.reduce((sum, log) => {
          const entryTime = new Date(log.entry_time);
          const exitTime = new Date(log.exit_time);
          const sessionMinutes = (exitTime.getTime() - entryTime.getTime()) / (1000 * 60);
          return sum + sessionMinutes;
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
      // Set fallback values in case of error
      setStats({
        totalScansToday: 0,
        activeUsers: 0,
        avgSessionTime: '0m',
        successRate: 0
      });
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">QR Management System</h1>
        <button
          onClick={fetchDashboardStats}
          className="px-4 py-2 rounded-lg hover:opacity-80 transition-opacity bg-gray-900 text-white dark:bg-white dark:text-black"
        >Refresh Stats</button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="rounded-lg p-6 bg-transparent border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{stat.title}</p>
            <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                    {isLoadingStats ? '...' : stat.value}
                  </p>
                  <p className={`text-sm mt-1 ${
                    stat.changeType === 'positive' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {stat.change} from yesterday
                  </p>
                </div>
                <Icon className="w-8 h-8 text-gray-700 dark:text-gray-300" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab Navigation */}
      <div className="rounded-lg p-1 bg-transparent border border-gray-200 dark:border-gray-700">
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
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors border border-gray-200 dark:border-gray-700 ${
                  activeTab === tab.id
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-black'
                    : 'bg-transparent text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
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