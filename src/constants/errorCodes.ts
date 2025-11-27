export const ErrorCode = {
    SUCCESS: 1,

    // Common Errors
    ERR_SYSTEM: 1000,
    ERR_NOT_FOUND: 1001,
    ERR_DATA_INVALID: 1002,

    // Auth Errors
    ERR_AUTH: 4000,
    ERR_USER_EXISTED: 4001,
    ERR_BAD_CREDENTIALS: 4002,
    ERR_TOKEN_REFRESH: 4003,
    ERR_USER_NOT_FOUND: 4004,

    // Service Errors
    ERR_GMAIL_SERVICE: 6000,
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];
