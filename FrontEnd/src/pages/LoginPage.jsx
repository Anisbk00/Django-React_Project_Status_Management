import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';
import { useAuth } from '../context/AuthContext';

const LoginPage=()=>{
    const [error,setError]=useState('');
    const {login}=useAuth();
    const navigate=useNavigate();


    const handleLogin=async (Credentials)=>{
        try{
            await login(Credentials.username,Credentials.password);
            navigate('/dashboard');
        // eslint-disable-next-line no-unused-vars
        }catch(error){
            setError('Invalid Credentials.Please Try again');

        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
            <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Project Status Tracker</h1>
            <p className="text-gray-600 mt-2">Sign in to your account</p>
            </div>
            
            {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
            </div>
            )}
            
            <LoginForm onSubmit={handleLogin} />
        </div>
        </div>
    );
};
export default LoginPage;