import React, { useState, useCallback, createContext, useContext, useEffect } from 'react';
import teamService from '../services/teamService.js';

export const DataContext = createContext({
    teams: [],
    refreshData: () => {},
    addTeam: () => {},
    updateTeam: () => {},
    deleteTeam: () => {}
});

export const useData = () => useContext(DataContext);

export function DataProvider({ children }) {
    const [teams, setTeams] = useState([]);

    const refreshData = useCallback(async () => {
        try {
            const res = await teamService.getAll();
            const data = res.data || res || [];
            setTeams(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error loading teams:', err);
        }
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const addTeam = useCallback(async (team) => {
        try {
            const res = await teamService.create(team);
            const newTeam = res.data || res;
            setTeams(prev => [...prev, newTeam]);
        } catch (err) {
            console.error('Error creating team:', err);
            throw err;
        }
    }, []);

    const updateTeam = useCallback(async (id, updatedTeam) => {
        try {
            const res = await teamService.update(id, updatedTeam);
            const updated = res.data || res;
            setTeams(prev => prev.map(t => (t.id_equipo || t.id) === id ? { ...t, ...updated } : t));
        } catch (err) {
            console.error('Error updating team:', err);
            throw err;
        }
    }, []);

    const deleteTeam = useCallback(async (id) => {
        try {
            await teamService.delete(id);
            setTeams(prev => prev.filter(t => (t.id_equipo || t.id) !== id));
        } catch (err) {
            console.error('Error deleting team:', err);
            throw err;
        }
    }, []);

    const value = {
        teams,
        refreshData,
        addTeam,
        updateTeam,
        deleteTeam
    };

    return React.createElement(DataContext.Provider, { value }, children);
}

export default DataProvider;
