/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PlanResponse = {
    id: string;
    name: string;
    display_name: string;
    price: number;
    currency: string;
    stripe_price_id?: (string | null);
    max_file_size: number;
    max_files_per_month: number;
    max_storage_total: number;
    max_downloads_per_file: number;
    features_json?: (Record<string, any> | null);
    is_active: boolean;
};

