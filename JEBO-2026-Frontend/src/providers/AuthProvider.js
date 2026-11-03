import React, { useState, useEffect, createContext, useContext } from 'react';

export const AuthContext = createContext({
    user: null,
    isAuthenticated: false,
    login: () => {},
    logout: () => {},
    loading: true
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('jebo_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }
        setLoading(false);
    }, []);

    const login = (userData) => {
        setUser(userData);
        localStorage.setItem('jebo_user', JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('jebo_user');
    };

    const value = {
        user,
        isAuthenticated: !!user,
        login,
        logout,
        loading
    };

    return React.createElement(AuthContext.Provider, { value }, children);
}

export default AuthProvider;
