/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RequestStatus } from './RequestStatus';
/**
 * リクエスト承認レスポンス
 */
export type ApproveRequestResponse = {
    request_id: string;
    status: RequestStatus;
    approved_at: string;
};

