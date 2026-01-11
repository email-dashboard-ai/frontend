import { api } from '../config/apiConfig';

export interface UserPublicProfile {
    email: string;
    name: string;
    avatar: string | null;
}

export interface UserSettingsResponse {
    email: string;
    customSummaryPrompt: string | null;
    defaultPrompt: string;
    usingCustomPrompt: boolean;
}

export interface UpdateUserSettingsRequest {
    customSummaryPrompt: string | null;
}

export const userService = {
    getUsersByEmails: async (emails: string[]): Promise<UserPublicProfile[]> => {
        const response = await api.post('/api/users/batch-info', emails);
        return response.data.data;
    },

    getUserSettings: async (): Promise<UserSettingsResponse> => {
        const response = await api.get('/api/users/settings');
        return response.data.data;
    },

    updateUserSettings: async (request: UpdateUserSettingsRequest): Promise<UserSettingsResponse> => {
        const response = await api.put('/api/users/settings', request);
        return response.data.data;
    }
};
