import { Route, Routes } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Fixture from './pages/Fixture';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="programacion" element={<Fixture />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
