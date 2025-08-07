/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DownloadService {
    /**
     * Download File
     * 承認されたリクエストでファイルをダウンロード
     *
     * - リクエストIDで認証
     * - ダウンロード回数制限チェック
     * - ストリーミングレスポンス
     * @param requestId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static downloadFile(
        requestId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/download/{request_id}/file',
            path: {
                'request_id': requestId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Decrypt Key
     * 承認されたリクエストで復号化キーを取得
     *
     * - ファイルダウンロード後に呼び出す
     * - 一度だけ取得可能にする等の制限を検討
     * @param requestId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getDecryptKey(
        requestId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/download/{request_id}/decrypt-key',
            path: {
                'request_id': requestId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
