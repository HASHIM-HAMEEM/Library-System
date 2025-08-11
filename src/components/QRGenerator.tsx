import React, { useState, useEffect } from 'react';
import { Download, QrCode, User, Search, RefreshCw, Printer } from 'lucide-react';
import DynamicQRService from '../lib/dynamicQRService';
import { db } from '../lib/firebase';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface User {
  id: string;
  name: string;
  email: string;
  subscription_valid_until?: string;
  subscription_end?: string;
  role: string;
  institution_id?: string;
  profile_pic_url?: string;
}

interface QRCodeData {
  user: User;
  qrCodeUrl: string;
  qrData: string;
  generatedAt: string;
}

const QRGenerator: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [generatedQR, setGeneratedQR] = useState<QRCodeData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const usersQuery = query(
        collection(db, 'user_profiles'),
        where('status', '==', 'verified')
      );
      const querySnapshot = await getDocs(usersQuery);
      
      const usersData = querySnapshot.docs
        .map(doc => {
          const data: any = doc.data();
          const subscription_valid_until = data?.subscription_valid_until?.toDate
            ? data.subscription_valid_until.toDate().toISOString()
            : (data?.subscription_valid_until ?? undefined);
          const subscription_end = data?.subscription_end?.toDate
            ? data.subscription_end.toDate().toISOString()
            : (data?.subscription_end ?? undefined);

          const user: User = {
            id: doc.id,
            name: data?.name ?? '',
            email: data?.email ?? '',
            role: data?.role ?? '',
            institution_id: data?.institution_id,
            profile_pic_url: data?.profile_pic_url,
            subscription_valid_until,
            subscription_end,
          };
          return user;
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchTerm) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    setFilteredUsers(filtered);
  };

  const generateQRCode = async (user: User) => {
    try {
      setIsGenerating(true);
      const result = await DynamicQRService.generateInitialQRCode(user.id);
      
      if (!result.success || !result.qrCodeUrl || !result.qrData) {
        throw new Error(result.error || 'Failed to generate QR');
      }
      
      const qrCodeData: QRCodeData = {
        user,
        qrCodeUrl: result.qrCodeUrl,
        qrData: result.qrData,
        generatedAt: new Date().toISOString()
      };

      setGeneratedQR(qrCodeData);
      setSelectedUser(user);
      toast.success(`QR code generated for ${user.name}`);
    } catch (error: any) {
      console.error('Error generating QR code:', error);
      const msg = typeof error?.message === 'string' ? error.message : 'Failed to generate QR code';
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQRCode = () => {
    if (!generatedQR) return;

    const link = document.createElement('a');
    link.download = `qr-code-${generatedQR.user.name.replace(/\s+/g, '-')}.png`;
    link.href = generatedQR.qrCodeUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printQRCode = async () => {
    if (!generatedQR) return;

    try {
      const qrElement = document.getElementById('qr-code-print');
      if (!qrElement) return;

      const canvas = await html2canvas(qrElement, {
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim(),
        scale: 2
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 80;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const x = (210 - imgWidth) / 2; // Center horizontally
      const y = 50;

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, imgWidth, imgHeight);
      
      // Add user information
      pdf.setFontSize(16);
      pdf.text('Library Access QR Code', 105, 30, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.text(`Name: ${generatedQR.user.name}`, 20, y + imgHeight + 20);
      pdf.text(`Email: ${generatedQR.user.email}`, 20, y + imgHeight + 30);
      pdf.text(`Role: ${generatedQR.user.role}`, 20, y + imgHeight + 40);
      
      if (generatedQR.user.subscription_valid_until) {
        pdf.text(
          `Subscription Valid Until: ${new Date(generatedQR.user.subscription_valid_until).toLocaleDateString()}`,
          20,
          y + imgHeight + 50
        );
      }
      
      pdf.text(`Generated: ${new Date(generatedQR.generatedAt).toLocaleDateString()}`, 20, y + imgHeight + 60);

      pdf.save(`qr-code-${generatedQR.user.name.replace(/\s+/g, '-')}.pdf`);
      toast.success('QR code PDF downloaded');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const isSubscriptionValid = (user: User) => {
    const subscriptionEnd = user.subscription_end || user.subscription_valid_until;
    if (!subscriptionEnd) return false;
    return new Date(subscriptionEnd) > new Date();
  };

  const getSubscriptionStatus = (user: User) => {
    const subscriptionEnd = user.subscription_end || user.subscription_valid_until;
    if (!subscriptionEnd) return 'No subscription';
    const isValid = isSubscriptionValid(user);
    const date = new Date(subscriptionEnd).toLocaleDateString();
    return isValid ? `Valid until ${date}` : `Expired on ${date}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-gray-900 dark:text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg p-6 bg-white dark:bg-black border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">QR Code Generator</h2>
          <button
            onClick={fetchUsers}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors border border-gray-200 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-700 dark:text-gray-300" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none border border-gray-200 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users List */}
        <div className="rounded-lg p-6 bg-white dark:bg-black border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select User</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <p className="text-gray-700 dark:text-gray-300 text-center py-8">No users found</p>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedUser?.id === user.id 
                      ? 'bg-gray-100 dark:bg-gray-800 border-blue-500 dark:border-blue-400' 
                      : 'bg-white dark:bg-black border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                  onClick={() => { setSelectedUser(user); setGeneratedQR(null); }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <User className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{user.email}</p>
                        <p className="text-xs capitalize text-gray-700 dark:text-gray-300">{user.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded ${
                        isSubscriptionValid(user)
                          ? 'bg-green-900 text-green-400'
                          : 'bg-red-900 text-red-400'
                      }`}>
                        {isSubscriptionValid(user) ? 'Active' : 'Expired'}
                      </span>
                      <p className="text-xs mt-1 text-gray-700 dark:text-gray-300">
                        {getSubscriptionStatus(user)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {selectedUser && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => generateQRCode(selectedUser)}
                disabled={isGenerating}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <QrCode className="w-4 h-4" />
                )}
                <span>{isGenerating ? 'Generating...' : 'Generate QR Code'}</span>
              </button>
            </div>
          )}
        </div>

        {/* QR Code Display */}
        <div className="rounded-lg p-6 bg-white dark:bg-black border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Generated QR Code</h3>
          
          {generatedQR ? (
            <div className="space-y-4">
              {/* QR Code */}
              <div id="qr-code-print" className="p-6 rounded-lg text-center bg-white dark:bg-black border border-gray-200 dark:border-gray-700">
                <img
                  src={generatedQR.qrCodeUrl}
                  alt="QR Code"
                  className="mx-auto mb-4"
                  style={{ maxWidth: '300px', width: '100%' }}
                />
                <div className="text-sm space-y-1 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 bg-white dark:bg-black">
                  <p className="font-semibold">{generatedQR.user.name}</p>
                  <p>{generatedQR.user.email}</p>
                  <p className="capitalize">{generatedQR.user.role}</p>
                </div>
              </div>

              {/* User Details */}
              <div className="rounded-lg p-4 space-y-2 text-sm bg-transparent border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Name:</span>
                  <span className="text-gray-900 dark:text-white">{generatedQR.user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Email:</span>
                  <span className="text-gray-900 dark:text-white">{generatedQR.user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Role:</span>
                  <span className="capitalize text-gray-900 dark:text-white">{generatedQR.user.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Subscription:</span>
                  <span className={`${
                    isSubscriptionValid(generatedQR.user) ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {getSubscriptionStatus(generatedQR.user)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Generated:</span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(generatedQR.generatedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={downloadQRCode}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors border border-gray-200 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PNG</span>
                </button>
                <button
                  onClick={printQRCode}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors border border-gray-200 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <Printer className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 border border-gray-200 dark:border-gray-700 bg-white dark:bg-black">
              <QrCode className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 dark:text-gray-500">Select a user and generate QR code</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRGenerator;