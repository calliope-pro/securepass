/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FileStatus } from './FileStatus';
/**
 * 最近のファイル項目
 */
export type RecentFileItem = {
    file_id: string;
    share_id: string;
    filename: string;
    size: number;
    mime_type: string;
    created_at: string;
    expires_at: string;
    max_downloads: number;
    download_count: number;
    request_count: number;
    pending_request_count: number;
    status: FileStatus;
    is_invalidated?: boolean;
};

