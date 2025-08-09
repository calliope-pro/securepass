# backend/app/api/v1/endpoints/subscription.py
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from typing import Optional, List, Annotated
from datetime import datetime, timezone
import stripe
import json
import logging

from app.core.auth import require_auth
from app.core.config import settings
from app.core.database import prisma
from app.schemas.auth import AuthUser
from app.schemas.subscription import (
    PlanResponse,
    SubscriptionResponse,
    CreateCheckoutSessionRequest,
    CreateCheckoutSessionResponse,
    CustomerPortalSessionRequest,
    CustomerPortalSessionResponse,
    WebhookEventResponse
)
from app.services.stripe_service import StripeService
from app.services.plan_limit_service import PlanLimitService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/plans", response_model=List[PlanResponse])
async def get_plans():
    """利用可能なプランの一覧を取得"""
    try:
        plans = await prisma.plan.find_many(
            where={"isActive": True},
            order={"price": "asc"}
        )
        
        return [
            PlanResponse(
                id=plan.id,
                name=plan.name,
                display_name=plan.displayName,
                price=plan.price,
                currency=plan.currency,
                stripe_price_id=plan.stripePriceId,
                max_file_size=plan.maxFileSize,
                max_files_per_month=plan.maxFilesPerMonth,
                max_storage_total=plan.maxStorageTotal,
                max_downloads_per_file=plan.maxDownloadsPerFile,
                features_json=plan.featuresJson,
                is_active=plan.isActive
            )
            for plan in plans
        ]
    except Exception as e:
        logger.error(f"Error fetching plans: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch plans"
        )


@router.get("/subscription", response_model=Optional[SubscriptionResponse])
async def get_current_subscription(
    current_user: Annotated[AuthUser, Depends(require_auth)]
):
    """現在のユーザーのサブスクリプション情報を取得"""
    try:
        subscription = await prisma.subscription.find_unique(
            where={"userId": current_user.id},
            include={"plan": True}
        )
        
        if not subscription:
            return None
        
        return SubscriptionResponse(
            id=subscription.id,
            user_id=subscription.userId,
            plan=PlanResponse(
                id=subscription.plan.id,
                name=subscription.plan.name,
                display_name=subscription.plan.displayName,
                price=subscription.plan.price,
                currency=subscription.plan.currency,
                stripe_price_id=subscription.plan.stripePriceId,
                max_file_size=subscription.plan.maxFileSize,
                max_files_per_month=subscription.plan.maxFilesPerMonth,
                max_storage_total=subscription.plan.maxStorageTotal,
                max_downloads_per_file=subscription.plan.maxDownloadsPerFile,
                features_json=subscription.plan.featuresJson,
                is_active=subscription.plan.isActive
            ),
            stripe_customer_id=subscription.stripeCustomerId,
            stripe_subscription_id=subscription.stripeSubscriptionId,
            status=subscription.status,
            current_period_start=subscription.currentPeriodStart,
            current_period_end=subscription.currentPeriodEnd,
            cancel_at_period_end=subscription.cancelAtPeriodEnd,
            canceled_at=subscription.canceledAt,
            trial_start=subscription.trialStart,
            trial_end=subscription.trialEnd,
            created_at=subscription.createdAt,
            updated_at=subscription.updatedAt
        )
    except Exception as e:
        logger.error(f"Error fetching subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch subscription"
        )


@router.post("/checkout", response_model=CreateCheckoutSessionResponse)
async def create_checkout_session(
    request: CreateCheckoutSessionRequest,
    current_user: Annotated[AuthUser, Depends(require_auth)]
):
    """プラン変更処理（Freeプランは直接変更、有料プラン間は更新、新規は Checkout）"""
    try:
        # プランの取得
        plan = await prisma.plan.find_unique(where={"id": request.plan_id})
        if not plan:
            raise ValueError(f"Plan not found: {request.plan_id}")
        
        # 現在のサブスクリプション状況を確認
        current_subscription = await prisma.subscription.find_unique(
            where={"userId": current_user.id},
            include={"plan": True}
        )
        
        # Freeプランへの変更の場合は直接変更
        if plan.name == "free" or not plan.stripePriceId:
            # 既存のStripeサブスクリプションがある場合はキャンセル
            if (current_subscription and 
                current_subscription.stripeSubscriptionId):
                try:
                    stripe.Subscription.cancel(current_subscription.stripeSubscriptionId)
                    logger.info(f"Canceled Stripe subscription: {current_subscription.stripeSubscriptionId}")
                except Exception as e:
                    logger.warning(f"Failed to cancel Stripe subscription: {e}")
            
            await prisma.subscription.upsert(
                where={"userId": current_user.id},
                data={
                    "create": {
                        "userId": current_user.id,
                        "planId": plan.id,
                        "status": "active",
                        "stripeCustomerId": None,
                        "stripeSubscriptionId": None
                    },
                    "update": {
                        "planId": plan.id,
                        "status": "active",
                        "stripeSubscriptionId": None,
                        # stripeCustomerIdは保持（支払い方法を維持するため）
                        "stripeCustomerId": current_subscription.stripeCustomerId if current_subscription else None
                    }
                }
            )
            
            logger.info(f"User {current_user.id} changed to {plan.name} plan directly")
            
            return CreateCheckoutSessionResponse(
                checkout_url=request.success_url,
                session_id=None
            )
        
        # 現在有料プランで、別の有料プランに変更する場合はサブスクリプション更新
        if (current_subscription and 
            current_subscription.stripeSubscriptionId and 
            current_subscription.plan.stripePriceId):
            
            result = await StripeService.update_subscription_plan(
                user=current_user,
                plan_id=request.plan_id
            )
            
            logger.info(f"Updated subscription for user {current_user.id} to {plan.name}")
            
            return CreateCheckoutSessionResponse(
                checkout_url=request.success_url,
                session_id=None
            )
        
        # 新規有料プランの場合、既存の支払い方法をチェック
        try:
            # 既存の支払い方法で直接サブスクリプションを作成を試行
            result = await StripeService.create_direct_subscription(
                user=current_user,
                plan_id=request.plan_id
            )
            
            logger.info(f"Created direct subscription for user {current_user.id}")
            
            return CreateCheckoutSessionResponse(
                checkout_url=request.success_url,
                session_id=None
            )
            
        except ValueError as e:
            if "No default payment method found" in str(e):
                # 支払い方法がない場合はCheckoutセッションを作成
                result = await StripeService.create_checkout_session(
                    user=current_user,
                    plan_id=request.plan_id,
                    success_url=request.success_url,
                    cancel_url=request.cancel_url
                )
                
                return CreateCheckoutSessionResponse(
                    checkout_url=result["checkout_url"],
                    session_id=result["session_id"]
                )
            else:
                # その他のエラーは再発生
                raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error processing plan change: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process plan change"
        )


@router.post("/customer-portal", response_model=CustomerPortalSessionResponse)
async def create_customer_portal_session(
    request: CustomerPortalSessionRequest,
    current_user: Annotated[AuthUser, Depends(require_auth)]
):
    """Stripe Customer Portalセッションを作成"""
    try:
        portal_url = await StripeService.create_customer_portal_session(
            user=current_user,
            return_url=request.return_url
        )
        
        return CustomerPortalSessionResponse(url=portal_url)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating customer portal session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create customer portal session"
        )


@router.post("/webhooks/stripe", response_model=WebhookEventResponse)
async def handle_stripe_webhook(
    request: Request,
    stripe_signature: Annotated[Optional[str], Header(alias="stripe-signature")] = None
):
    """Stripe Webhookイベントを処理"""
    try:
        # リクエストボディを取得
        payload = await request.body()
        
        if not stripe_signature:
            logger.warning("Missing Stripe signature header")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing Stripe signature"
            )
        
        # Webhookの署名を検証
        try:
            event = stripe.Webhook.construct_event(
                payload,
                stripe_signature,
                settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError as e:
            logger.error(f"Invalid payload: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payload"
            )
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid signature: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid signature"
            )
        
        # イベントの冪等性チェック
        existing_event = await prisma.stripeevent.find_unique(
            where={"stripeEventId": event["id"]}
        )
        
        if existing_event and existing_event.processed:
            logger.info(f"Event already processed: {event['id']}")
            return WebhookEventResponse(received=True)
        
        # イベントレコードを作成または更新
        event_record = await prisma.stripeevent.upsert(
            where={"stripeEventId": event["id"]},
            data={
                "create": {
                    "stripeEventId": event["id"],
                    "eventType": event["type"],
                    "data": json.dumps(event["data"]),
                    "processed": False
                },
                "update": {
                    "eventType": event["type"],
                    "data": json.dumps(event["data"])
                }
            }
        )
        
        # イベントタイプに応じて処理
        if event["type"] in [
            "customer.subscription.created",
            "customer.subscription.updated",
            "customer.subscription.deleted"
        ]:
            subscription_data = event["data"]["object"]
            await StripeService.sync_subscription_from_stripe(subscription_data)
        
        # イベントを処理済みとしてマーク
        await prisma.stripeevent.update(
            where={"id": event_record.id},
            data={
                "processed": True,
                "processedAt": datetime.now(timezone.utc)
            }
        )
        
        logger.info(f"Successfully processed Stripe event: {event['id']} ({event['type']})")
        
        return WebhookEventResponse(received=True)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process webhook"
        )



@router.get("/usage")
async def get_user_usage(
    current_user: Annotated[AuthUser, Depends(require_auth)]
):
    """ユーザーの使用量統計を取得"""
    try:
        usage_stats = await PlanLimitService.get_user_usage_stats(current_user)
        return usage_stats
    except Exception as e:
        logger.error(f"Error fetching user usage: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch usage statistics"
        )