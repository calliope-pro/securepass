'use client';

import { useState, useEffect } from 'react';
import { useAuth0 } from '@/contexts/Auth0Context';
import { Crown, AlertTriangle, CheckCircle, Clock, HardDrive, FileText, Upload } from 'lucide-react';
import Link from 'next/link';
import { OpenAPI } from '@/lib/api/generated';
import { SubscriptionService } from '@/lib/api/generated/services/SubscriptionService';

interface UsageStats {
  plan: {
    name: string;
    display_name: string;
  };
  limits: {
    max_file_size: number;
    max_files_per_month: number;
    max_storage_total: number;
    max_downloads_per_file: number;
  };
  usage: {
    monthly_uploads: number;
    total_storage_used: number;
    total_files: number;
  };
  subscription: {
    status: string | null;
    current_period_end: string | null;
  };
}

export default function SubscriptionCard() {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsageStats();
    }
  }, [isAuthenticated]);

  const fetchUsageStats = async () => {
    try {
      const token = await getAccessTokenSilently();
      OpenAPI.TOKEN = token;

      const data = await SubscriptionService.getUserUsageApiV1SubscriptionUsageGet();
      setUsageStats(data);
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1073741824) {
      return `${(bytes / 1073741824).toFixed(1)}GB`;
    }
    if (bytes >= 1048576) {
      return `${(bytes / 1048576).toFixed(1)}MB`;
    }
    return `${Math.round(bytes / 1024)}KB`;
  };

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="glass rounded-2xl p-6 modern-shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!usageStats) {
    return null;
  }

  const isPro = usageStats.plan.name !== 'free';
  const monthlyUsagePercentage = getUsagePercentage(
    usageStats.usage.monthly_uploads,
    usageStats.limits.max_files_per_month
  );
  const storageUsagePercentage = getUsagePercentage(
    usageStats.usage.total_storage_used,
    usageStats.limits.max_storage_total
  );

  return (
    <div className="glass rounded-2xl p-6 modern-shadow">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${isPro ? 'bg-yellow-100' : 'bg-gray-100'}`}>
            {isPro ? (
              <Crown className="h-6 w-6 text-yellow-600" />
            ) : (
              <FileText className="h-6 w-6 text-gray-600" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {usageStats.plan.display_name}プラン
            </h3>
            {usageStats.subscription.status && (
              <p className="text-sm text-gray-600">
                ステータス: {usageStats.subscription.status}
              </p>
            )}
          </div>
        </div>
        
        {!isPro && (
          <Link
            href="/pricing"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors text-sm font-medium"
          >
            <Crown className="h-4 w-4" />
            <span>アップグレード</span>
          </Link>
        )}
      </div>

      <div className="space-y-4">
        {/* Monthly Upload Usage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Upload className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">今月のアップロード</span>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${getUsageColor(monthlyUsagePercentage)}`}>
              {usageStats.usage.monthly_uploads} / {usageStats.limits.max_files_per_month}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(monthlyUsagePercentage)}`}
              style={{ width: `${monthlyUsagePercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Storage Usage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <HardDrive className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">ストレージ使用量</span>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${getUsageColor(storageUsagePercentage)}`}>
              {formatFileSize(usageStats.usage.total_storage_used)} / {formatFileSize(usageStats.limits.max_storage_total)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(storageUsagePercentage)}`}
              style={{ width: `${storageUsagePercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Plan Limits Info */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">最大ファイルサイズ</span>
              <span className="font-medium">{formatFileSize(usageStats.limits.max_file_size)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">ダウンロード/ファイル</span>
              <span className="font-medium">{usageStats.limits.max_downloads_per_file}回</span>
            </div>
          </div>
        </div>

        {/* Warnings */}
        {(monthlyUsagePercentage >= 90 || storageUsagePercentage >= 90) && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-700 font-medium">
                使用量が上限に近づいています
              </p>
            </div>
            <p className="text-xs text-red-600 mt-1">
              制限に達するとアップロードできなくなります。プランのアップグレードを検討してください。
            </p>
          </div>
        )}

        {/* Subscription End Warning */}
        {isPro && usageStats.subscription.current_period_end && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-blue-700 font-medium">
                次回更新日: {new Date(usageStats.subscription.current_period_end).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}