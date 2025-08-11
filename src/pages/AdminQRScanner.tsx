import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { CheckCircle, XCircle, Clock, User, Calendar, AlertTriangle, Scan } from 'lucide-react';
import { processQRScan, validateQRToken } from '../lib/qrUtils';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';

interface ScanResult {
  success: boolean;
  message: string;
  studentName?: string;
  action?: 'entry' | 'exit';
  timestamp?: string;
}

interface RecentScan {
  id: string;
  student_name: string;
  action: 'entry' | 'exit';
  timestamp: string;
  success: boolean;
}

export default function AdminQRScanner() {
  const { user } = useAuthStore();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerElementId = 'qr-scanner';

  useEffect(() => {
    fetchRecentScans();
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, []);

  const fetchRecentScans = async () => {
    try {
      const recentScansQuery = query(
        collection(db, 'qr_scan_logs'),
        orderBy('scan_timestamp', 'desc'),
        limit(10)
      );
      
      const querySnapshot = await getDocs(recentScansQuery);
      
      const formattedScans: RecentScan[] = querySnapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          student_name: data.student_name || 'Unknown',
          action: data.scan_result === 'success' ? 'entry' : 'exit',
          timestamp: data.scan_timestamp,
          success: data.scan_result === 'success'
        };
      });

      setRecentScans(formattedScans);
    } catch (error) {
      console.error('Error fetching recent scans:', error);
    }
  };

  const startScanning = () => {
    setIsScanning(true);
    setScanResult(null);

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      showTorchButtonIfSupported: true,
      showZoomSliderIfSupported: true,
      defaultZoomValueIfSupported: 1
    };

    scannerRef.current = new Html5QrcodeScanner(scannerElementId, config, false);

    scannerRef.current.render(
      async (decodedText) => {
        await handleScanSuccess(decodedText);
      },
      (error) => {
        // Handle scan failure silently
        console.log('Scan error:', error);
      }
    );
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleScanSuccess = async (qrToken: string) => {
    if (loading) return;
    
    setLoading(true);
    stopScanning();

    try {
      // Validate the QR token first
      const validation = await validateQRToken(qrToken);
      
      if (!validation.isValid) {
        setScanResult({
          success: false,
          message: validation.error || 'Invalid QR code'
        });
        toast.error('Invalid QR code');
        return;
      }

      // Process the QR scan
      const result = await processQRScan(qrToken, (user as any)?.id || '');
      
      setScanResult({
        success: result.success,
        message: result.message,
        timestamp: new Date().toISOString()
      });

      if (result.success) {
        toast.success(result.message);
        // Refresh recent scans
        await fetchRecentScans();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error processing QR scan:', error);
      setScanResult({
        success: false,
        message: 'Error processing scan. Please try again.'
      });
      toast.error('Error processing scan');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{color: 'var(--text-primary)'}}>QR Code Scanner</h1>
          <p className="mt-2" style={{color: 'var(--text-secondary)'}}>Scan student QR codes for entry and exit tracking</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scanner Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4" style={{color: 'var(--text-primary)'}}>Scanner</h2>
              
              {!isScanning && !loading && (
                <div className="space-y-4">
                  <div className="w-64 h-64 mx-auto bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                    <div className="text-center">
                      <Scan className="h-16 w-16 mx-auto mb-4" style={{color: 'var(--text-secondary)'}} />
                      <p style={{color: 'var(--text-secondary)'}}>Click to start scanning</p>
                    </div>
                  </div>
                  <button
                    onClick={startScanning}
                    className="w-full py-3 px-6 rounded-lg transition-colors font-semibold bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                  >
                    Start Scanner
                  </button>
                </div>
              )}

              {isScanning && (
                <div className="space-y-4">
                  <div id={scannerElementId} className="mx-auto"></div>
                  <button
                    onClick={stopScanning}
                    className="w-full py-3 px-6 rounded-lg transition-colors font-semibold"
                    style={{backgroundColor: 'var(--accent-color)', color: 'var(--bg-primary)'}}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-color)'}
                  >
                    Stop Scanner
                  </button>
                </div>
              )}

              {loading && (
                <div className="w-64 h-64 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
                    <p style={{color: 'var(--text-secondary)'}}>Processing scan...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {/* Scan Result */}
            {scanResult && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>Scan Result</h3>
                <div className={`p-4 rounded-lg border-2 ${
                  scanResult.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start">
                    {scanResult.success ? (
                      <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${
                        scanResult.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {scanResult.message}
                      </p>
                      {scanResult.studentName && (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                            <User className="h-4 w-4 inline mr-1" />
                            Student: {scanResult.studentName}
                          </p>
                          {scanResult.action && (
                            <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                              <Clock className="h-4 w-4 inline mr-1" />
                              Action: {scanResult.action.charAt(0).toUpperCase() + scanResult.action.slice(1)}
                            </p>
                          )}
                          {scanResult.timestamp && (
                            <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                              <Calendar className="h-4 w-4 inline mr-1" />
                              Time: {formatTime(scanResult.timestamp)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setScanResult(null);
                    startScanning();
                  }}
                  className="mt-4 w-full py-2 px-4 rounded-lg transition-colors"
                  style={{backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)'}}
                >
                  Scan Another
                </button>
              </div>
            )}

            {/* Recent Scans */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Recent Scans</h3>
              {recentScans.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {recentScans.map((scan) => (
                    <div key={scan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        {scan.success ? (
                          <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 mr-3" />
                        )}
                        <div>
                          <p className="font-medium" style={{color: 'var(--text-primary)'}}>{scan.student_name}</p>
                          <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                            {scan.action.charAt(0).toUpperCase() + scan.action.slice(1)} • {formatTime(scan.timestamp)}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        scan.success 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {scan.success ? 'Success' : 'Failed'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4" style={{color: 'var(--text-secondary)'}} />
                  <p style={{color: 'var(--text-secondary)'}}>No recent scans</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}