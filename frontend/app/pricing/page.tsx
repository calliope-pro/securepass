'use client';

import { useState } from 'react';
import { useAuth0 } from '@/contexts/Auth0Context';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { OpenAPI, type PlanResponse, type SubscriptionResponse } from '@/lib/api/generated';
import { SubscriptionService } from '@/lib/api/generated/services/SubscriptionService';
import toast from 'react-hot-toast';
import PlanChangeConfirmModal from '@/components/PlanChangeConfirmModal';

export default function PricingPage() {
  const { isAuthenticated, getAccessTokenSilently, isLoading: authLoading } = useAuth0();
  const router = useRouter();
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanResponse | null>(null);

  // プラン一覧取得
  const { data: plans = [], isLoading: plansLoading, error: plansError } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => SubscriptionService.getPlansApiV1SubscriptionPlansGet(),
    staleTime: 300000, // 5分間キャッシュ（プランはあまり変わらない）
    retry: 3,
  });

  // 現在のサブスクリプション情報取得
  const { data: currentSubscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['current-subscription'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      OpenAPI.TOKEN = token;
      return SubscriptionService.getCurrentSubscriptionApiV1SubscriptionSubscriptionGet();
    },
    enabled: isAuthenticated,
    staleTime: 30000, // 30秒間キャッシュ
  });

  const handlePlanClick = (plan: PlanResponse) => {
    if (!isAuthenticated) {
      toast.error('ログインが必要です');
      return;
    }

    // 現在のプランと同じ場合は何もしない
    if (currentSubscription?.plan.id === plan.id) {
      return;
    }

    setSelectedPlan(plan);
    setConfirmModalOpen(true);
  };

  const handleConfirmPlanChange = async () => {
    if (!selectedPlan) return;

    setProcessingPlanId(selectedPlan.id);
    try {
      const token = await getAccessTokenSilently();
      OpenAPI.TOKEN = token;

      const data = await SubscriptionService.createCheckoutSessionApiV1SubscriptionCheckoutPost({
        plan_id: selectedPlan.id,
        success_url: `${window.location.origin}/dashboard?subscription=success`,
        cancel_url: `${window.location.origin}/pricing?canceled=true`,
      });
      
      if (data.checkout_url) {
        // checkout_urlがあればStripe Checkoutにリダイレクト
        window.location.href = data.checkout_url;
      } else {
        // checkout_urlがなければ直接プラン変更が完了
        toast.success(`${selectedPlan.display_name}プランに変更しました！`);
        setConfirmModalOpen(false);
        // サブスクリプション情報を再取得
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Error processing plan change:', error);
      toast.error(error?.body?.detail || 'プラン変更に失敗しました');
    } finally {
      setProcessingPlanId(null);
      setSelectedPlan(null);
      setConfirmModalOpen(false);
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

  const formatPrice = (priceInCents: number) => {
    return `$${(priceInCents / 100).toFixed(2)}`;
  };

  if (authLoading || plansLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">プランを読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラーハンドリング
  if (plansError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">プランの取得に失敗しました</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            料金プラン
          </h1>
          <p className="text-lg text-gray-600">
            あなたのニーズに合わせたプランを選択してください
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans && plans.length > 0 ? plans.map((plan) => {
            const isCurrentPlan = currentSubscription?.plan.id === plan.id;
            const isFree = plan.price === 0;
            const isPopular = plan.name === 'pro';

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-lg shadow-sm border-2 ${
                  isCurrentPlan
                    ? 'border-green-500'
                    : isPopular
                    ? 'border-blue-500'
                    : 'border-gray-200'
                } p-8 relative`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      人気
                    </span>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      現在のプラン
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.display_name}
                  </h3>
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    {isFree ? '無料' : formatPrice(plan.price)}
                    {!isFree && <span className="text-lg text-gray-600">/月</span>}
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">
                      最大ファイルサイズ: {formatFileSize(plan.max_file_size)}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">
                      月間アップロード: {plan.max_files_per_month}ファイル
                    </span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">
                      総ストレージ: {formatFileSize(plan.max_storage_total)}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">
                      ファイルあたりダウンロード: {plan.max_downloads_per_file}回
                    </span>
                  </li>
                </ul>

                <button
                  onClick={() => handlePlanClick(plan)}
                  disabled={isCurrentPlan || processingPlanId === plan.id}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    isCurrentPlan
                      ? 'bg-green-100 text-green-700 cursor-not-allowed'
                      : isFree
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : isPopular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-800 text-white hover:bg-gray-900'
                  } disabled:opacity-50`}
                >
                  {processingPlanId === plan.id
                    ? '処理中...'
                    : isCurrentPlan
                    ? '現在のプラン'
                    : isFree
                    ? currentSubscription
                      ? 'Freeプランに変更'
                      : '無料で始める'
                    : currentSubscription
                    ? `${plan.display_name}に変更`
                    : '今すぐ始める'
                  }
                </button>
              </div>
            );
          }) : (
            <div className="col-span-3 text-center text-gray-600">
              プランが見つかりませんでした
            </div>
          )}
        </div>

        {isAuthenticated && currentSubscription && (
          <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  サブスクリプション管理
                </h3>
                <p className="text-gray-600 mt-1">
                  請求情報の確認や解約はStripeカスタマーポータルで行えます
                </p>
              </div>
              <button
                onClick={async () => {
                  try {
                    const token = await getAccessTokenSilently();
                    OpenAPI.TOKEN = token;

                    const data = await SubscriptionService.createCustomerPortalSessionApiV1SubscriptionCustomerPortalPost({
                      return_url: window.location.href,
                    });
                    
                    if (data.url) {
                      window.location.href = data.url;
                    } else {
                      toast.error('ポータルURLの取得に失敗しました');
                    }
                  } catch (error: any) {
                    console.error('Error creating customer portal session:', error);
                    toast.error(error?.body?.detail || 'ポータルの開始に失敗しました');
                  }
                }}
                className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors"
              >
                カスタマーポータル
              </button>
            </div>
          </div>
        )}

        {/* プラン変更確認モーダル */}
        {selectedPlan && (
          <PlanChangeConfirmModal
            isOpen={confirmModalOpen}
            onClose={() => {
              setConfirmModalOpen(false);
              setSelectedPlan(null);
            }}
            onConfirm={handleConfirmPlanChange}
            currentPlan={currentSubscription?.plan}
            targetPlan={selectedPlan}
            currentSubscription={currentSubscription}
            isProcessing={processingPlanId === selectedPlan.id}
          />
        )}
      </div>
    </div>
  );
}