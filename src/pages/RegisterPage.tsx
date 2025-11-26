import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useAppDispatch, useAppSelector } from "../store";
import { register as registerUser, clearError } from "../store/slices/authSlice";
import GoogleLoginButton from "../components/auth/GoogleLoginButton";
import type { RegisterRequest } from "../types";
import { Sparkles, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Box,
  Divider,
  IconButton,
  InputAdornment,
} from "@mui/material";

const RegisterPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<RegisterRequest>({
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: RegisterRequest) => {
    dispatch(registerUser(data));
  };

  const clearAuthError = () => {
    dispatch(clearError());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          className="p-8 bg-white rounded-lg shadow-xl border border-slate-200"
        >
          {/* Header */}
          <Box className="text-center mb-8">
            <div className="w-16 h-16 bg-black text-white rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Sparkles size={32} />
            </div>
            <Typography variant="h4" className="font-bold text-slate-900 mb-2">
              Create Account
            </Typography>
            <Typography variant="body1" className="text-slate-600">
              Join AI Email Flow today
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert
              severity="error"
              className="mb-6"
              onClose={clearAuthError}
              icon={<AlertCircle size={20} />}
            >
              {error}
            </Alert>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-6">
            <TextField
              {...register("name", {
                required: "Name is required",
                minLength: {
                  value: 2,
                  message: "Name must be at least 2 characters",
                },
              })}
              fullWidth
              label="Full Name"
              variant="outlined"
              error={!!errors.name}
              helperText={errors.name?.message}
              disabled={isLoading}
              className="mb-4"
            />

            <TextField
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address",
                },
              })}
              fullWidth
              label="Email"
              type="email"
              variant="outlined"
              error={!!errors.email}
              helperText={errors.email?.message}
              disabled={isLoading}
              className="mb-4"
            />

            <TextField
              {...register("password", {
                required: "Password is required",
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters",
                },
              })}
              fullWidth
              label="Password"
              type={showPassword ? "text" : "password"}
              variant="outlined"
              error={!!errors.password}
              helperText={errors.password?.message}
              disabled={isLoading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading || !isValid}
              className="bg-slate-900 hover:bg-slate-800 text-white py-3 mt-6 rounded-lg font-medium transition-all duration-200"
              startIcon={
                isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : null
              }
            >
              {isLoading ? "Creating Account..." : "Sign Up"}
            </Button>
          </form>

          <Divider className="my-6">
            <Typography variant="body2" className="text-slate-500 px-4">
              or
            </Typography>
          </Divider>

          {/* Google Sign-In */}
          <GoogleLoginButton disabled={isLoading} />

          {/* Footer */}
          <Box className="mt-6 text-center">
            <Typography variant="body2" className="text-slate-600">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-600 hover:underline font-medium">
                Sign In
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </div>
  );
};

export default RegisterPage;
