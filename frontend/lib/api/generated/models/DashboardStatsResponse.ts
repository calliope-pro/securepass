/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RecentActivityItem } from './RecentActivityItem';
/**
 * ダッシュボード統計情報のレスポンス
 */
export type DashboardStatsResponse = {
    total_files?: number;
    total_requests?: number;
    active_files?: number;
    this_month_uploads?: number;
    recent_activity?: Array<RecentActivityItem>;
};

