import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  History, 
  Settings,
  Receipt
} from 'lucide-react';

export default function BottomNav() {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashi' },
    { to: '/bidhaa', icon: Package, label: 'Bidhaa' },
    { to: '/kikapu', icon: ShoppingCart, label: 'Kikapu' },
    { to: '/matumizi', icon: Receipt, label: 'Matumizi' },
    { to: '/madeni', icon: Users, label: 'Madeni' },
    { to: '/historia', icon: History, label: 'Historia' },
    { to: '/zaidi', icon: Settings, label: 'Zaidi' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1 z-50 flex justify-around items-center">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors ${
              isActive
                ? 'text-blue-600'
                : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <item.icon className="w-6 h-6" />
          <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
