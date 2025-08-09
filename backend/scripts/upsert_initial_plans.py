#!/usr/bin/env python3
# backend/scripts/upsert_initial_plans.py
"""
初期プランデータをupsertするスクリプト
"""

import asyncio
from app.core.database import prisma
from app.core.config import settings


async def upsert_initial_plans():
    """初期プランデータをupsert（作成・更新）"""
    try:
        await prisma.connect()
        print("データベースに接続しました")
        
        # configからStripe価格IDを取得（必須設定）
        stripe_pro_price_id = settings.STRIPE_PRO_PRICE_ID
        stripe_enterprise_price_id = settings.STRIPE_ENTERPRISE_PRICE_ID
        
        print("プランデータをupsertします...")
        print(f"  Pro Stripe価格ID: {stripe_pro_price_id}")
        print(f"  Enterprise Stripe価格ID: {stripe_enterprise_price_id}")
        
        # 無料プラン
        free_plan = await prisma.plan.upsert(
            where={"name": "free"},
            data={
                "update": {
                    "displayName": "Free",
                    "price": 0,  # 無料
                    "currency": "usd",
                    "stripePriceId": None,  # Stripe価格IDなし
                    "maxFileSize": 100 * 1024 * 1024,  # 100MB
                    "maxFilesPerMonth": 10,  # 月10ファイル
                    "maxStorageTotal": 1 * 1024 * 1024 * 1024,  # 1GB
                    "maxDownloadsPerFile": 1,  # ファイルあたり1回
                    "isActive": True
                },
                "create": {
                    "name": "free",
                    "displayName": "Free",
                    "price": 0,
                    "currency": "usd",
                    "stripePriceId": None,
                    "maxFileSize": 100 * 1024 * 1024,
                    "maxFilesPerMonth": 10,
                    "maxStorageTotal": 1 * 1024 * 1024 * 1024,
                    "maxDownloadsPerFile": 1,
                    "isActive": True
                }
            }
        )
        print(f"✅ 無料プランをupsert: {free_plan.id}")
        
        # Proプラン
        pro_data = {
            "displayName": "Pro",
            "price": 999,  # $9.99/月（セント単位）
            "currency": "usd",
            "stripePriceId": stripe_pro_price_id,  # 必須設定
            "maxFileSize": 5 * 1024 * 1024 * 1024,  # 5GB
            "maxFilesPerMonth": 100,  # 月100ファイル
            "maxStorageTotal": 50 * 1024 * 1024 * 1024,  # 50GB
            "maxDownloadsPerFile": 10,  # ファイルあたり10回
            "isActive": True
        }
            
        pro_plan = await prisma.plan.upsert(
            where={"name": "pro"},
            data={
                "update": pro_data,
                "create": {
                    "name": "pro",
                    **pro_data
                }
            }
        )
        print(f"✅ Proプランをupsert: {pro_plan.id}")
        
        # Enterpriseプラン
        enterprise_data = {
            "displayName": "Enterprise",
            "price": 2999,  # $29.99/月（セント単位）
            "currency": "usd",
            "stripePriceId": stripe_enterprise_price_id,  # 必須設定
            "maxFileSize": 10 * 1024 * 1024 * 1024,  # 10GB
            "maxFilesPerMonth": 500,  # 月500ファイル
            "maxStorageTotal": 200 * 1024 * 1024 * 1024,  # 200GB
            "maxDownloadsPerFile": 50,  # ファイルあたり50回
            "isActive": True
        }
            
        enterprise_plan = await prisma.plan.upsert(
            where={"name": "enterprise"},
            data={
                "update": enterprise_data,
                "create": {
                    "name": "enterprise",
                    **enterprise_data
                }
            }
        )
        print(f"✅ Enterpriseプランをupsert: {enterprise_plan.id}")
        
        # 最終状態を表示
        final_plans = await prisma.plan.find_many()
        print(f"\n🎉 プランデータのupsertが完了しました！ (総数: {len(final_plans)}個)")
        for plan in final_plans:
            print(f"  - {plan.name} ({plan.displayName}): Stripe価格ID = {plan.stripePriceId}")
        
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")
        raise
    finally:
        await prisma.disconnect()
        print("データベース接続を閉じました")


def main():
    """メイン関数（CLIエントリーポイント）"""
    asyncio.run(upsert_initial_plans())


if __name__ == "__main__":
    main()