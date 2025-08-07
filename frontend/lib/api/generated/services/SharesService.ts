/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FileInfoResponse } from '../models/FileInfoResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SharesService {
    /**
     * Get Share Info
     * 共有IDからファイル情報を取得
     *
     * - ダウンロードには含まれない基本情報のみ
     * - 有効期限切れチェック
     * @param shareId
     * @returns FileInfoResponse Successful Response
     * @throws ApiError
     */
    public static getShareInfo(
        shareId: string,
    ): CancelablePromise<FileInfoResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/shares/{share_id}',
            path: {
                'share_id': shareId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
