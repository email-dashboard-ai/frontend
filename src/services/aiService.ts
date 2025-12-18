import { api } from '../config/apiConfig';
import type { ApiResponse } from '../types/api';

export interface EmailSummaryRequest {
    messageId: string;
    content?: string;
}

export interface EmailSummaryResponse {
    messageId: string;
    summary: string;
    provider: string;
    model: string;
    cached: boolean;
    latencyMs: number;
}

export const aiService = {
    async summarizeEmail(payload: EmailSummaryRequest): Promise<EmailSummaryResponse> {
        const { data } = await api.post<ApiResponse<EmailSummaryResponse>>('/api/ai/email-summary', payload);
        return data.data;
    },
};
