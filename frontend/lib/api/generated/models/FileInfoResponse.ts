/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FileStatus } from './FileStatus';
/**
 * ファイル情報レスポンス
 */
export type FileInfoResponse = {
    file_id: string;
    share_id: string;
    filename: string;
    size: number;
    mime_type: string;
    status: FileStatus;
    created_at: string;
    expires_at: string;
    max_downloads: number;
    download_count?: number;
    is_invalidated?: boolean;
};

