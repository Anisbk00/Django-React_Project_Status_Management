import { useContext } from 'react';
import { AuthContext } from './AuthContext'; // adjust path if needed

export const useAuth = () => useContext(AuthContext);
