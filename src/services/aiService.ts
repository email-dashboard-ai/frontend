import { api } from '../config/apiConfig';
import type { ApiResponse } from '../types/api';

export interface EmailSummaryRequest {
    messageId: string;
    content?: string;
    forceRegenerate?: boolean;
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

    /**
     * Force regenerate summary with current user's prompt
     * This bypasses cache and generates a fresh summary
     */
    async regenerateSummary(messageId: string, content?: string): Promise<EmailSummaryResponse> {
        const { data } = await api.post<ApiResponse<EmailSummaryResponse>>('/api/ai/email-summary/regenerate', {
            messageId,
            content
        });
        return data.data;
    }
};
