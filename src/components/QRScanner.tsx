import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { Camera, X, CheckCircle, AlertCircle, Clock, User, RotateCcw } from 'lucide-react';
import DynamicQRService from '../lib/dynamicQRService';
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [currentScanType, setCurrentScanType] = useState<'entry' | 'exit'>(scanType);
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const { userProfile: currentAdmin } = useAuthStore();
  const { addScanLog } = useScanLogStore();
  
  const elementId = 'qr-scanner-container';

  useEffect(() => {
    if (isScanning) {
      // Clear any existing scanner first
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
          scannerRef.current = null;
        } catch (error) {
          console.warn('[QR Debug] Error clearing existing scanner:', error);
        }
      }

      // Small delay to ensure cleanup is complete
      const timer = setTimeout(() => {
        try {
          const config: any = {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              // Dynamic qrbox sizing for better alignment tolerance
              const minEdgePercentage = 0.7; // 70% of the smaller dimension
              const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
              const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
              return {
                width: qrboxSize,
                height: qrboxSize
              };
            },
            aspectRatio: 1.0,
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
            // Enhanced scanning configuration for better tolerance
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true
            },
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: false, // Remove flashlight utility
            showZoomSliderIfSupported: false, // Remove zoom utility
            defaultZoomValueIfSupported: 1,
            // Advanced scanning options for better detection
            videoConstraints: {
              facingMode: "environment",
              advanced: [{
                focusMode: "continuous",
                exposureMode: "continuous",
                whiteBalanceMode: "continuous"
              }]
            }
          };

          console.log('[QR Debug] Initializing new scanner');
          scannerRef.current = new Html5QrcodeScanner(
            elementId,
            config,
            false
          );

          scannerRef.current.render(
            (decodedText) => {
              console.log('[QR Debug] QR code detected:', decodedText.substring(0, 50) + '...');
              handleScanSuccess(decodedText);
            },
            (error) => {
              // Enhanced error filtering for better user experience
              const ignoredErrors = [
                'NotFoundException',
                'No MultiFormat Readers',
                'NotFoundError',
                'ChecksumException',
                'FormatException'
              ];
              
              const shouldIgnore = ignoredErrors.some(ignoredError => 
                error.includes(ignoredError)
              );
              
              if (!shouldIgnore) {
                console.warn('[QR Debug] Scanner error:', error);
              }
            }
          );
        } catch (error) {
          console.error('[QR Debug] Error initializing scanner:', error);
          setIsScanning(false);
          toast.error('Failed to initialize QR scanner');
        }
      }, 100);

      return () => clearTimeout(timer);
    } else {
      if (scannerRef.current) {
        try {
          console.log('[QR Debug] Clearing scanner');
          scannerRef.current.clear();
        } catch (error) {
          console.warn('[QR Debug] Error clearing scanner:', error);
        } finally {
          scannerRef.current = null;
        }
      }
    }
  }, [isScanning]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (error) {
          console.warn('Error clearing scanner on unmount:', error);
        }
      }
    };
  }, []);

  const handleScanSuccess = async (decodedText: string) => {
    if (isProcessing) {
      console.log('[QR Debug] Already processing, ignoring scan');
      return;
    }
    
    console.log('[QR Debug] Starting scan processing');
    setIsProcessing(true);
    setIsScanning(false);
    
    try {
      console.log('[QR Debug] QR data length:', decodedText.length);
      console.log('[QR Debug] QR data preview:', decodedText.substring(0, 100));
      
      // Validate QR code using dynamic QR service
      const validation = await DynamicQRService.validateQRCode(decodedText, currentAdmin?.id || 'unknown');
      
      console.log('[QR Debug] Validation result:', {
        isValid: validation.isValid,
        hasUserData: !!validation.userData,
        error: validation.error
      });
      
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
      console.error('[QR Debug] Scan processing error:', error);
      
      let errorMessage = 'Failed to process QR code';
      
      if (error.message?.includes('Malformed UTF-8')) {
        errorMessage = 'QR code format not supported or corrupted. Please try generating a new QR code.';
        console.error('[QR Debug] UTF-8 decryption error - possible key mismatch or legacy QR format');
      } else if (error.message?.includes('transition')) {
        errorMessage = 'Scanner state error. Please try again.';
        console.error('[QR Debug] Scanner state transition error');
      }
      
      const result: QRScanResult = {
         success: false,
         isValid: false,
         error: errorMessage,
         scanType: currentScanType,
         timestamp: new Date().toISOString()
       };
       
       setScanResult(result);
       onScanError?.(errorMessage);
       toast.error(errorMessage);
    } finally {
      console.log('[QR Debug] Scan processing complete');
      setIsProcessing(false);
    }
  };

  const addToHistory = (scan: ScanHistory) => {
    setScanHistory(prev => [scan, ...prev.slice(0, 9)]); // Keep last 10 scans
  };

  const resetScanner = () => {
    console.log('[QR Debug] Resetting scanner state');
    setIsProcessing(false);
    setScanResult(null);
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (error) {
        console.warn('[QR Debug] Error clearing scanner during reset:', error);
      }
    }
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
      <div className="rounded-lg p-6 border bg-white dark:bg-black border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">QR Code Scanner</h3>
          <div className="flex items-center space-x-4">
            {/* Scan Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentScanType('entry')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors border border-gray-200 dark:border-gray-700 ${
                  currentScanType === 'entry' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-white dark:bg-black text-gray-900 dark:text-white'
                }`}
              >Entry</button>
              <button
                onClick={() => setCurrentScanType('exit')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors border border-gray-200 dark:border-gray-700 ${
                  currentScanType === 'exit' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-white dark:bg-black text-gray-900 dark:text-white'
                }`}
              >Exit</button>
            </div>
            <button
              onClick={() => setIsScanning(!isScanning)}
              disabled={isProcessing}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-700 ${
                isScanning ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
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
        <div className="mb-4 p-3 rounded-lg border bg-transparent border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Mode: <span className={`capitalize ${
                currentScanType === 'entry' ? 'text-green-600' : 'text-red-600'
              }`}>{currentScanType}</span>
            </span>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Status: {isProcessing ? 'Processing...' : isScanning ? 'Scanning' : 'Ready'}
            </span>
          </div>
        </div>

        {/* Scanner Container */}
        <div className="relative">
          {isScanning ? (
            <div className="rounded-lg overflow-hidden border bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <div id={elementId} className="w-full" />
              {/* Enhanced Instructions overlay */}
              <div className="text-center text-sm p-4 rounded-b-lg border-t bg-white dark:bg-black text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700">
                <div className="space-y-2">
                  <p className="font-medium text-blue-600 dark:text-blue-400">📱 Scanning Tips for Complex QR Codes:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <p>• Hold device steady, 6-12 inches away</p>
                    <p>• QR code doesn't need perfect alignment</p>
                    <p>• Ensure good lighting, avoid shadows</p>
                    <p>• Try different angles if needed</p>
                    <p>• Clean camera lens for clarity</p>
                    <p>• Scanner auto-adjusts to QR size</p>
                  </div>
                  <p className="text-green-600 dark:text-green-400 font-medium">✓ Scanner active - Move closer or farther as needed</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg p-8 text-center border bg-transparent border-gray-200 dark:border-gray-700">
              <Camera className="w-16 h-16 mx-auto mb-4 text-gray-700 dark:text-gray-300" />
              <p className="text-gray-700 dark:text-gray-300">Click "Start Scanning" to begin</p>
              {scanResult && (
                <button
                  onClick={restartScanning}
                  className="mt-4 flex items-center space-x-2 mx-auto px-4 py-2 rounded-lg transition-colors border border-gray-200 dark:border-gray-700 bg-blue-600 text-white hover:opacity-80"
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
        <div className="rounded-lg p-6 border bg-white dark:bg-black border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scan Result</h3>
            <button
              onClick={clearResult}
              className="transition-colors p-1 rounded text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 bg-white dark:bg-black"
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
              <div className="p-4 rounded border space-y-3 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center border bg-white dark:bg-black border-gray-200 dark:border-gray-700">
                    <User className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-900 dark:text-white">{scanResult.userData.fullName}</h5>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{scanResult.userData.email}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 rounded border bg-white dark:bg-black border-gray-200 dark:border-gray-700">
                    <span className="block font-medium text-gray-900 dark:text-white">User ID:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{scanResult.userData.id}</span>
                  </div>
                  <div className="p-2 rounded border bg-white dark:bg-black border-gray-200 dark:border-gray-700">
                    <span className="block font-medium text-gray-900 dark:text-white">Phone:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{scanResult.userData.phone || 'N/A'}</span>
                  </div>
                  <div className="p-2 rounded border bg-white dark:bg-black border-gray-200 dark:border-gray-700">
                    <span className="block font-medium text-gray-900 dark:text-white">Role:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{scanResult.userData.role}</span>
                  </div>
                  <div className="p-2 rounded border bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <span className="block font-medium text-gray-900 dark:text-white">Status:</span>
                    <span className={`font-semibold ${
                      scanResult.userData.status === 'active' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {scanResult.userData.status}
                    </span>
                  </div>
                  <div className="p-2 rounded border bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <span className="block font-medium text-gray-900 dark:text-white">Subscription:</span>
                    <span className={`font-semibold ${
                      scanResult.userData.subscription_status === 'active' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {scanResult.userData.subscription_status}
                    </span>
                  </div>
                  <div className="p-2 rounded border bg-white dark:bg-black border-gray-200 dark:border-gray-700">
                    <span className="block font-medium text-gray-900 dark:text-white">Expires:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {scanResult.userData.subscriptionValidUntil
                        ? new Date(scanResult.userData.subscriptionValidUntil).toLocaleDateString()
                        : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="p-2 rounded border bg-white dark:bg-black border-gray-200 dark:border-gray-700">
                    <span className="block font-medium text-gray-900 dark:text-white">Scan Type:</span>
                    <span className="font-semibold capitalize text-gray-900 dark:text-white">{scanResult.scanType}</span>
                  </div>
                  <div className="p-2 rounded border bg-white dark:bg-black border-gray-200 dark:border-gray-700">
                    <span className="block font-medium text-gray-900 dark:text-white">Location:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{location}</span>
                  </div>
                </div>
                
                {scanResult.scanData && (
                  <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-2 rounded">
                  <span className="text-gray-700 dark:text-gray-300 text-xs block">Scan Details:</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
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
        <div className="rounded-lg p-6 border bg-white dark:bg-black border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Recent Scans</h3>
          <div className="space-y-3">
            {scanHistory.map((scan) => (
              <div key={scan.id} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(scan.status)}
                  <User className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{scan.userData.fullName}</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300">{scan.userData.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm capitalize text-gray-900 dark:text-white">{scan.scanType}</p>
                  <p className="text-xs text-gray-700 dark:text-gray-300">{formatTimestamp(scan.timestamp)}</p>
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