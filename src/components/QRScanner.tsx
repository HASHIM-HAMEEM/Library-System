import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { Camera, X, CheckCircle, AlertCircle, Clock, User, RotateCcw } from 'lucide-react';
import { qrCodeService } from '../lib/qrCodeService';
import { useAuthStore } from '../stores/authStore';
import { useScanLogStore } from '../stores/scanLogStore';
import { toast } from 'sonner';

interface QRScannerProps {
  onScanSuccess?: (result: QRScanResult) => void;
  onScanError?: (error: string) => void;
  scanType?: 'entry' | 'exit';
  location?: string;
}

interface QRScanResult {
  success: boolean;
  isValid: boolean;
  userData?: any;
  scanData?: any;
  error?: string;
  scanType: 'entry' | 'exit';
  timestamp: string;
}

interface ScanHistory {
  id: string;
  userData: any;
  scanType: 'entry' | 'exit';
  timestamp: string;
  status: 'success' | 'error' | 'expired';
  message?: string;
}

const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  onScanError,
  scanType = 'entry',
  location = 'main_entrance'
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
  const [currentScanType, setCurrentScanType] = useState<'entry' | 'exit'>(scanType);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const elementId = 'qr-scanner-container';
  
  const { userProfile: currentAdmin } = useAuthStore();
  const { addScanLog } = useScanLogStore();

  useEffect(() => {
    if (isScanning) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isScanning]);

  const startScanner = () => {
    if (scannerRef.current) {
      stopScanner();
    }

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      showTorchButtonIfSupported: true,
      showZoomSliderIfSupported: true,
      defaultZoomValueIfSupported: 2,
    };

    scannerRef.current = new Html5QrcodeScanner(elementId, config, false);
    
    scannerRef.current.render(
      (decodedText) => handleScanSuccess(decodedText),
      (error) => {
        // Ignore frequent scanning errors
        if (!error.includes('NotFoundException')) {
          console.warn('QR scan error:', error);
        }
      }
    );
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (error) {
        console.warn('Error stopping scanner:', error);
      }
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setIsScanning(false);
    
    try {
      // Validate QR code using instance method (only takes 1 argument)
      const validation = await qrCodeService.validateQRCode(decodedText);
      
      if (!validation.isValid) {
        const result: QRScanResult = {
          success: false,
          isValid: false,
          error: validation.error,
          scanType: currentScanType,
          timestamp: new Date().toISOString()
        };
        
        setScanResult(result);
        onScanError?.(validation.error || 'Invalid QR code');
        
        // Add to history
        if (validation.userData) {
          addToHistory({
            id: Date.now().toString(),
            userData: validation.userData,
            scanType: currentScanType,
            timestamp: new Date().toISOString(),
            status: 'error',
            message: validation.error
          });
        }
        
        toast.error(validation.error || 'Invalid QR code');
        return;
      }

      // Log the scan using the store
      await addScanLog({
        user_id: validation.userData!.userId,
        user_name: validation.userData!.fullName,
        user_email: validation.userData!.email,
        scan_type: currentScanType,
        scan_time: new Date().toISOString(),
        location: location,
        scanned_by: currentAdmin?.id || 'unknown',
        status: 'success',
        result: 'granted',
        subscription_valid: true,
        qr_data: decodedText,
      });

      const result: QRScanResult = {
        success: true,
        isValid: true,
        userData: validation.userData,
        scanType: currentScanType,
        timestamp: new Date().toISOString()
      };

      setScanResult(result);
      onScanSuccess?.(result);
      
      // Add to history
      addToHistory({
        id: Date.now().toString(),
        userData: validation.userData!,
        scanType: currentScanType,
        timestamp: new Date().toISOString(),
        status: 'success'
      });

      toast.success(`${currentScanType === 'entry' ? 'Entry' : 'Exit'} logged successfully for ${validation.userData!.fullName}`);
      
    } catch (error) {
      console.error('Scan processing error:', error);
      const result: QRScanResult = {
         success: false,
         isValid: false,
         error: error.message || 'Failed to process QR code',
         scanType: currentScanType,
         timestamp: new Date().toISOString()
       };
       
       setScanResult(result);
       onScanError?.(result.error || 'Failed to process QR code');
       toast.error(result.error || 'Failed to process QR code');
    } finally {
      setIsProcessing(false);
    }
  };

  const addToHistory = (scan: ScanHistory) => {
    setScanHistory(prev => [scan, ...prev.slice(0, 9)]); // Keep last 10 scans
  };

  const clearResult = () => {
    setScanResult(null);
  };

  const restartScanning = () => {
    setScanResult(null);
    setIsProcessing(false);
    setIsScanning(true);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusIcon = (status: 'success' | 'error' | 'expired') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'expired':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-red-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Scanner Controls */}
      <div className="bg-[#18181b] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">QR Code Scanner</h3>
          <div className="flex items-center space-x-4">
            {/* Scan Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentScanType('entry')}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  currentScanType === 'entry'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                Entry
              </button>
              <button
                onClick={() => setCurrentScanType('exit')}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  currentScanType === 'exit'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                Exit
              </button>
            </div>
            <button
              onClick={() => setIsScanning(!isScanning)}
              disabled={isProcessing}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isScanning
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-white hover:bg-gray-100 text-black'
              }`}
            >
              {isProcessing ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : isScanning ? (
                <>
                  <X className="w-4 h-4" />
                  <span>Stop Scanning</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>Start Scanning</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scanner Status */}
        <div className="mb-4 p-3 rounded-lg bg-black">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">
              Mode: <span className={`capitalize ${
                currentScanType === 'entry' ? 'text-green-400' : 'text-red-400'
              }`}>{currentScanType}</span>
            </span>
            <span className="text-sm text-gray-400">
              Status: {isProcessing ? 'Processing...' : isScanning ? 'Scanning' : 'Ready'}
            </span>
          </div>
        </div>

        {/* Scanner Container */}
        <div className="relative">
          {isScanning ? (
            <div className="bg-black rounded-lg overflow-hidden">
              <div id={elementId} className="w-full" />
              {/* Instructions overlay */}
              <div className="text-center text-sm text-gray-400 bg-gray-800 p-3 rounded-b-lg">
                <p>Position the QR code within the camera frame</p>
                <p>Ensure good lighting for best results</p>
              </div>
            </div>
          ) : (
            <div className="bg-black rounded-lg p-8 text-center">
              <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-400">Click "Start Scanning" to begin</p>
              {scanResult && (
                <button
                  onClick={restartScanning}
                  className="mt-4 flex items-center space-x-2 mx-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Scan Again</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Scan Result */}
      {scanResult && (
        <div className="bg-[#18181b] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Scan Result</h3>
            <button
              onClick={clearResult}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className={`p-4 rounded-lg border ${
            scanResult.success && scanResult.isValid
              ? 'border-green-600 bg-green-900/20'
              : 'border-red-600 bg-red-900/20'
          }`}>
            <div className="flex items-center space-x-3 mb-3">
              {scanResult.success && scanResult.isValid ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-400" />
              )}
              <span className={`font-medium ${
                scanResult.success && scanResult.isValid ? 'text-green-400' : 'text-red-400'
              }`}>
                {scanResult.success && scanResult.isValid ? 'Access Granted' : 'Access Denied'}
              </span>
            </div>

            {scanResult.userData && (
              <div className="bg-black p-4 rounded border space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-300" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-white">{scanResult.userData.fullName}</h5>
                    <p className="text-sm text-gray-400">{scanResult.userData.email}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-800 p-2 rounded">
                    <span className="text-gray-400 block">User ID:</span>
                    <span className="text-white font-medium">{scanResult.userData.id}</span>
                  </div>
                  <div className="bg-gray-800 p-2 rounded">
                    <span className="text-gray-400 block">Phone:</span>
                    <span className="text-white font-medium">{scanResult.userData.phone || 'N/A'}</span>
                  </div>
                  <div className="bg-gray-800 p-2 rounded">
                    <span className="text-gray-400 block">Role:</span>
                    <span className="text-white font-medium">{scanResult.userData.role}</span>
                  </div>
                  <div className="bg-gray-800 p-2 rounded">
                    <span className="text-gray-400 block">Status:</span>
                    <span className={`font-medium ${
                      scanResult.userData.status === 'active' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {scanResult.userData.status}
                    </span>
                  </div>
                  <div className="bg-gray-800 p-2 rounded">
                    <span className="text-gray-400 block">Subscription:</span>
                    <span className={`font-medium ${
                      scanResult.userData.subscription_status === 'active' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {scanResult.userData.subscription_status}
                    </span>
                  </div>
                  <div className="bg-gray-800 p-2 rounded">
                    <span className="text-gray-400 block">Expires:</span>
                    <span className="text-white font-medium">
                      {scanResult.userData.subscriptionValidUntil
                        ? new Date(scanResult.userData.subscriptionValidUntil).toLocaleDateString()
                        : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="bg-gray-800 p-2 rounded">
                    <span className="text-gray-400 block">Scan Type:</span>
                    <span className="text-white font-medium capitalize">{scanResult.scanType}</span>
                  </div>
                  <div className="bg-gray-800 p-2 rounded">
                    <span className="text-gray-400 block">Location:</span>
                    <span className="text-white font-medium">{location}</span>
                  </div>
                </div>
                
                {scanResult.scanData && (
                  <div className="bg-blue-900/20 border border-blue-600 p-2 rounded">
                    <span className="text-blue-400 text-xs block">Scan Details:</span>
                    <span className="text-xs text-blue-300">
                      Scanned by: {currentAdmin?.name || 'Unknown'} | Time: {formatTimestamp(scanResult.timestamp)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {scanResult.error && (
              <p className="text-red-400 text-sm mt-2">{scanResult.error}</p>
            )}
            
            <div className="mt-4 flex justify-center">
              <button
                onClick={restartScanning}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  scanResult.success && scanResult.isValid
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                <span>{scanResult.success && scanResult.isValid ? 'Scan Next' : 'Try Again'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scan History */}
      {scanHistory.length > 0 && (
        <div className="bg-[#18181b] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Scans</h3>
          <div className="space-y-3">
            {scanHistory.map((scan) => (
              <div key={scan.id} className="flex items-center justify-between p-3 bg-black rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(scan.status)}
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-white text-sm font-medium">{scan.userData.fullName}</p>
                    <p className="text-gray-400 text-xs">{scan.userData.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm capitalize">{scan.scanType}</p>
                  <p className="text-gray-400 text-xs">{formatTimestamp(scan.timestamp)}</p>
                  {scan.message && (
                    <p className="text-red-400 text-xs">{scan.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QRScanner;
export type { QRScanResult, ScanHistory };