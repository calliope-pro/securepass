/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ChunkUploadRequest } from '../models/ChunkUploadRequest';
import type { ChunkUploadResponse } from '../models/ChunkUploadResponse';
import type { CompleteUploadRequest } from '../models/CompleteUploadRequest';
import type { FileInfoResponse } from '../models/FileInfoResponse';
import type { InitiateUploadRequest } from '../models/InitiateUploadRequest';
import type { InitiateUploadResponse } from '../models/InitiateUploadResponse';
import type { RecentFilesResponse } from '../models/RecentFilesResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class FilesService {
    /**
     * Initiate Upload
     * ファイルアップロードを開始
     *
     * 1. ファイルレコードを作成
     * 2. アップロードセッションを作成
     * 3. チャンク用の署名付きURLを生成
     * @param requestBody
     * @returns InitiateUploadResponse Successful Response
     * @throws ApiError
     */
    public static initiateUpload(
        requestBody: InitiateUploadRequest,
    ): CancelablePromise<InitiateUploadResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/files/upload/initiate',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Upload Chunk
     * ファイルチャンクをアップロード
     *
     * 1. セッションの検証
     * 2. チャンクデータをR2に保存
     * 3. 進捗を更新
     * @param requestBody
     * @returns ChunkUploadResponse Successful Response
     * @throws ApiError
     */
    public static uploadChunk(
        requestBody: ChunkUploadRequest,
    ): CancelablePromise<ChunkUploadResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/files/upload/chunk',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Complete Upload
     * アップロードを完了し、暗号化キーを保存
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static completeUpload(
        requestBody: CompleteUploadRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/files/upload/complete',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Recent Files
     * 認証されたユーザーの最近アップロードされたファイル一覧を取得（最新順）
     * @param limit
     * @param offset
     * @returns RecentFilesResponse Successful Response
     * @throws ApiError
     */
    public static getRecentFiles(
        limit: number = 10,
        offset?: number,
    ): CancelablePromise<RecentFilesResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/files/recent',
            query: {
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get File Info
     * ファイル情報を取得
     * @param fileId
     * @returns FileInfoResponse Successful Response
     * @throws ApiError
     */
    public static getFileInfo(
        fileId: string,
    ): CancelablePromise<FileInfoResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/files/{file_id}',
            path: {
                'file_id': fileId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
