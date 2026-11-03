import React from 'react';
import { AuthProvider, AuthContext, useAuth } from './AuthProvider.js';
import { AppProvider, AppContext, useApp } from './AppProvider.js';
import { DataProvider, DataContext, useData } from './DataProvider.js';

export { AuthProvider, AuthContext, useAuth };
export { AppProvider, AppContext, useApp };
export { DataProvider, DataContext, useData };

export function AppProviders({ children }) {
    return React.createElement(AuthProvider, null,
        React.createElement(AppProvider, null,
            React.createElement(DataProvider, null, children)
        )
    );
}

export default AppProviders;
