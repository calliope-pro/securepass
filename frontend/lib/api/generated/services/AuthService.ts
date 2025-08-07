/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AuthUser } from '../models/AuthUser';
import type { CheckUserRequest } from '../models/CheckUserRequest';
import type { CheckUserResponse } from '../models/CheckUserResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthService {
    /**
     * Signup
     * サインアップエンドポイント：トークンからユーザーを作成
     * @returns AuthUser Successful Response
     * @throws ApiError
     */
    public static signupApiV1AuthSignupPost(): CancelablePromise<AuthUser> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/signup',
        });
    }
    /**
     * Signin
     * サインインエンドポイント：既存ユーザーの認証のみ
     * @returns AuthUser Successful Response
     * @throws ApiError
     */
    public static signinApiV1AuthSigninPost(): CancelablePromise<AuthUser> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/signin',
        });
    }
    /**
     * Check User Exists
     * ユーザー存在確認エンドポイント
     * @param requestBody
     * @returns CheckUserResponse Successful Response
     * @throws ApiError
     */
    public static checkUserExistsApiV1AuthCheckUserPost(
        requestBody: CheckUserRequest,
    ): CancelablePromise<CheckUserResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/check-user',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
