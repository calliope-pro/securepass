/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PlanResponse } from './PlanResponse';
export type SubscriptionResponse = {
    id: string;
    user_id: string;
    plan: PlanResponse;
    stripe_customer_id?: (string | null);
    stripe_subscription_id?: (string | null);
    status: string;
    current_period_start?: (string | null);
    current_period_end?: (string | null);
    cancel_at_period_end?: boolean;
    canceled_at?: (string | null);
    trial_start?: (string | null);
    trial_end?: (string | null);
    created_at: string;
    updated_at: string;
};

