import React from 'react';
import { useNavigate } from 'react-router-dom';

const UnauthenticatedPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-6xl font-bold text-gray-800">401</h1>
            <p className="text-2xl font-medium text-gray-600 mt-4">Authentication Required</p>
            <p className="text-gray-500 mt-2">You need to log in to access this page.</p>
            <button
                onClick={() => navigate('/login')}
                className="mt-6 px-6 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 transition duration-300"
            >
                Go to Login
            </button>
        </div>
    );
};

export default UnauthenticatedPage;
