/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DashboardStatsResponse } from '../models/DashboardStatsResponse';
import type { FileActivity } from '../models/FileActivity';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DashboardService {
    /**
     * ダッシュボード統計情報取得
     * 認証されたユーザーのダッシュボード統計情報（ファイル数、要求数、最近のアクティビティ）を取得します。
     * @returns DashboardStatsResponse Successful Response
     * @throws ApiError
     */
    public static getDashboardStatsApiV1DashboardStatsGet(): CancelablePromise<DashboardStatsResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/dashboard/stats',
        });
    }
    /**
     * ファイルアクティビティ取得
     * 認証されたユーザーのファイルアクティビティ一覧を取得します。
     * @param limit
     * @returns FileActivity Successful Response
     * @throws ApiError
     */
    public static getFileActivitiesApiV1DashboardFilesGet(
        limit: number = 20,
    ): CancelablePromise<Array<FileActivity>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/dashboard/files',
            query: {
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
