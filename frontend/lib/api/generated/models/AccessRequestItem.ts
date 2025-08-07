/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RequestStatus } from './RequestStatus';
/**
 * ファイル詳細ページ用のアクセスリクエスト項目
 */
export type AccessRequestItem = {
    request_id: string;
    reason: (string | null);
    status: RequestStatus;
    created_at: string;
};

