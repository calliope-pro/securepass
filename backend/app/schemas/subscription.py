# backend/app/schemas/subscription.py
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel


class PlanResponse(BaseModel):
    id: str
    name: str
    display_name: str
    price: int
    currency: str
    stripe_price_id: Optional[str] = None
    max_file_size: int
    max_files_per_month: int
    max_storage_total: int
    max_downloads_per_file: int
    features_json: Optional[Dict[str, Any]] = None
    is_active: bool


class SubscriptionResponse(BaseModel):
    id: str
    user_id: str
    plan: PlanResponse
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    status: str
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    canceled_at: Optional[datetime] = None
    trial_start: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class CreateCheckoutSessionRequest(BaseModel):
    plan_id: str
    success_url: str
    cancel_url: str


class CreateCheckoutSessionResponse(BaseModel):
    checkout_url: str
    session_id: Optional[str] = None


class CustomerPortalSessionRequest(BaseModel):
    return_url: str


class CustomerPortalSessionResponse(BaseModel):
    url: str


class WebhookEventResponse(BaseModel):
    received: bool