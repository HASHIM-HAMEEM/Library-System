import { getAppCheckToken, forceRefreshAppCheckToken, logAppCheckStatus } from './firebase';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

/**
 * App Check debugging utilities
 * Helps diagnose and fix App Check token issues
 */
export class AppCheckDebugger {
  private static testResults: Array<{
    timestamp: string;
    test: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: any;
  }> = [];

  /**
   * Run comprehensive App Check diagnostics
   */
  static async runDiagnostics(): Promise<void> {
    console.log('🔍 Starting App Check diagnostics...');
    this.testResults = [];

    await this.testTokenGeneration();
    await this.testTokenRefresh();
    await this.testFunctionCall();
    await this.testFunctionCallWithRefresh();
    
    this.printResults();
  }

  /**
   * Test basic token generation
   */
  private static async testTokenGeneration(): Promise<void> {
    try {
      const token = await getAppCheckToken();
      if (token) {
        this.addResult('Token Generation', 'pass', `Token generated successfully (${token.substring(0, 20)}...)`);
      } else {
        this.addResult('Token Generation', 'fail', 'No token returned');
      }
    } catch (error: any) {
      this.addResult('Token Generation', 'fail', `Token generation failed: ${error.message}`, error);
    }
  }

  /**
   * Test token refresh functionality
   */
  private static async testTokenRefresh(): Promise<void> {
    try {
      const token = await forceRefreshAppCheckToken();
      if (token) {
        this.addResult('Token Refresh', 'pass', `Token refreshed successfully (${token.substring(0, 20)}...)`);
      } else {
        this.addResult('Token Refresh', 'fail', 'No token returned from refresh');
      }
    } catch (error: any) {
      this.addResult('Token Refresh', 'fail', `Token refresh failed: ${error.message}`, error);
    }
  }

  /**
   * Test Firebase Function call
   */
  private static async testFunctionCall(): Promise<void> {
    try {
      const getQrEncryptionKey = httpsCallable(functions, 'getQrEncryptionKey');
      const result = await getQrEncryptionKey();
      
      if (result.data) {
        this.addResult('Function Call', 'pass', 'Function call successful', result.data);
      } else {
        this.addResult('Function Call', 'warning', 'Function call returned no data');
      }
    } catch (error: any) {
      this.addResult('Function Call', 'fail', `Function call failed: ${error.message}`, error);
    }
  }

  /**
   * Test Firebase Function call with token refresh
   */
  private static async testFunctionCallWithRefresh(): Promise<void> {
    try {
      // Force refresh token first
      await forceRefreshAppCheckToken();
      
      const getQrEncryptionKey = httpsCallable(functions, 'getQrEncryptionKey');
      const result = await getQrEncryptionKey();
      
      if (result.data) {
        this.addResult('Function Call (with refresh)', 'pass', 'Function call with refresh successful', result.data);
      } else {
        this.addResult('Function Call (with refresh)', 'warning', 'Function call with refresh returned no data');
      }
    } catch (error: any) {
      this.addResult('Function Call (with refresh)', 'fail', `Function call with refresh failed: ${error.message}`, error);
    }
  }

  /**
   * Add test result
   */
  private static addResult(
    test: string, 
    status: 'pass' | 'fail' | 'warning', 
    message: string, 
    details?: any
  ): void {
    this.testResults.push({
      timestamp: new Date().toISOString(),
      test,
      status,
      message,
      details
    });
  }

  /**
   * Print diagnostic results
   */
  private static printResults(): void {
    console.log('\n📊 App Check Diagnostic Results:');
    console.log('================================');
    
    this.testResults.forEach((result, index) => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
      console.log(`${index + 1}. ${icon} ${result.test}: ${result.message}`);
      
      if (result.details && result.status === 'fail') {
        console.log(`   Details:`, result.details);
      }
    });
    
    const passCount = this.testResults.filter(r => r.status === 'pass').length;
    const failCount = this.testResults.filter(r => r.status === 'fail').length;
    const warningCount = this.testResults.filter(r => r.status === 'warning').length;
    
    console.log('\n📈 Summary:');
    console.log(`   ✅ Passed: ${passCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   ⚠️  Warnings: ${warningCount}`);
    
    if (failCount > 0) {
      console.log('\n🔧 Troubleshooting Tips:');
      console.log('1. Ensure debug token is added to Firebase Console');
      console.log('2. Check that getQrEncryptionKey function is enrolled for App Check');
      console.log('3. Verify the app is listed in "Allowed apps" for the function');
      console.log('4. Wait up to 15 minutes for console changes to propagate');
      console.log('5. Check Firebase Console > Functions > Logs for detailed errors');
    }
  }

  /**
   * Monitor App Check token status continuously
   */
  static startMonitoring(intervalMs: number = 30000): () => void {
    console.log(`🔄 Starting App Check monitoring (every ${intervalMs/1000}s)...`);
    
    const interval = setInterval(async () => {
      await logAppCheckStatus();
    }, intervalMs);
    
    return () => {
      clearInterval(interval);
      console.log('⏹️ App Check monitoring stopped');
    };
  }

  /**
   * Get diagnostic results for external use
   */
  static getResults() {
    return [...this.testResults];
  }

  /**
   * Clear diagnostic results
   */
  static clearResults(): void {
    this.testResults = [];
  }
}

// Export convenience function for quick diagnostics
export const runAppCheckDiagnostics = () => AppCheckDebugger.runDiagnostics();
export const startAppCheckMonitoring = (intervalMs?: number) => AppCheckDebugger.startMonitoring(intervalMs);