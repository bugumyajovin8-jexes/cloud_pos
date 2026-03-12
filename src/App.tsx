import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';
import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Dashibodi from './pages/Dashibodi';
import Bidhaa from './pages/Bidhaa';
import Kikapu from './pages/Kikapu';
import Madeni from './pages/Madeni';
import Historia from './pages/Historia';
import Matumizi from './pages/Matumizi';
import Zaidi from './pages/Zaidi';
import Login from './pages/Login';
import Register from './pages/Register';
import SetupShop from './pages/SetupShop';
import LicenseGuard from './components/LicenseGuard';
import NetworkStatus from './components/NetworkStatus';
import { supabase } from './supabase';
import { Lock, Store } from 'lucide-react';

export default function App() {
  const isAuthenticated = useStore(state => state.isAuthenticated);
  const user = useStore(state => state.user);
  const setAuth = useStore(state => state.setAuth);
  const logout = useStore(state => state.logout);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        logout();
      } else if (session && event === 'SIGNED_IN') {
        const currentUser = useStore.getState().user;
        if (!currentUser) {
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();
              
            if (userData) {
              const localUser = {
                id: userData.id,
                email: session.user.email || '',
                name: userData.name,
                role: userData.role as any,
                shop_id: userData.shop_id,
                shopId: userData.shop_id,
                status: userData.status,
                isActive: userData.status === 'active',
                created_at: userData.created_at,
                updated_at: userData.updated_at,
                synced: 1
              };
              setAuth(session.access_token, localUser);
            }
          } catch (e) {
            console.error('Failed to fetch user profile on auth state change', e);
          }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setAuth, logout]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const checkStatus = async () => {
        if (isCheckingStatus) return;
        setIsCheckingStatus(true);
        try {
          const { data: userData, error } = await supabase
            .from('users')
            .select('status')
            .eq('id', user.id)
            .single();

          if (userData && !error) {
            const isActive = userData.status === 'active';
            if (isActive !== user.isActive) {
              const updatedUser = { ...user, isActive };
              setAuth(useStore.getState().token, updatedUser);
            }
          }
        } catch (e) {
          console.error('Failed to check user status', e);
        } finally {
          setIsCheckingStatus(false);
        }
      };

      checkStatus();
      const interval = setInterval(checkStatus, 10000); // Check every 10 seconds instead of 30
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user?.id, user?.isActive, setAuth, isCheckingStatus]);

  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <NetworkStatus />
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Login />} />
        </Routes>
      </BrowserRouter>
    );
  }

  const needsShopSetup = !user?.shop_id;

  return (
    <LicenseGuard>
      <BrowserRouter>
        <NetworkStatus />
        <div className="flex h-screen bg-slate-50 overflow-hidden">
          {/* Blocked User Overlay */}
          {user && !user.isActive && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 text-center">
              <div className="bg-white rounded-2xl p-8 max-w-sm shadow-2xl border border-red-100">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-10 h-10 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Akaunti Imezuiwa
                </h2>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  Umezuiliwa, tafadhali wasiliana <span className="font-bold text-red-600">0787979273</span>
                </p>
                <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-600 animate-pulse w-full"></div>
                </div>
              </div>
            </div>
          )}

          {!needsShopSetup && <Sidebar />}

          <main className="flex-1 overflow-y-auto bg-slate-50 pb-20 md:pb-0">
            {!needsShopSetup && (
              <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-40 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Store className="w-5 h-5 text-white" />
                  </div>
                  <h1 className="font-bold text-gray-900">Cloud POS</h1>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                </div>
              </header>
            )}
            <div className="max-w-7xl mx-auto">
              <Routes>
                {needsShopSetup ? (
                  <>
                    <Route path="/setup-shop" element={<SetupShop />} />
                    <Route path="*" element={<Navigate to="/setup-shop" replace />} />
                  </>
                ) : (
                  <>
                    <Route path="/" element={<Dashibodi />} />
                    <Route path="/bidhaa" element={<Bidhaa />} />
                    <Route path="/kikapu" element={<Kikapu />} />
                    <Route path="/madeni" element={<Madeni />} />
                    <Route path="/historia" element={<Historia />} />
                    <Route path="/matumizi" element={<Matumizi />} />
                    <Route path="/zaidi" element={<Zaidi />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </>
                )}
              </Routes>
            </div>
          </main>
          {!needsShopSetup && <BottomNav />}
        </div>
      </BrowserRouter>
    </LicenseGuard>
  );
}

