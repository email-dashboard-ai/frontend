import { api } from '../config/apiConfig';

export interface UserPublicProfile {
    email: string;
    name: string;
    avatar: string | null;
}

export const userService = {
    getUsersByEmails: async (emails: string[]): Promise<UserPublicProfile[]> => {
        const response = await api.post<UserPublicProfile[]>('/users/batch-info', emails);
        return response.data;
    }
};
