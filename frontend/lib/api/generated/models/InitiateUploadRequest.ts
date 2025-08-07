/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * ファイルアップロード開始リクエスト
 */
export type InitiateUploadRequest = {
    /**
     * ファイル名
     */
    filename: string;
    /**
     * ファイルサイズ（バイト）
     */
    size: number;
    /**
     * MIMEタイプ
     */
    mime_type: string;
    /**
     * チャンクサイズ（バイト）
     */
    chunk_size?: number;
    /**
     * 有効期限（時間）
     */
    expires_in_hours?: number;
    /**
     * 最大ダウンロード回数
     */
    max_downloads?: number;
};

