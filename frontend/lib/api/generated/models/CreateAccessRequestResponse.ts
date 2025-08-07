/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RequestStatus } from './RequestStatus';
/**
 * アクセスリクエスト作成レスポンス
 */
export type CreateAccessRequestResponse = {
    /**
     * リクエストID（12文字）
     */
    request_id: string;
    /**
     * リクエストステータス
     */
    status: RequestStatus;
    /**
     * 作成日時
     */
    created_at: string;
};

