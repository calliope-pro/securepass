/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * ユーザー存在確認レスポンス
 */
export type CheckUserResponse = {
    /**
     * ユーザーが存在するかどうか
     */
    exists: boolean;
    /**
     * バックエンドにユーザーが存在するかどうか
     */
    in_backend: boolean;
};

