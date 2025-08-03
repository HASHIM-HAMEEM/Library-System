import React, { useState, useEffect } from 'react';
import { Download, QrCode, User, Search, RefreshCw, Printer } from 'lucide-react';
import { qrCodeService, QRData } from '../lib/qrCodeService';
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
  role: string;
  institution_id?: string;
  profile_pic_url?: string;
}

interface QRCodeData {
  user: User;
  qrCodeUrl: string;
  qrData: QRData;
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
        where('status', '==', 'verified'),
        orderBy('name')
      );
      const querySnapshot = await getDocs(usersQuery);
      
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];

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
      const result = await qrCodeService.generateQRCode(user.id);
      
      const qrCodeData: QRCodeData = {
        user,
        qrCodeUrl: result.qrCodeUrl,
        qrData: result.qrData,
        generatedAt: new Date().toISOString()
      };

      setGeneratedQR(qrCodeData);
      setSelectedUser(user);
      toast.success(`QR code generated for ${user.name}`);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQRCode = () => {
    if (!generatedQR) return;

    const link = document.createElement('a');
    link.download = `qr-code-${generatedQR.user.name.replace(/\s+/g, '-')}.png`;
    link.href = generatedQR.qrCodeUrl;
    link.click();
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
    if (!user.subscription_valid_until) return false;
    return new Date(user.subscription_valid_until) > new Date();
  };

  const getSubscriptionStatus = (user: User) => {
    if (!user.subscription_valid_until) return 'No subscription';
    const isValid = isSubscriptionValid(user);
    const date = new Date(user.subscription_valid_until).toLocaleDateString();
    return isValid ? `Valid until ${date}` : `Expired on ${date}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg p-6" style={{backgroundColor: 'var(--bg-primary)'}}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>QR Code Generator</h2>
          <button
            onClick={fetchUsers}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
            }}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{color: 'var(--text-secondary)'}} />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users List */}
        <div className="rounded-lg p-6" style={{backgroundColor: 'var(--bg-primary)'}}>
          <h3 className="text-lg font-semibold text-white mb-4">Select User</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No users found</p>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-4 rounded-lg border cursor-pointer transition-colors"
                  style={{
                    backgroundColor: selectedUser?.id === user.id ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                    borderColor: selectedUser?.id === user.id ? 'var(--accent-color)' : 'var(--border-color)'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedUser?.id !== user.id) {
                      e.currentTarget.style.borderColor = 'var(--text-secondary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedUser?.id !== user.id) {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }
                  }}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <User className="w-8 h-8" style={{color: 'var(--text-secondary)'}} />
                      <div>
                        <p className="font-medium" style={{color: 'var(--text-primary)'}}>{user.name}</p>
                        <p className="text-sm" style={{color: 'var(--text-secondary)'}}>{user.email}</p>
                        <p className="text-xs capitalize" style={{color: 'var(--text-secondary)'}}>{user.role}</p>
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
                      <p className="text-xs mt-1" style={{color: 'var(--text-secondary)'}}>
                        {getSubscriptionStatus(user)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {selectedUser && (
            <div className="mt-4 pt-4 border-t border-gray-600">
              <button
                onClick={() => generateQRCode(selectedUser)}
                disabled={isGenerating}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)'
                }}
                onMouseEnter={(e) => {
                  if (!isGenerating) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isGenerating) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                  }
                }}
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
        <div className="rounded-lg p-6" style={{backgroundColor: 'var(--bg-primary)'}}>
          <h3 className="text-lg font-semibold text-white mb-4">Generated QR Code</h3>
          
          {generatedQR ? (
            <div className="space-y-4">
              {/* QR Code */}
              <div id="qr-code-print" className="p-6 rounded-lg text-center" style={{backgroundColor: 'var(--bg-primary)'}}>
                <img
                  src={generatedQR.qrCodeUrl}
                  alt="QR Code"
                  className="mx-auto mb-4"
                  style={{ maxWidth: '300px', width: '100%' }}
                />
                <div className="text-sm space-y-1" style={{color: 'var(--text-primary)'}}>
                  <p className="font-semibold">{generatedQR.user.name}</p>
                  <p>{generatedQR.user.email}</p>
                  <p className="capitalize">{generatedQR.user.role}</p>
                </div>
              </div>

              {/* User Details */}
              <div className="rounded-lg p-4 space-y-2 text-sm" style={{backgroundColor: 'var(--bg-secondary)'}}>
                <div className="flex justify-between">
                  <span style={{color: 'var(--text-secondary)'}}>Name:</span>
                  <span style={{color: 'var(--text-primary)'}}>{generatedQR.user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{color: 'var(--text-secondary)'}}>Email:</span>
                  <span style={{color: 'var(--text-primary)'}}>{generatedQR.user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{color: 'var(--text-secondary)'}}>Role:</span>
                  <span className="capitalize" style={{color: 'var(--text-primary)'}}>{generatedQR.user.role}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{color: 'var(--text-secondary)'}}>Subscription:</span>
                  <span className={`${
                    isSubscriptionValid(generatedQR.user) ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {getSubscriptionStatus(generatedQR.user)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{color: 'var(--text-secondary)'}}>Generated:</span>
                  <span style={{color: 'var(--text-primary)'}}>
                    {new Date(generatedQR.generatedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={downloadQRCode}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                  }}
                >
                  <Download className="w-4 h-4" />
                  <span>Download PNG</span>
                </button>
                <button
                  onClick={printQRCode}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                  }}
                >
                  <Printer className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <QrCode className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-400">Select a user and generate QR code</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRGenerator;