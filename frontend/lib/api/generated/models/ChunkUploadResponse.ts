/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * チャンクアップロードレスポンス
 */
export type ChunkUploadResponse = {
    /**
     * アップロードされたチャンクインデックス
     */
    chunk_index: number;
    /**
     * アップロード済みチャンク数
     */
    uploaded_chunks: number;
    /**
     * 総チャンク数
     */
    total_chunks: number;
    /**
     * アップロード完了フラグ
     */
    is_complete: boolean;
};

