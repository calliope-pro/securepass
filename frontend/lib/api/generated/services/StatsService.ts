/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UserStatsResponse } from '../models/UserStatsResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class StatsService {
    /**
     * ユーザー統計情報取得
     * 認証されたユーザーの統計情報（ファイル数、要求数、アクティブファイル数）を取得します。
     * @returns UserStatsResponse Successful Response
     * @throws ApiError
     */
    public static getUserStatsApiV1StatsUserGet(): CancelablePromise<UserStatsResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/stats/user',
        });
    }
}
