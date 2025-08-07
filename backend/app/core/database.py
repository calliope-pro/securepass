# backend/app/core/database.py
from prisma import Prisma

# Prismaクライアントのインスタンス
# auto_register=Falseで明示的な接続管理を行う
prisma = Prisma(auto_register=False, use_dotenv=False)
