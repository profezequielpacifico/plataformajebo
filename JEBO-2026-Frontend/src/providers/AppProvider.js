import React, { useState, createContext, useContext } from 'react';

export const AppContext = createContext({
    currentPage: 'dashboard',
    setCurrentPage: () => {},
    theme: 'light',
    setTheme: () => {}
});

export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [theme, setTheme] = useState('light');

    const value = {
        currentPage,
        setCurrentPage,
        theme,
        setTheme
    };

    return React.createElement(AppContext.Provider, { value }, children);
}

export default AppProvider;
