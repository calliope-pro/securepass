#!/usr/bin/env python3
# backend/create_initial_plans.py
"""
初期プランデータを作成するスクリプト
"""

import asyncio
import sys
import os

# パスを追加してアプリケーションをインポート可能にする
sys.path.append(os.path.dirname(__file__))

from app.core.database import prisma


async def create_initial_plans():
    """初期プランデータを作成"""
    try:
        await prisma.connect()
        print("データベースに接続しました")
        
        # 既存プランの確認
        existing_plans = await prisma.plan.find_many()
        if existing_plans:
            print(f"既に{len(existing_plans)}個のプランが存在します")
            for plan in existing_plans:
                print(f"  - {plan.name}: {plan.displayName}")
            return
        
        # 無料プラン
        free_plan = await prisma.plan.create(
            data={
                "name": "free",
                "displayName": "Free",
                "price": 0,  # 無料
                "currency": "usd",
                "stripePriceId": None,  # Stripe価格IDなし
                "maxFileSize": 100 * 1024 * 1024,  # 100MB
                "maxFilesPerMonth": 10,  # 月10ファイル
                "maxStorageTotal": 1 * 1024 * 1024 * 1024,  # 1GB
                "maxDownloadsPerFile": 1,  # ファイルあたり1回
                "isActive": True
            }
        )
        print(f"✅ 無料プランを作成: {free_plan.id}")
        
        # Proプラン
        pro_plan = await prisma.plan.create(
            data={
                "name": "pro",
                "displayName": "Pro",
                "price": 999,  # $9.99/月（セント単位）
                "currency": "usd",
                "stripePriceId": "price_xxxxxxxxxxxxx",  # TODO: 実際のStripe価格IDに変更
                "maxFileSize": 5 * 1024 * 1024 * 1024,  # 5GB
                "maxFilesPerMonth": 100,  # 月100ファイル
                "maxStorageTotal": 50 * 1024 * 1024 * 1024,  # 50GB
                "maxDownloadsPerFile": 10,  # ファイルあたり10回
                "isActive": True
            }
        )
        print(f"✅ Proプランを作成: {pro_plan.id}")
        
        # Enterpriseプラン
        enterprise_plan = await prisma.plan.create(
            data={
                "name": "enterprise",
                "displayName": "Enterprise",
                "price": 2999,  # $29.99/月（セント単位）
                "currency": "usd",
                "stripePriceId": "price_yyyyyyyyyyyyy",  # TODO: 実際のStripe価格IDに変更
                "maxFileSize": 10 * 1024 * 1024 * 1024,  # 10GB
                "maxFilesPerMonth": 500,  # 月500ファイル
                "maxStorageTotal": 200 * 1024 * 1024 * 1024,  # 200GB
                "maxDownloadsPerFile": 50,  # ファイルあたり50回
                "isActive": True
            }
        )
        print(f"✅ Enterpriseプランを作成: {enterprise_plan.id}")
        
        print("\n🎉 初期プランデータの作成が完了しました！")
        print("\n注意: ProとEnterpriseプランのstripePriceIdを実際のStripe価格IDに更新してください。")
        
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")
        raise
    finally:
        await prisma.disconnect()
        print("データベース接続を閉じました")


if __name__ == "__main__":
    asyncio.run(create_initial_plans())