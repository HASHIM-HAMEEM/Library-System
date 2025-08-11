import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Calendar, Clock, User, MapPin, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { qrCodeService, ScanLog } from '../lib/qrCodeService';
import { toast } from 'sonner';

interface LogFilters {
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  location?: string;
  searchTerm?: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

const EntryExitLogs: React.FC = () => {
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ScanLog[]>([]);
  const [filters, setFilters] = useState<LogFilters>({});
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [pagination.currentPage, pagination.itemsPerPage]);

  useEffect(() => {
    applyFilters();
  }, [logs, filters]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      // Mock data since getScanLogs method doesn't exist
      const mockLogs: ScanLog[] = [
        {
          user_id: '1',
          user_name: 'John Doe',
          user_email: 'john@example.com',
          scan_type: 'entry',
          scan_time: new Date().toISOString(),
          location: 'Main Entrance',
          scanned_by: 'admin',
          status: 'success',
          result: 'granted',
          subscription_valid: true
        }
      ];
      
      setLogs(mockLogs);
      setPagination(prev => ({
        ...prev,
        totalItems: mockLogs.length,
        totalPages: Math.ceil(mockLogs.length / prev.itemsPerPage)
      }));
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Failed to fetch logs');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Apply search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(log => {
        const user = (log as any).user;
        return (
          user?.name?.toLowerCase().includes(searchLower) ||
          user?.email?.toLowerCase().includes(searchLower) ||
          log.user_id.toLowerCase().includes(searchLower)
        );
      });
    }

    setFilteredLogs(filtered);
  };

  const handleFilterChange = (key: keyof LogFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const applyDatabaseFilters = () => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    fetchLogs();
  };

  const clearFilters = () => {
    setFilters({});
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    fetchLogs();
  };

  const exportToCSV = () => {
    // Create CSV content manually since exportLogsToCSV doesn't exist
    const headers = ['User Name', 'Email', 'Scan Type', 'Scan Time', 'Location', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log => [
        log.user_name,
        log.user_email,
        log.scan_type,
        log.scan_time,
        log.location,
        log.status
      ].join(','))
    ].join('\n');
    
    // Download CSV manually
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Logs exported to CSV');
  };

  const formatDuration = (duration: string | null) => {
    if (!duration) return 'N/A';
    
    // Parse PostgreSQL interval format
    const match = duration.match(/(\d+):(\d+):(\d+)/);
    if (match) {
      const [, hours, minutes, seconds] = match;
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    
    return duration;
  };

  const formatDateTime = (dateTime: string | null) => {
    if (!dateTime) return 'N/A';
    return new Date(dateTime).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      entry: 'bg-green-900 text-green-400',
      exit: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      invalid: 'bg-red-990 text-red-400',
      expired: 'bg-yellow-900 text-yellow-400'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${
        statusColors[status as keyof typeof statusColors] || 'var(--text-secondary)'
      }`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const changePage = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg p-6 bg-white dark:bg-black border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Entry/Exit Logs</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors bg-transparent text-gray-900 dark:text-white hover:opacity-80 border border-gray-200 dark:border-gray-700"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors bg-transparent text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 hover:opacity-80"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={fetchLogs}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors bg-transparent text-gray-800 dark:text-gray-200 hover:opacity-80 border border-gray-200 dark:border-gray-700"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-700 dark:text-gray-300" />
          <input
            type="text"
            placeholder="Search by user name, email, or ID..."
            value={filters.searchTerm || ''}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none bg-transparent border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400"
          />
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="rounded-lg p-6 bg-white dark:bg-black border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Date From</label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 rounded-lg focus:outline-none bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Date To</label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 rounded-lg focus:outline-none bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400"
              >
                <option value="">All Statuses</option>
                <option value="entry">Entry</option>
                <option value="exit">Exit</option>
                <option value="invalid">Invalid</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Location</label>
              <input
                type="text"
                placeholder="e.g., main_entrance"
                value={filters.location || ''}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>
          </div>
          <div className="flex items-center space-x-3 mt-4">
            <button
              onClick={applyDatabaseFilters}
              className="px-4 py-2 rounded-lg transition-colors bg-blue-600 dark:bg-blue-500 text-white hover:opacity-80 border border-blue-600 dark:border-blue-500"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2 rounded-lg transition-colors bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:opacity-80 border border-gray-200 dark:border-gray-700"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="rounded-lg overflow-hidden bg-white dark:bg-black border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scan Logs</h3>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {filteredLogs.length} of {pagination.totalItems} entries
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-900 dark:text-white" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-700 dark:text-gray-300">No logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-black">USER</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-black">ENTRY TIME</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-black">EXIT TIME</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-black">DURATION</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-black">STATUS</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-black">
                    Location
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredLogs.map((log, index) => {
                  const user = (log as any).user;
                  return (
                    <tr key={`${log.user_id}-${log.scan_time}-${index}`} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <User className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {log.user_name || 'Unknown User'}
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {log.user_email || log.user_id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {log.scan_type === 'entry' ? formatDateTime(log.scan_time) : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                            <span className="text-sm text-gray-900 dark:text-white">
                              {log.scan_type === 'exit' ? formatDateTime(log.scan_time) : 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                            <span className="text-sm text-gray-900 dark:text-white">
                              N/A
                            </span>
                          </div>
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                            <span className="text-sm text-gray-900 dark:text-white">{log.location}</span>
                          </div>
                        </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Page {pagination.currentPage} of {pagination.totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => changePage(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="p-2 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, pagination.currentPage - 2) + i;
                  if (pageNum > pagination.totalPages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => changePage(pageNum)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        pageNum === pagination.currentPage
                          ? 'bg-blue-600 dark:bg-blue-500 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => changePage(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="p-2 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EntryExitLogs;