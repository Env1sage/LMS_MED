import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Trash2,
  Calendar,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Info,
} from 'lucide-react';
import apiService from '../../services/api.service';
import { formatDate } from '../../utils/dateUtils';

interface OfflineDevice {
  id: string;
  deviceId: string;
  expiresAt: string;
  createdAt: string;
}

interface Props {
  learningUnitId: string;
  learningUnitTitle: string;
}

export const OfflineDeviceManager: React.FC<Props> = ({
  learningUnitId,
  learningUnitTitle,
}) => {
  const [devices, setDevices] = useState<OfflineDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    loadDevices();
  }, [learningUnitId]);

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get<OfflineDevice[]>(
        `/api/offline/devices/${learningUnitId}`
      );
      setDevices(response.data);
    } catch (err: any) {
      console.error('Failed to load devices:', err);
      setError(err.response?.data?.message || 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeDevice = async (downloadId: string, deviceId: string) => {
    if (!confirm('Are you sure you want to revoke offline access for this device?')) {
      return;
    }

    try {
      setRevokingId(downloadId);
      setError(null);
      setSuccess(null);

      await apiService.delete(`/api/offline/device/${downloadId}`);

      setSuccess('Device access revoked successfully');
      setTimeout(() => setSuccess(null), 3000);

      // Reload devices
      await loadDevices();
    } catch (err: any) {
      console.error('Failed to revoke device:', err);
      setError(err.response?.data?.message || 'Failed to revoke device');
    } finally {
      setRevokingId(null);
    }
  };

  const formatDeviceId = (deviceId: string) => {
    // Show first 8 and last 8 characters
    if (deviceId.length > 20) {
      return `${deviceId.substring(0, 8)}...${deviceId.substring(deviceId.length - 8)}`;
    }
    return deviceId;
  };

  const isExpiringSoon = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysRemaining <= 3 && daysRemaining > 0;
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-5 h-5 animate-spin text-[#0A84FF]" />
        <span className="ml-2 text-sm text-gray-600">Loading devices...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Active Devices</h3>
          <p className="text-sm text-gray-600 mt-1">{learningUnitTitle}</p>
        </div>
        <button
          onClick={loadDevices}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Devices List */}
      {devices.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No active devices</p>
          <p className="text-sm text-gray-500 mt-1">
            Download this book for offline access to see your devices here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => (
            <div
              key={device.id}
              className={`p-4 rounded-lg border ${
                isExpired(device.expiresAt)
                  ? 'bg-red-50 border-red-200'
                  : isExpiringSoon(device.expiresAt)
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <Smartphone className="w-5 h-5 text-gray-700 mr-2" />
                    <span className="font-mono text-sm text-gray-900">
                      {formatDeviceId(device.deviceId)}
                    </span>
                  </div>

                  <div className="mt-2 space-y-1">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      {isExpired(device.expiresAt) ? (
                        <span className="text-red-600 font-medium">
                          Expired on {formatDate(device.expiresAt)}
                        </span>
                      ) : isExpiringSoon(device.expiresAt) ? (
                        <span className="text-yellow-700 font-medium">
                          Expires {formatDate(device.expiresAt)}
                        </span>
                      ) : (
                        <span>
                          Expires {formatDate(device.expiresAt)}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-500">
                      Added {formatDate(device.createdAt)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleRevokeDevice(device.id, device.deviceId)}
                  disabled={revokingId === device.id}
                  className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Revoke access"
                >
                  {revokingId === device.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>

              {isExpiringSoon(device.expiresAt) && !isExpired(device.expiresAt) && (
                <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800 flex items-start">
                  <Info className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span>
                    Reconnect online to renew your offline access before it expires
                  </span>
                </div>
              )}

              {isExpired(device.expiresAt) && (
                <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-800 flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span>
                    This device's offline access has expired. Reconnect online to renew.
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Device Management</p>
            <ul className="space-y-1">
              <li>• Each device stores encrypted content locally</li>
              <li>• Revoke access if you lose a device or want to free up slots</li>
              <li>• Reconnect online before expiry to automatically renew access</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
