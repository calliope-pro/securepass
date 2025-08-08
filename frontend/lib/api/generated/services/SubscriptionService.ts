/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateCheckoutSessionRequest } from '../models/CreateCheckoutSessionRequest';
import type { CreateCheckoutSessionResponse } from '../models/CreateCheckoutSessionResponse';
import type { CustomerPortalSessionRequest } from '../models/CustomerPortalSessionRequest';
import type { CustomerPortalSessionResponse } from '../models/CustomerPortalSessionResponse';
import type { PlanResponse } from '../models/PlanResponse';
import type { SubscriptionResponse } from '../models/SubscriptionResponse';
import type { WebhookEventResponse } from '../models/WebhookEventResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SubscriptionService {
    /**
     * Get Plans
     * 利用可能なプランの一覧を取得
     * @returns PlanResponse Successful Response
     * @throws ApiError
     */
    public static getPlansApiV1SubscriptionPlansGet(): CancelablePromise<Array<PlanResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/subscription/plans',
        });
    }
    /**
     * Get Current Subscription
     * 現在のユーザーのサブスクリプション情報を取得
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getCurrentSubscriptionApiV1SubscriptionSubscriptionGet(): CancelablePromise<(SubscriptionResponse | null)> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/subscription/subscription',
        });
    }
    /**
     * Create Checkout Session
     * プラン変更処理（Freeプランは直接変更、有料プラン間は更新、新規は Checkout）
     * @param requestBody
     * @returns CreateCheckoutSessionResponse Successful Response
     * @throws ApiError
     */
    public static createCheckoutSessionApiV1SubscriptionCheckoutPost(
        requestBody: CreateCheckoutSessionRequest,
    ): CancelablePromise<CreateCheckoutSessionResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/subscription/checkout',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Customer Portal Session
     * Stripe Customer Portalセッションを作成
     * @param requestBody
     * @returns CustomerPortalSessionResponse Successful Response
     * @throws ApiError
     */
    public static createCustomerPortalSessionApiV1SubscriptionCustomerPortalPost(
        requestBody: CustomerPortalSessionRequest,
    ): CancelablePromise<CustomerPortalSessionResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/subscription/customer-portal',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Handle Stripe Webhook
     * Stripe Webhookイベントを処理
     * @param stripeSignature
     * @returns WebhookEventResponse Successful Response
     * @throws ApiError
     */
    public static handleStripeWebhookApiV1SubscriptionWebhooksStripePost(
        stripeSignature?: (string | null),
    ): CancelablePromise<WebhookEventResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/subscription/webhooks/stripe',
            headers: {
                'stripe-signature': stripeSignature,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get User Usage
     * ユーザーの使用量統計を取得
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getUserUsageApiV1SubscriptionUsageGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/subscription/usage',
        });
    }
}
