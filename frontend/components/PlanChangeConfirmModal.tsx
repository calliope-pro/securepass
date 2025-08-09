'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { AlertTriangle, Check } from 'lucide-react';
import type { PlanResponse, SubscriptionResponse } from '@/lib/api/generated';

interface PlanChangeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentPlan?: PlanResponse;
  targetPlan: PlanResponse;
  currentSubscription?: SubscriptionResponse | null;
  isProcessing?: boolean;
}

export default function PlanChangeConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  currentPlan,
  targetPlan,
  currentSubscription,
  isProcessing = false,
}: PlanChangeConfirmModalProps) {
  const formatPrice = (priceInCents: number) => {
    return `$${(priceInCents / 100).toFixed(2)}`;
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

  const isUpgrade = currentPlan && targetPlan.price > currentPlan.price;
  const isDowngrade = currentPlan && targetPlan.price < currentPlan.price;
  const isFreeChange = targetPlan.price === 0;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center mb-4">
                  {isFreeChange ? (
                    <div className="flex-shrink-0 w-10 h-10 mx-auto bg-orange-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-orange-600" />
                    </div>
                  ) : isUpgrade ? (
                    <div className="flex-shrink-0 w-10 h-10 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-6 h-6 text-green-600" />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-10 h-10 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-blue-600" />
                    </div>
                  )}
                </div>

                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 text-center mb-4"
                >
                  プラン変更の確認
                </Dialog.Title>

                <div className="mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">現在のプラン</span>
                      <span className="font-medium text-gray-900">
                        {currentPlan?.display_name || 'Free'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">変更後のプラン</span>
                      <span className="font-medium text-blue-600">
                        {targetPlan.display_name}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {isFreeChange && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <p className="text-sm text-orange-800">
                          <strong>注意:</strong> Freeプランに変更すると、有料機能が制限されます。
                        </p>
                      </div>
                    )}

                    <div className="text-sm text-gray-600">
                      <h4 className="font-medium text-gray-900 mb-2">
                        {targetPlan.display_name}プランの特徴:
                      </h4>
                      <ul className="space-y-1">
                        <li>• 最大ファイルサイズ: {formatFileSize(targetPlan.max_file_size)}</li>
                        <li>• 月間アップロード: {targetPlan.max_files_per_month}ファイル</li>
                        <li>• 総ストレージ: {formatFileSize(targetPlan.max_storage_total)}</li>
                        <li>• ファイルあたりダウンロード: {targetPlan.max_downloads_per_file}回</li>
                      </ul>
                    </div>

                    {!isFreeChange && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          月額料金: <strong>{formatPrice(targetPlan.price)}</strong>
                        </p>
                        {isUpgrade && (
                          <p className="text-xs text-blue-600 mt-1">
                            * アップグレードは即座に反映され、按分請求されます
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={onClose}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:opacity-50"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={onConfirm}
                    className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 ${
                      isFreeChange
                        ? 'bg-orange-600 hover:bg-orange-700 focus-visible:ring-orange-500'
                        : isUpgrade
                        ? 'bg-green-600 hover:bg-green-700 focus-visible:ring-green-500'
                        : 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500'
                    }`}
                  >
                    {isProcessing ? '処理中...' : 'プランを変更'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}