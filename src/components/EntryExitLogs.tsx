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
      exit: 'var(--text-secondary)',
      invalid: 'bg-red-900 text-red-400',
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
      <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>Entry/Exit Logs</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--accent-color)',
                color: 'var(--text-primary)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={fetchLogs}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{color: 'var(--text-secondary)'}} />
          <input
            type="text"
            placeholder="Search by user name, email, or ID..."
            value={filters.searchTerm || ''}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-color)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          />
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-secondary)'}}>Date From</label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 rounded-lg focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-color)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-secondary)'}}>Date To</label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 rounded-lg focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-color)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-secondary)'}}>Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
              >
                <option value="">All Statuses</option>
                <option value="entry">Entry</option>
                <option value="exit">Exit</option>
                <option value="invalid">Invalid</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-secondary)'}}>Location</label>
              <input
                type="text"
                placeholder="e.g., main_entrance"
                value={filters.location || ''}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
              />
            </div>
          </div>
          <div className="flex items-center space-x-3 mt-4">
            <button
              onClick={applyDatabaseFilters}
              className="px-4 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--accent-color)',
                color: 'var(--text-primary)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>Scan Logs</h3>
            <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
              Showing {filteredLogs.length} of {pagination.totalItems} entries
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin" style={{color: 'var(--text-primary)'}} />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <p style={{color: 'var(--text-secondary)'}}>No logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                    Entry Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                    Exit Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                    Location
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                {filteredLogs.map((log, index) => {
                  const user = (log as any).user;
                  return (
                    <tr key={`${log.user_id}-${log.scan_time}-${index}`} className="transition-colors" onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <User className="w-8 h-8" style={{color: 'var(--text-secondary)'}} />
                          <div>
                            <p className="font-medium" style={{color: 'var(--text-primary)'}}>
                              {log.user_name || 'Unknown User'}
                            </p>
                            <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                              {log.user_email || log.user_id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" style={{color: 'var(--text-secondary)'}} />
                          <span className="text-sm" style={{color: 'var(--text-primary)'}}>
                            {log.scan_type === 'entry' ? formatDateTime(log.scan_time) : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" style={{color: 'var(--text-secondary)'}} />
                          <span className="text-sm" style={{color: 'var(--text-primary)'}}>
                            {log.scan_type === 'exit' ? formatDateTime(log.scan_time) : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" style={{color: 'var(--text-secondary)'}} />
                          <span className="text-sm" style={{color: 'var(--text-primary)'}}>
                            N/A
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4" style={{color: 'var(--text-secondary)'}} />
                          <span className="text-sm" style={{color: 'var(--text-primary)'}}>{log.location}</span>
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
          <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between">
              <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
                Page {pagination.currentPage} of {pagination.totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => changePage(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="p-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{color: 'var(--text-secondary)'}}
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
                      className="px-3 py-1 rounded text-sm"
                       style={{
                         backgroundColor: pageNum === pagination.currentPage ? 'var(--accent-color)' : 'transparent',
                         color: pageNum === pagination.currentPage ? 'var(--text-primary)' : 'var(--text-secondary)'
                       }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => changePage(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="p-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{color: 'var(--text-secondary)'}}
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