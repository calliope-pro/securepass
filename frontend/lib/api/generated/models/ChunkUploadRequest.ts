/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * チャンクアップロードリクエスト
 */
export type ChunkUploadRequest = {
    /**
     * セッションキー
     */
    session_key: string;
    /**
     * チャンクインデックス
     */
    chunk_index: number;
    /**
     * Base64エンコードされた暗号化チャンク
     */
    chunk_data: string;
};

