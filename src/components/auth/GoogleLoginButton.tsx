import React from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useAppDispatch, useAppSelector } from "../../store";
import { loginWithGoogle } from "../../store/slices/authSlice";
import { Button } from "@mui/material";
import { ChevronRight, Loader2 } from "lucide-react";

interface GoogleLoginButtonProps {
  disabled?: boolean;
  className?: string;
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  disabled = false,
  className = "",
}) => {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);

  const handleGoogleLogin = useGoogleLogin({
    // 1. "auth-code" flow is CRITICAL.
    // It gives us a code to swap for a Refresh Token on the backend.
    flow: "auth-code",

    // 2. Request the same scopes you set in Google Cloud Console
    scope: "https://www.googleapis.com/auth/gmail.modify",
    
    // 3. Force account selection to trigger consent screen
    // This helps ensure we get a refresh token
    hint: "",
    select_account: true,

    onSuccess: async (codeResponse) => {
      console.log("Received Auth Code from Google:", codeResponse.code);

      try {
        // 3. Dispatch the Google auth action with the auth code
        // The authSlice will handle the API call to your backend
        await dispatch(
          loginWithGoogle({
            authCode: codeResponse.code,
          })
        ).unwrap();

        console.log("Google Login Success!");
      } catch (error) {
        console.error("Google login failed:", error);
      }
    },

    onError: (errorResponse) => {
      console.error("Google Login Failed:", errorResponse);
    },
  });

  return (
    <Button
      onClick={() => handleGoogleLogin()}
      fullWidth
      variant="outlined"
      size="large"
      disabled={isLoading || disabled}
      className={`border-slate-300 hover:bg-slate-50 text-slate-700 py-3 rounded-lg font-medium transition-all duration-200 group ${className}`}
      startIcon={
        isLoading ? (
          <Loader2 className="animate-spin w-5 h-5" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )
      }
      endIcon={
        !isLoading && (
          <ChevronRight
            className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-5px] group-hover:translate-x-0"
            size={16}
          />
        )
      }
    >
      {isLoading ? "Signing in..." : "Sign in with Google"}
    </Button>
  );
};

export default GoogleLoginButton;
