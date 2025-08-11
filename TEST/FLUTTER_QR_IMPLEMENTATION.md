# Flutter QR Code Implementation Guide

## Overview

This document provides comprehensive guidance for implementing QR code generation, scanning, and encryption/decryption features in Flutter applications that need to be compatible with the web-based library management system.

## Table of Contents

1. [Dependencies](#dependencies)
2. [QR Code Generation](#qr-code-generation)
3. [QR Code Scanning](#qr-code-scanning)
4. [Encryption/Decryption](#encryptiondecryption)
5. [Data Structures](#data-structures)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Dependencies

Add these dependencies to your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # QR Code generation
  qr_flutter: ^4.1.0
  
  # QR Code scanning
  mobile_scanner: ^3.5.6
  
  # Encryption/Decryption
  crypto: ^3.0.3
  encrypt: ^5.0.1
  
  # Base64 encoding/decoding
  dart:convert
  
  # HTTP requests (for API calls)
  http: ^1.1.0
  
  # JSON handling
  dart:convert
  
  # Permissions
  permission_handler: ^11.0.1
```

## QR Code Generation

### Basic QR Code Widget

```dart
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

class QRCodeWidget extends StatelessWidget {
  final String data;
  final double size;
  final Color foregroundColor;
  final Color backgroundColor;

  const QRCodeWidget({
    Key? key,
    required this.data,
    this.size = 200.0,
    this.foregroundColor = Colors.black,
    this.backgroundColor = Colors.white,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12.0),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.3),
            spreadRadius: 2,
            blurRadius: 5,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: QrImageView(
        data: data,
        version: QrVersions.auto,
        size: size - 32, // Account for padding
        foregroundColor: foregroundColor,
        backgroundColor: backgroundColor,
        errorCorrectionLevel: QrErrorCorrectLevel.H, // High error correction for complex QR codes
        gapless: false,
      ),
    );
  }
}
```

### Dynamic QR Code Generation Service

```dart
import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:encrypt/encrypt.dart';

class DynamicQRService {
  // IMPORTANT: This key must match the web app's AES key exactly
  static const String _rawAESKey = 'LibraryQRSecureKey2024!@#\$%^&*';
  
  // Padded key for AES encryption (32 bytes)
  static String get _paddedAESKey {
    return _rawAESKey.padRight(32, '0').substring(0, 32);
  }
  
  // QR code validity duration (20 minutes)
  static const int qrValidityDuration = 20 * 60 * 1000; // 20 minutes in milliseconds

  /// Generate encrypted QR code data for a user
  static Future<Map<String, dynamic>> generateQRCode({
    required String userId,
    required String fullName,
    required String email,
    required String subscriptionValidUntil,
    required String role,
    String? institutionId,
    String? profilePicUrl,
  }) async {
    try {
      final now = DateTime.now();
      final expiresAt = now.add(Duration(milliseconds: qrValidityDuration));
      final qrId = _generateQRId();
      final version = await _getCurrentVersion(userId);
      
      // Create QR data structure
      final qrData = {
        'userId': userId,
        'fullName': fullName,
        'email': email,
        'subscriptionValidUntil': subscriptionValidUntil,
        'role': role,
        'institutionId': institutionId,
        'profilePicUrl': profilePicUrl,
        'generatedAt': now.toIso8601String(),
        'expiresAt': expiresAt.toIso8601String(),
        'qrId': qrId,
        'version': version + 1,
      };
      
      // Encrypt the data
      final encryptedData = _encryptData(jsonEncode(qrData));
      
      // Generate hash for verification
      final hash = _generateHash(encryptedData);
      
      // Create QR payload
      final qrPayload = {
        'data': encryptedData,
        'hash': hash,
        'qrId': qrId,
        'version': version + 1,
        'expiresAt': expiresAt.toIso8601String(),
      };
      
      final qrString = jsonEncode(qrPayload);
      
      return {
        'success': true,
        'qrData': qrString,
        'qrId': qrId,
        'expiresAt': expiresAt.toIso8601String(),
      };
    } catch (error) {
      return {
        'success': false,
        'error': error.toString(),
      };
    }
  }
  
  /// Encrypt data using AES-256-CBC with zero IV (compatible with web app)
  static String _encryptData(String data) {
    try {
      // Use the same encryption parameters as the web app
      final key = Key.fromBase64(base64Encode(utf8.encode(_paddedAESKey)));
      final iv = IV.fromBase64(base64Encode(List.filled(16, 0))); // Zero IV
      
      final encrypter = Encrypter(AES(key, mode: AESMode.cbc, padding: 'PKCS7'));
      final encrypted = encrypter.encrypt(data, iv: iv);
      
      return encrypted.base64;
    } catch (error) {
      throw Exception('Encryption failed: $error');
    }
  }
  
  /// Decrypt data using AES-256-CBC with zero IV (compatible with web app)
  static String _decryptData(String encryptedData) {
    try {
      // Use the same decryption parameters as the web app
      final key = Key.fromBase64(base64Encode(utf8.encode(_paddedAESKey)));
      final iv = IV.fromBase64(base64Encode(List.filled(16, 0))); // Zero IV
      
      final encrypter = Encrypter(AES(key, mode: AESMode.cbc, padding: 'PKCS7'));
      final encrypted = Encrypted.fromBase64(encryptedData);
      
      return encrypter.decrypt(encrypted, iv: iv);
    } catch (error) {
      // Fallback: Try simple Base64 decoding
      try {
        return utf8.decode(base64Decode(encryptedData));
      } catch (fallbackError) {
        throw Exception('Decryption failed: $error');
      }
    }
  }
  
  /// Generate hash for data verification
  static String _generateHash(String data) {
    final bytes = utf8.encode(data + _paddedAESKey);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }
  
  /// Generate unique QR ID
  static String _generateQRId() {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final random = Random().nextInt(999999).toString().padLeft(6, '0');
    return 'qr_${timestamp}_$random';
  }
  
  /// Get current version (implement based on your storage solution)
  static Future<int> _getCurrentVersion(String userId) async {
    // Implement this method based on your local storage or API
    // For now, return a simple incrementing number
    return DateTime.now().millisecondsSinceEpoch ~/ 1000;
  }
}
```

## QR Code Scanning

### Enhanced QR Scanner Widget

```dart
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';

class EnhancedQRScanner extends StatefulWidget {
  final Function(String) onScanSuccess;
  final Function(String) onScanError;
  final String scanType; // 'entry' or 'exit'
  
  const EnhancedQRScanner({
    Key? key,
    required this.onScanSuccess,
    required this.onScanError,
    this.scanType = 'entry',
  }) : super(key: key);

  @override
  State<EnhancedQRScanner> createState() => _EnhancedQRScannerState();
}

class _EnhancedQRScannerState extends State<EnhancedQRScanner>
    with WidgetsBindingObserver {
  MobileScannerController controller = MobileScannerController(
    // Enhanced configuration for better scanning
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
    torchEnabled: false,
    returnImage: false,
    formats: [BarcodeFormat.qrCode], // Only QR codes
    detectionTimeoutMs: 1000,
  );
  
  bool isScanning = true;
  bool hasPermission = false;
  String? lastScannedCode;
  DateTime? lastScanTime;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkPermissions();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    controller.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!controller.value.isInitialized) {
      return;
    }
    
    switch (state) {
      case AppLifecycleState.detached:
      case AppLifecycleState.hidden:
      case AppLifecycleState.paused:
        controller.stop();
        break;
      case AppLifecycleState.resumed:
        if (hasPermission) {
          controller.start();
        }
        break;
      case AppLifecycleState.inactive:
        break;
    }
  }

  Future<void> _checkPermissions() async {
    final status = await Permission.camera.status;
    if (status.isGranted) {
      setState(() {
        hasPermission = true;
      });
    } else {
      final result = await Permission.camera.request();
      setState(() {
        hasPermission = result.isGranted;
      });
    }
  }

  void _onDetect(BarcodeCapture capture) {
    if (!isScanning) return;
    
    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;
    
    final barcode = barcodes.first;
    final code = barcode.rawValue;
    
    if (code == null || code.isEmpty) return;
    
    // Prevent duplicate scans within 2 seconds
    final now = DateTime.now();
    if (lastScannedCode == code && 
        lastScanTime != null && 
        now.difference(lastScanTime!).inSeconds < 2) {
      return;
    }
    
    lastScannedCode = code;
    lastScanTime = now;
    
    setState(() {
      isScanning = false;
    });
    
    // Process the scanned QR code
    _processQRCode(code);
  }
  
  void _processQRCode(String qrData) async {
    try {
      // Validate and decrypt QR code
      final result = await DynamicQRService.validateQRCode(qrData);
      
      if (result['isValid'] == true) {
        widget.onScanSuccess(qrData);
      } else {
        widget.onScanError(result['error'] ?? 'Invalid QR code');
      }
    } catch (error) {
      widget.onScanError('Failed to process QR code: $error');
    } finally {
      // Re-enable scanning after a short delay
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) {
          setState(() {
            isScanning = true;
          });
        }
      });
    }
  }
  
  void _restartScanning() {
    setState(() {
      isScanning = true;
      lastScannedCode = null;
      lastScanTime = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!hasPermission) {
      return _buildPermissionDenied();
    }
    
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Scanner view
          MobileScanner(
            controller: controller,
            onDetect: _onDetect,
            errorBuilder: (context, error, child) {
              return _buildError(error.toString());
            },
          ),
          
          // Overlay with scanning frame and instructions
          _buildScannerOverlay(),
          
          // Top controls
          _buildTopControls(),
          
          // Bottom instructions
          _buildBottomInstructions(),
        ],
      ),
    );
  }
  
  Widget _buildScannerOverlay() {
    return Container(
      decoration: ShapeDecoration(
        shape: QrScannerOverlayShape(
          borderColor: isScanning ? Colors.green : Colors.orange,
          borderRadius: 16,
          borderLength: 40,
          borderWidth: 8,
          cutOutSize: MediaQuery.of(context).size.width * 0.7,
        ),
      ),
    );
  }
  
  Widget _buildTopControls() {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            IconButton(
              onPressed: () => Navigator.of(context).pop(),
              icon: const Icon(Icons.arrow_back, color: Colors.white, size: 28),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: widget.scanType == 'entry' ? Colors.green : Colors.red,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                widget.scanType.toUpperCase(),
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            IconButton(
              onPressed: _restartScanning,
              icon: const Icon(Icons.refresh, color: Colors.white, size: 28),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildBottomInstructions() {
    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.transparent,
              Colors.black.withOpacity(0.8),
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.qr_code_scanner,
                color: Colors.white,
                size: 48,
              ),
              const SizedBox(height: 16),
              Text(
                isScanning ? 'Scanning for QR Code...' : 'Processing...',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                '📱 Enhanced Scanning Tips:\n'
                '• Hold device steady, 6-12 inches away\n'
                '• QR code doesn\'t need perfect alignment\n'
                '• Ensure good lighting, avoid shadows\n'
                '• Try different angles if needed\n'
                '• Scanner auto-adjusts to QR size',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 12,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildPermissionDenied() {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.camera_alt_outlined,
              size: 64,
              color: Colors.grey,
            ),
            const SizedBox(height: 16),
            const Text(
              'Camera Permission Required',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Please grant camera permission to scan QR codes',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _checkPermissions,
              child: const Text('Grant Permission'),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildError(String error) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red,
            ),
            const SizedBox(height: 16),
            const Text(
              'Scanner Error',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              error,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Go Back'),
            ),
          ],
        ),
      ),
    );
  }
}

// Custom overlay shape for QR scanner
class QrScannerOverlayShape extends ShapeBorder {
  final Color borderColor;
  final double borderWidth;
  final Color overlayColor;
  final double borderRadius;
  final double borderLength;
  final double cutOutSize;

  const QrScannerOverlayShape({
    this.borderColor = Colors.red,
    this.borderWidth = 3.0,
    this.overlayColor = const Color.fromRGBO(0, 0, 0, 80),
    this.borderRadius = 0,
    this.borderLength = 40,
    this.cutOutSize = 250,
  });

  @override
  EdgeInsetsGeometry get dimensions => const EdgeInsets.all(10);

  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) {
    return Path()
      ..fillType = PathFillType.evenOdd
      ..addPath(getOuterPath(rect), Offset.zero);
  }

  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) {
    Path getLeftTopPath(double s) {
      return Path()
        ..moveTo(s, s + borderLength)
        ..lineTo(s, s + borderRadius)
        ..quadraticBezierTo(s, s, s + borderRadius, s)
        ..lineTo(s + borderLength, s);
    }

    Path getRightTopPath(double s) {
      return Path()
        ..moveTo(s - borderLength, s)
        ..lineTo(s - borderRadius, s)
        ..quadraticBezierTo(s, s, s, s + borderRadius)
        ..lineTo(s, s + borderLength);
    }

    Path getRightBottomPath(double s) {
      return Path()
        ..moveTo(s, s - borderLength)
        ..lineTo(s, s - borderRadius)
        ..quadraticBezierTo(s, s, s - borderRadius, s)
        ..lineTo(s - borderLength, s);
    }

    Path getLeftBottomPath(double s) {
      return Path()
        ..moveTo(s + borderLength, s)
        ..lineTo(s + borderRadius, s)
        ..quadraticBezierTo(s, s, s, s - borderRadius)
        ..lineTo(s, s - borderLength);
    }

    final width = rect.width;
    final height = rect.height;
    final borderWidthSize = width / 2;
    final borderHeightSize = height / 2;
    final cutOutWidth = cutOutSize < width ? cutOutSize : width - borderWidth;
    final cutOutHeight = cutOutSize < height ? cutOutSize : height - borderWidth;

    final cutOutWidthSize = cutOutWidth / 2;
    final cutOutHeightSize = cutOutHeight / 2;

    final cutOutX = borderWidthSize - cutOutWidthSize;
    final cutOutY = borderHeightSize - cutOutHeightSize;

    return Path()
      ..fillType = PathFillType.evenOdd
      ..addRect(Rect.fromLTWH(0, 0, width, height))
      ..addRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(
            cutOutX,
            cutOutY,
            cutOutWidth,
            cutOutHeight,
          ),
          Radius.circular(borderRadius),
        ),
      )
      ..addPath(
        getLeftTopPath(cutOutX),
        Offset.zero,
      )
      ..addPath(
        getRightTopPath(cutOutX + cutOutWidth),
        Offset.zero,
      )
      ..addPath(
        getRightBottomPath(cutOutX + cutOutWidth),
        Offset(0, cutOutHeight),
      )
      ..addPath(
        getLeftBottomPath(cutOutX),
        Offset(0, cutOutHeight),
      );
  }

  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {
    final Paint paint = Paint()
      ..color = overlayColor
      ..style = PaintingStyle.fill;

    final Paint borderPaint = Paint()
      ..color = borderColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = borderWidth;

    canvas.drawPath(getOuterPath(rect), paint);
    canvas.drawPath(getOuterPath(rect), borderPaint);
  }

  @override
  ShapeBorder scale(double t) {
    return QrScannerOverlayShape(
      borderColor: borderColor,
      borderWidth: borderWidth,
      overlayColor: overlayColor,
    );
  }
}
```

## Encryption/Decryption

### QR Code Validation Service

```dart
import 'dart:convert';
import 'package:crypto/crypto.dart';

class QRValidationService {
  /// Validate and decrypt QR code data
  static Future<Map<String, dynamic>> validateQRCode(String qrData) async {
    try {
      // Parse QR payload
      final qrPayload = jsonDecode(qrData);
      
      if (!qrPayload.containsKey('data') || 
          !qrPayload.containsKey('hash') ||
          !qrPayload.containsKey('expiresAt')) {
        return {
          'isValid': false,
          'error': 'Invalid QR code format - missing required fields',
        };
      }
      
      // Check expiration
      final expiresAt = DateTime.parse(qrPayload['expiresAt']);
      if (DateTime.now().isAfter(expiresAt)) {
        return {
          'isValid': false,
          'error': 'QR code has expired',
        };
      }
      
      // Verify hash
      final expectedHash = DynamicQRService._generateHash(qrPayload['data']);
      if (qrPayload['hash'] != expectedHash) {
        return {
          'isValid': false,
          'error': 'QR code integrity check failed - possible tampering',
        };
      }
      
      // Decrypt data
      final decryptedData = DynamicQRService._decryptData(qrPayload['data']);
      final userData = jsonDecode(decryptedData);
      
      // Validate user data structure
      if (!userData.containsKey('userId') || 
          !userData.containsKey('fullName') ||
          !userData.containsKey('email')) {
        return {
          'isValid': false,
          'error': 'Invalid user data in QR code',
        };
      }
      
      // Check subscription validity
      if (userData.containsKey('subscriptionValidUntil')) {
        final subscriptionEnd = DateTime.parse(userData['subscriptionValidUntil']);
        if (DateTime.now().isAfter(subscriptionEnd)) {
          return {
            'isValid': false,
            'error': 'User subscription has expired',
            'userData': userData,
          };
        }
      }
      
      return {
        'isValid': true,
        'userData': userData,
        'qrPayload': qrPayload,
      };
    } catch (error) {
      return {
        'isValid': false,
        'error': 'Failed to validate QR code: $error',
      };
    }
  }
}
```

## Data Structures

### User Data Model

```dart
class UserData {
  final String userId;
  final String fullName;
  final String email;
  final String subscriptionValidUntil;
  final String role;
  final String? institutionId;
  final String? profilePicUrl;
  final DateTime generatedAt;
  final DateTime expiresAt;
  final String qrId;
  final int version;

  UserData({
    required this.userId,
    required this.fullName,
    required this.email,
    required this.subscriptionValidUntil,
    required this.role,
    this.institutionId,
    this.profilePicUrl,
    required this.generatedAt,
    required this.expiresAt,
    required this.qrId,
    required this.version,
  });

  factory UserData.fromJson(Map<String, dynamic> json) {
    return UserData(
      userId: json['userId'],
      fullName: json['fullName'],
      email: json['email'],
      subscriptionValidUntil: json['subscriptionValidUntil'],
      role: json['role'],
      institutionId: json['institutionId'],
      profilePicUrl: json['profilePicUrl'],
      generatedAt: DateTime.parse(json['generatedAt']),
      expiresAt: DateTime.parse(json['expiresAt']),
      qrId: json['qrId'],
      version: json['version'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'fullName': fullName,
      'email': email,
      'subscriptionValidUntil': subscriptionValidUntil,
      'role': role,
      'institutionId': institutionId,
      'profilePicUrl': profilePicUrl,
      'generatedAt': generatedAt.toIso8601String(),
      'expiresAt': expiresAt.toIso8601String(),
      'qrId': qrId,
      'version': version,
    };
  }
}
```

### QR Payload Model

```dart
class QRPayload {
  final String data;
  final String hash;
  final String qrId;
  final int version;
  final DateTime expiresAt;

  QRPayload({
    required this.data,
    required this.hash,
    required this.qrId,
    required this.version,
    required this.expiresAt,
  });

  factory QRPayload.fromJson(Map<String, dynamic> json) {
    return QRPayload(
      data: json['data'],
      hash: json['hash'],
      qrId: json['qrId'],
      version: json['version'],
      expiresAt: DateTime.parse(json['expiresAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'data': data,
      'hash': hash,
      'qrId': qrId,
      'version': version,
      'expiresAt': expiresAt.toIso8601String(),
    };
  }
}
```

## Error Handling

### Common Error Types

```dart
enum QRErrorType {
  invalidFormat,
  expired,
  encryptionError,
  decryptionError,
  hashMismatch,
  subscriptionExpired,
  networkError,
  permissionDenied,
  cameraError,
}

class QRException implements Exception {
  final QRErrorType type;
  final String message;
  final dynamic originalError;

  QRException(this.type, this.message, [this.originalError]);

  @override
  String toString() {
    return 'QRException: $message (Type: $type)';
  }
}

// Error handling utility
class QRErrorHandler {
  static String getErrorMessage(QRErrorType type) {
    switch (type) {
      case QRErrorType.invalidFormat:
        return 'Invalid QR code format. Please ensure you\'re scanning a valid library QR code.';
      case QRErrorType.expired:
        return 'QR code has expired. Please generate a new one.';
      case QRErrorType.encryptionError:
        return 'Failed to encrypt QR code data. Please try again.';
      case QRErrorType.decryptionError:
        return 'Failed to decrypt QR code. The QR code may be corrupted or from an incompatible source.';
      case QRErrorType.hashMismatch:
        return 'QR code integrity check failed. The QR code may have been tampered with.';
      case QRErrorType.subscriptionExpired:
        return 'User subscription has expired. Please renew your subscription.';
      case QRErrorType.networkError:
        return 'Network error. Please check your internet connection and try again.';
      case QRErrorType.permissionDenied:
        return 'Camera permission is required to scan QR codes.';
      case QRErrorType.cameraError:
        return 'Camera error. Please check if the camera is available and try again.';
      default:
        return 'An unknown error occurred. Please try again.';
    }
  }
}
```

## Best Practices

### 1. Security Considerations

- **Never hardcode encryption keys** in your source code
- Store sensitive keys in secure storage or environment variables
- Implement proper key rotation mechanisms
- Use HTTPS for all API communications
- Validate all QR code data before processing

### 2. Performance Optimization

- **Limit QR code generation frequency** to prevent excessive resource usage
- **Cache QR codes** when appropriate to reduce generation overhead
- **Use background processing** for encryption/decryption operations
- **Implement proper memory management** for camera resources

### 3. User Experience

- **Provide clear scanning instructions** to users
- **Show loading states** during QR code processing
- **Handle errors gracefully** with user-friendly messages
- **Implement haptic feedback** for successful scans
- **Auto-focus and auto-exposure** for better scanning

### 4. Compatibility

- **Test with different QR code sizes** and error correction levels
- **Ensure encryption compatibility** with the web application
- **Handle different device orientations** and screen sizes
- **Support both light and dark themes**

## Troubleshooting

### Common Issues and Solutions

#### 1. "Decryption Failed" Error

**Cause**: Encryption key mismatch between Flutter and web app

**Solution**:
```dart
// Ensure the AES key exactly matches the web app
static const String _rawAESKey = 'LibraryQRSecureKey2024!@#\$%^&*';

// Verify key padding
static String get _paddedAESKey {
  return _rawAESKey.padRight(32, '0').substring(0, 32);
}
```

#### 2. "Invalid QR Code Format" Error

**Cause**: QR code structure doesn't match expected format

**Solution**:
```dart
// Add comprehensive format validation
if (!qrPayload.containsKey('data') || 
    !qrPayload.containsKey('hash') ||
    !qrPayload.containsKey('expiresAt') ||
    !qrPayload.containsKey('qrId') ||
    !qrPayload.containsKey('version')) {
  throw QRException(
    QRErrorType.invalidFormat,
    'QR code missing required fields'
  );
}
```

#### 3. Scanner Not Detecting QR Codes

**Cause**: Poor camera configuration or lighting conditions

**Solution**:
```dart
// Enhanced scanner configuration
MobileScannerController controller = MobileScannerController(
  detectionSpeed: DetectionSpeed.noDuplicates,
  facing: CameraFacing.back,
  torchEnabled: false,
  returnImage: false,
  formats: [BarcodeFormat.qrCode],
  detectionTimeoutMs: 1000,
);
```

#### 4. "Hash Mismatch" Error

**Cause**: QR code data has been modified or corrupted

**Solution**:
```dart
// Implement robust hash verification
static String _generateHash(String data) {
  final bytes = utf8.encode(data + _paddedAESKey);
  final digest = sha256.convert(bytes);
  return digest.toString();
}
```

#### 5. Camera Permission Issues

**Cause**: User hasn't granted camera permissions

**Solution**:
```dart
Future<void> _checkPermissions() async {
  final status = await Permission.camera.status;
  if (status.isDenied) {
    final result = await Permission.camera.request();
    if (result.isDenied) {
      // Show permission explanation dialog
      _showPermissionDialog();
    }
  }
}
```

### Debug Mode

Enable debug logging for troubleshooting:

```dart
class QRDebug {
  static bool isDebugMode = true; // Set to false in production
  
  static void log(String message) {
    if (isDebugMode) {
      print('[QR Debug] $message');
    }
  }
  
  static void logError(String message, dynamic error) {
    if (isDebugMode) {
      print('[QR Error] $message: $error');
    }
  }
}
```

## Integration Example

### Complete QR Code Screen

```dart
import 'package:flutter/material.dart';

class QRCodeScreen extends StatefulWidget {
  final String userId;
  final Map<String, dynamic> userData;
  
  const QRCodeScreen({
    Key? key,
    required this.userId,
    required this.userData,
  }) : super(key: key);

  @override
  State<QRCodeScreen> createState() => _QRCodeScreenState();
}

class _QRCodeScreenState extends State<QRCodeScreen> {
  String? qrData;
  bool isLoading = true;
  String? error;
  DateTime? expiresAt;
  
  @override
  void initState() {
    super.initState();
    _generateQRCode();
  }
  
  Future<void> _generateQRCode() async {
    setState(() {
      isLoading = true;
      error = null;
    });
    
    try {
      final result = await DynamicQRService.generateQRCode(
        userId: widget.userId,
        fullName: widget.userData['name'],
        email: widget.userData['email'],
        subscriptionValidUntil: widget.userData['subscription_end'] ?? '',
        role: widget.userData['role'],
        institutionId: widget.userData['institution_id'],
        profilePicUrl: widget.userData['profile_picture_url'],
      );
      
      if (result['success'] == true) {
        setState(() {
          qrData = result['qrData'];
          expiresAt = DateTime.parse(result['expiresAt']);
          isLoading = false;
        });
        
        // Auto-refresh QR code before expiration
        _scheduleRefresh();
      } else {
        setState(() {
          error = result['error'];
          isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        error = e.toString();
        isLoading = false;
      });
    }
  }
  
  void _scheduleRefresh() {
    if (expiresAt != null) {
      final refreshTime = expiresAt!.subtract(const Duration(minutes: 2));
      final delay = refreshTime.difference(DateTime.now());
      
      if (delay.isNegative) {
        // Already expired, refresh immediately
        _generateQRCode();
      } else {
        // Schedule refresh
        Future.delayed(delay, () {
          if (mounted) {
            _generateQRCode();
          }
        });
      }
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My QR Code'),
        actions: [
          IconButton(
            onPressed: _generateQRCode,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // User info card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 30,
                      backgroundImage: widget.userData['profile_picture_url'] != null
                          ? NetworkImage(widget.userData['profile_picture_url'])
                          : null,
                      child: widget.userData['profile_picture_url'] == null
                          ? const Icon(Icons.person)
                          : null,
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.userData['name'],
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          Text(
                            widget.userData['email'],
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                          Text(
                            'Role: ${widget.userData['role']}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 24),
            
            // QR Code display
            Expanded(
              child: Center(
                child: _buildQRCodeWidget(),
              ),
            ),
            
            // Expiration info
            if (expiresAt != null)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    children: [
                      const Icon(Icons.schedule, color: Colors.orange),
                      const SizedBox(width: 8),
                      Text(
                        'Expires: ${_formatDateTime(expiresAt!)}',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildQRCodeWidget() {
    if (isLoading) {
      return const Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 16),
          Text('Generating QR Code...'),
        ],
      );
    }
    
    if (error != null) {
      return Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.error_outline,
            size: 64,
            color: Colors.red,
          ),
          const SizedBox(height: 16),
          Text(
            'Error: $error',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.red),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _generateQRCode,
            child: const Text('Retry'),
          ),
        ],
      );
    }
    
    if (qrData != null) {
      return QRCodeWidget(
        data: qrData!,
        size: 300,
      );
    }
    
    return const Text('No QR code available');
  }
  
  String _formatDateTime(DateTime dateTime) {
    return '${dateTime.day}/${dateTime.month}/${dateTime.year} '
           '${dateTime.hour.toString().padLeft(2, '0')}:'
           '${dateTime.minute.toString().padLeft(2, '0')}';
  }
}
```

## Conclusion

This comprehensive guide provides all the necessary components to implement QR code functionality in Flutter that is fully compatible with the web-based library management system. The implementation includes:

- **Enhanced QR code scanning** with better alignment tolerance
- **Robust encryption/decryption** compatible with the web app
- **Comprehensive error handling** for various edge cases
- **User-friendly interfaces** with clear instructions
- **Performance optimizations** for smooth operation
- **Security best practices** for data protection

Remember to test thoroughly with different devices and QR code types to ensure compatibility and reliability.