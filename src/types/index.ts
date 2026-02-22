export interface Category {
    id: string;
    name: string;
}

export interface TrackedItem {
    id: string;
    url: string;
    name: string;
    current_price: number;
    unit_size?: string;
    category_id?: string;
    created_at: string;
    last_checked_at: string;
    status?: 'pending' | 'done' | 'error';
    error_message?: string;
}

export interface PriceHistory {
    id: string;
    item_id: string;
    price: number;
    created_at: string;
}
