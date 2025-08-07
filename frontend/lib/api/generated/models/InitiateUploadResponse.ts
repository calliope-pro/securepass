/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * ファイルアップロード開始レスポンス
 */
export type InitiateUploadResponse = {
    /**
     * ファイルID
     */
    file_id: string;
    /**
     * 共有ID（12文字）
     */
    share_id: string;
    /**
     * アップロードセッションキー
     */
    session_key: string;
    /**
     * 総チャンク数
     */
    chunk_count: number;
    /**
     * チャンクアップロード用の署名付きURL
     */
    chunk_urls: Array<string>;
};

