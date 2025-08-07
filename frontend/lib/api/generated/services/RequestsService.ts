/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApproveRequestRequest } from '../models/ApproveRequestRequest';
import type { ApproveRequestResponse } from '../models/ApproveRequestResponse';
import type { CreateAccessRequestRequest } from '../models/CreateAccessRequestRequest';
import type { CreateAccessRequestResponse } from '../models/CreateAccessRequestResponse';
import type { FileRequestListResponse } from '../models/FileRequestListResponse';
import type { RejectRequestRequest } from '../models/RejectRequestRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class RequestsService {
    /**
     * Create Access Request
     * アクセスリクエストを作成
     *
     * - 共有IDからファイルを特定
     * - 匿名でリクエスト可能
     * - IPアドレスはハッシュ化して保存
     * @param requestBody
     * @returns CreateAccessRequestResponse Successful Response
     * @throws ApiError
     */
    public static createAccessRequest(
        requestBody: CreateAccessRequestRequest,
    ): CancelablePromise<CreateAccessRequestResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/requests/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get File Requests
     * ファイルに対するアクセスリクエスト一覧を取得
     *
     * - 送信者がリクエストを確認するため
     * @param fileId
     * @returns FileRequestListResponse Successful Response
     * @throws ApiError
     */
    public static getFileRequests(
        fileId: string,
    ): CancelablePromise<FileRequestListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/requests/file/{file_id}',
            path: {
                'file_id': fileId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Approve Request
     * アクセスリクエストを承認
     *
     * - 送信者のみが承認可能（認証実装後）
     * - 暗号化された鍵を渡す
     * @param requestId
     * @param requestBody
     * @returns ApproveRequestResponse Successful Response
     * @throws ApiError
     */
    public static approveRequest(
        requestId: string,
        requestBody: ApproveRequestRequest,
    ): CancelablePromise<ApproveRequestResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/requests/{request_id}/approve',
            path: {
                'request_id': requestId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Reject Request
     * アクセスリクエストを拒否
     *
     * - 送信者のみが拒否可能（認証実装後）
     * - 理由は任意
     * @param requestId
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static rejectRequest(
        requestId: string,
        requestBody?: (RejectRequestRequest | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/requests/{request_id}/reject',
            path: {
                'request_id': requestId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Request Status
     * リクエストのステータスを確認
     *
     * - 受信者がステータスを確認するため
     * - 承認された場合はダウンロード可能
     * @param requestId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getRequestStatus(
        requestId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/requests/{request_id}/status',
            path: {
                'request_id': requestId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
