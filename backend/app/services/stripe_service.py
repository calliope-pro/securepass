# backend/app/services/stripe_service.py
import stripe
from typing import Optional, Dict, Any
from app.core.config import settings
from app.core.database import prisma
from app.schemas.auth import AuthUser
import logging

logger = logging.getLogger(__name__)

# Stripeクライアントの初期化
stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeService:
    @staticmethod
    async def get_or_create_customer(user: AuthUser) -> str:
        """ユーザーに対応するStripeカスタマーを取得または作成"""
        try:
            # 既存のサブスクリプションからStripeカスタマーIDを取得
            subscription = await prisma.subscription.find_unique(
                where={"userId": user.id}
            )
            
            if subscription and subscription.stripeCustomerId:
                # 既存のStripeカスタマーが存在する場合は検証
                try:
                    stripe_customer = stripe.Customer.retrieve(subscription.stripeCustomerId)
                    if not getattr(stripe_customer, 'deleted', False):
                        return subscription.stripeCustomerId
                except stripe.error.InvalidRequestError:
                    logger.warning(f"Invalid Stripe customer ID: {subscription.stripeCustomerId}")
                    # 無効なカスタマーIDの場合は新規作成
            
            # 新しいStripeカスタマーを作成
            stripe_customer = stripe.Customer.create(
                email=user.email,
                name=user.full_name,
                metadata={"user_id": user.id}
            )
            
            logger.info(f"Created Stripe customer: {stripe_customer.id} for user: {user.id}")
            
            # サブスクリプションレコードが存在する場合は更新
            if subscription:
                await prisma.subscription.update(
                    where={"userId": user.id},
                    data={"stripeCustomerId": stripe_customer.id}
                )
            
            return stripe_customer.id
            
        except Exception as e:
            logger.error(f"Error creating Stripe customer: {e}")
            raise
    
    @staticmethod
    async def create_checkout_session(
        user: AuthUser,
        plan_id: str,
        success_url: str,
        cancel_url: str
    ) -> Dict[str, str]:
        """Stripe Checkoutセッションを作成"""
        try:
            # プランの取得
            plan = await prisma.plan.find_unique(where={"id": plan_id})
            if not plan or not plan.stripePriceId:
                raise ValueError(f"Invalid plan or missing Stripe price ID: {plan_id}")
            
            # Stripeカスタマーの取得または作成
            customer_id = await StripeService.get_or_create_customer(user)
            
            # Checkoutセッションの作成
            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=["card"],
                line_items=[
                    {
                        "price": plan.stripePriceId,
                        "quantity": 1,
                    }
                ],
                mode="subscription",
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    "user_id": user.id,
                    "plan_id": plan_id
                },
                subscription_data={
                    "metadata": {
                        "user_id": user.id,
                        "plan_id": plan_id
                    }
                }
            )
            
            logger.info(f"Created checkout session: {session.id} for user: {user.id}")
            
            return {
                "checkout_url": session.url,
                "session_id": session.id
            }
            
        except Exception as e:
            logger.error(f"Error creating checkout session: {e}")
            raise
    
    @staticmethod
    async def create_customer_portal_session(
        user: AuthUser,
        return_url: str
    ) -> str:
        """Stripe Customer Portalセッションを作成"""
        try:
            # Stripeカスタマーの取得
            subscription = await prisma.subscription.find_unique(
                where={"userId": user.id}
            )
            
            if not subscription or not subscription.stripeCustomerId:
                raise ValueError("No Stripe customer found for user")
            
            # Customer Portalセッションの作成
            session = stripe.billing_portal.Session.create(
                customer=subscription.stripeCustomerId,
                return_url=return_url
            )
            
            logger.info(f"Created customer portal session for user: {user.id}")
            
            return session.url
            
        except Exception as e:
            logger.error(f"Error creating customer portal session: {e}")
            raise
    
    @staticmethod
    async def update_subscription_plan(
        user: AuthUser,
        plan_id: str
    ) -> Dict[str, str]:
        """既存のサブスクリプションのプランを変更"""
        try:
            # 現在のサブスクリプションを取得
            subscription = await prisma.subscription.find_unique(
                where={"userId": user.id},
                include={"plan": True}
            )
            
            if not subscription or not subscription.stripeSubscriptionId:
                raise ValueError("No active subscription found")
            
            # 新しいプランを取得
            new_plan = await prisma.plan.find_unique(where={"id": plan_id})
            if not new_plan or not new_plan.stripePriceId:
                raise ValueError(f"Invalid plan or missing Stripe price ID: {plan_id}")
            
            # Stripeサブスクリプションを更新
            stripe_subscription = stripe.Subscription.retrieve(subscription.stripeSubscriptionId)
            
            # サブスクリプションアイテムを更新
            updated_subscription = stripe.Subscription.modify(
                subscription.stripeSubscriptionId,
                items=[{
                    'id': stripe_subscription['items']['data'][0].id,
                    'price': new_plan.stripePriceId,
                }],
                proration_behavior='create_prorations',
                metadata={
                    "user_id": user.id,
                    "plan_id": plan_id
                }
            )
            
            # データベースを更新
            from datetime import datetime
            await prisma.subscription.update(
                where={"userId": user.id},
                data={
                    "planId": new_plan.id,
                    "currentPeriodStart": datetime.fromtimestamp(updated_subscription["current_period_start"]) if updated_subscription.get("current_period_start") else None,
                    "currentPeriodEnd": datetime.fromtimestamp(updated_subscription["current_period_end"]) if updated_subscription.get("current_period_end") else None
                }
            )
            
            logger.info(f"Updated subscription for user {user.id} to plan {new_plan.name}")
            
            return {
                "success": True,
                "message": f"Successfully changed to {new_plan.displayName}"
            }
            
        except Exception as e:
            logger.error(f"Error updating subscription: {e}")
            raise
    
    @staticmethod
    async def create_direct_subscription(
        user: AuthUser,
        plan_id: str
    ) -> Dict[str, str]:
        """既存のカスタマーと支払い方法で直接サブスクリプションを作成"""
        try:
            # カスタマーIDを取得
            customer_id = await StripeService.get_or_create_customer(user)
            
            # プランを取得
            plan = await prisma.plan.find_unique(where={"id": plan_id})
            if not plan or not plan.stripePriceId:
                raise ValueError(f"Invalid plan or missing Stripe price ID: {plan_id}")
            
            # カスタマーのデフォルト支払い方法を確認
            customer = stripe.Customer.retrieve(
                customer_id,
                expand=['invoice_settings.default_payment_method']
            )
            
            default_payment_method = customer.invoice_settings.default_payment_method
            if not default_payment_method:
                raise ValueError("No default payment method found")
            
            # 直接サブスクリプションを作成
            subscription = stripe.Subscription.create(
                customer=customer_id,
                items=[{
                    'price': plan.stripePriceId,
                }],
                default_payment_method=default_payment_method.id,
                metadata={
                    "user_id": user.id,
                    "plan_id": plan_id
                }
            )
            
            # データベースに保存
            from datetime import datetime
            await prisma.subscription.upsert(
                where={"userId": user.id},
                data={
                    "create": {
                        "userId": user.id,
                        "planId": plan.id,
                        "stripeCustomerId": customer_id,
                        "stripeSubscriptionId": subscription.id,
                        "status": subscription.status,
                        "currentPeriodStart": datetime.fromtimestamp(subscription.current_period_start) if getattr(subscription, 'current_period_start', None) else None,
                        "currentPeriodEnd": datetime.fromtimestamp(subscription.current_period_end) if getattr(subscription, 'current_period_end', None) else None
                    },
                    "update": {
                        "planId": plan.id,
                        "stripeCustomerId": customer_id,
                        "stripeSubscriptionId": subscription.id,
                        "status": subscription.status,
                        "currentPeriodStart": datetime.fromtimestamp(subscription.current_period_start) if getattr(subscription, 'current_period_start', None) else None,
                        "currentPeriodEnd": datetime.fromtimestamp(subscription.current_period_end) if getattr(subscription, 'current_period_end', None) else None
                    }
                }
            )
            
            logger.info(f"Created direct subscription for user {user.id} to plan {plan.name}")
            
            return {
                "success": True,
                "message": f"Successfully subscribed to {plan.displayName}"
            }
            
        except Exception as e:
            logger.error(f"Error creating direct subscription: {e}")
            raise
    
    @staticmethod
    async def sync_subscription_from_stripe(stripe_subscription: Dict[str, Any]) -> None:
        """StripeのサブスクリプションデータをDBに同期"""
        try:
            subscription_id = stripe_subscription["id"]
            customer_id = stripe_subscription["customer"]
            status = stripe_subscription["status"]
            
            # メタデータからuser_idを取得
            user_id = stripe_subscription.get("metadata", {}).get("user_id")
            if not user_id:
                # カスタマーIDからユーザーを特定
                existing_subscription = await prisma.subscription.find_first(
                    where={"stripeCustomerId": customer_id}
                )
                if not existing_subscription:
                    logger.warning(f"Cannot find user for subscription: {subscription_id}")
                    return
                user_id = existing_subscription.userId
            
            # サブスクリプションがキャンセル/削除された場合はFreeプランに戻す
            if status in ["canceled", "incomplete_expired", "unpaid"]:
                free_plan = await prisma.plan.find_unique(where={"name": "free"})
                if not free_plan:
                    logger.error("Free plan not found - cannot revert user to free plan")
                    return
                
                await prisma.subscription.update(
                    where={"userId": user_id},
                    data={
                        "planId": free_plan.id,
                        "status": "active",
                        "stripeSubscriptionId": None,
                        # stripeCustomerIdは保持（支払い方法を維持）
                    }
                )
                
                logger.info(f"User {user_id} reverted to Free plan due to subscription {status}")
                return
            
            # アクティブなサブスクリプションの場合は通常の同期処理
            # プランIDを取得（最初のアイテムのプライスIDから）
            price_id = stripe_subscription["items"]["data"][0]["price"]["id"]
            plan = await prisma.plan.find_unique(where={"stripePriceId": price_id})
            
            if not plan:
                logger.warning(f"Cannot find plan for price ID: {price_id}")
                return
            
            # サブスクリプションデータの準備
            subscription_data = {
                "stripeSubscriptionId": subscription_id,
                "stripeCustomerId": customer_id,
                "planId": plan.id,
                "status": status,
                "currentPeriodStart": stripe_subscription.get("current_period_start"),
                "currentPeriodEnd": stripe_subscription.get("current_period_end"),
                "cancelAtPeriodEnd": stripe_subscription.get("cancel_at_period_end", False),
                "trialStart": stripe_subscription.get("trial_start"),
                "trialEnd": stripe_subscription.get("trial_end"),
            }
            
            # 既存のサブスクリプションを更新または新規作成
            await prisma.subscription.upsert(
                where={"userId": user_id},
                data={
                    "create": {
                        "userId": user_id,
                        **subscription_data
                    },
                    "update": subscription_data
                }
            )
            
            # サブスクリプションが新規作成またはアクティブになった場合、デフォルト支払い方法を設定
            if status == "active" and stripe_subscription.get("default_payment_method"):
                try:
                    stripe.Customer.modify(
                        customer_id,
                        invoice_settings={
                            'default_payment_method': stripe_subscription["default_payment_method"]
                        }
                    )
                    logger.info(f"Set default payment method for customer {customer_id}")
                except Exception as e:
                    logger.warning(f"Failed to set default payment method: {e}")
            
            logger.info(f"Synced subscription: {subscription_id} for user: {user_id}")
            
        except Exception as e:
            logger.error(f"Error syncing subscription: {e}")
            raise