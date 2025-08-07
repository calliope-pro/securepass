/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RecentFileItem } from './RecentFileItem';
/**
 * 最近のファイル一覧レスポンス
 */
export type RecentFilesResponse = {
    files: Array<RecentFileItem>;
    /**
     * 総ファイル数
     */
    total: number;
    /**
     * 取得制限数
     */
    limit: number;
    /**
     * 取得開始位置
     */
    offset: number;
};

