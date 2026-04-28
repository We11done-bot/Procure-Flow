/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { auth, googleProvider, db } from './lib/firebase.ts';
import { signInWithPopup, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  FileText, 
  Settings as SettingsIcon, 
  FileUp, 
  LayoutDashboard, 
  LogOut,
  Files,
  Menu,
  X,
  User as UserIcon,
  ChevronRight
} from 'lucide-react';
import { UserSettings } from './types.ts';

// Components (will be created)
import Dashboard from './components/Dashboard.tsx';
import InvoiceList from './components/InvoiceList.tsx';
import InvoiceEditor from './components/InvoiceEditor.tsx';
import PDFToolbox from './components/PDFToolbox.tsx';
import Settings from './components/Settings.tsx';

type Page = 'dashboard' | 'invoices' | 'new-invoice' | 'pdf-tools' | 'settings';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Fetch settings
        const settingsRef = doc(db, 'settings', user.uid);
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          setSettings(settingsSnap.data() as UserSettings);
        } else {
          // Default settings
          const defaultSettings: UserSettings = {
            companyName: 'My Company',
            companyAddress: '',
            companyEmail: user.email || '',
            companyPhone: '',
            invoicePrefix: 'INV-',
            nextInvoiceNumber: 1,
            bankAccountName: '',
            bankAccountNumber: '',
            bankName: ''
          };
          await setDoc(settingsRef, defaultSettings);
          setSettings(defaultSettings);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = () => signInWithPopup(auth, googleProvider);
  const handleLogout = () => signOut(auth);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full"
      />
    </div>
  );

  if (!user) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-12 rounded-2xl shadow-2xl border border-slate-200 flex flex-col items-center text-center space-y-8"
      >
        <div className="w-16 h-16 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
          <Files size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-slate-900 uppercase">Procure<span className="text-blue-600">Flow</span></h1>
          <p className="text-slate-500 text-sm leading-relaxed">Professional Procurement & Invoicing Suite for Enterprise Management.</p>
        </div>
        <button 
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white hover:bg-blue-700 px-6 py-4 rounded-lg flex items-center justify-center gap-3 font-semibold transition-all shadow-lg shadow-blue-600/20 active:translate-y-0.5"
        >
          <UserIcon size={20} />
          Sign in with Google
        </button>
      </motion.div>
    </div>
  );

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'pdf-tools', label: 'PDF Tools', icon: FileUp },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard onNewInvoice={() => setActivePage('new-invoice')} onManageInvoices={() => setActivePage('invoices')} />;
      case 'invoices': return <InvoiceList settings={settings!} onEdit={(id) => { setEditingInvoiceId(id); setActivePage('new-invoice'); }} onNew={() => setActivePage('new-invoice')} />;
      case 'new-invoice': return <InvoiceEditor invoiceId={editingInvoiceId} onBack={() => { setEditingInvoiceId(null); setActivePage('invoices'); }} settings={settings!} onSettingsUpdate={(s) => setSettings(s)} />;
      case 'pdf-tools': return <PDFToolbox />;
      case 'settings': return <Settings settings={settings!} onUpdate={setSettings} />;
      default: return <Dashboard onNewInvoice={() => setActivePage('new-invoice')} onManageInvoices={() => setActivePage('invoices')} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between z-40 text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <Files size={18} />
          </div>
          <span className="font-bold tracking-tight uppercase text-sm">Procure<span className="text-blue-400">Flow</span></span>
        </div>
        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-8 border-b border-slate-800">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white">
                <Files size={18} />
              </div>
              <h1 className="text-xl font-bold tracking-tight uppercase">Procure<span className="text-blue-400">Flow</span></h1>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 opacity-70 font-bold uppercase tracking-widest">Sistem Pengadaan</p>
          </div>

          <nav className="flex-1 py-6 px-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id || (activePage === 'new-invoice' && item.id === 'invoices');
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActivePage(item.id as Page);
                    setSidebarOpen(false);
                    if (item.id !== 'invoices') setEditingInvoiceId(null);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium group
                    ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                  `}
                >
                  <Icon size={18} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'} />
                  {item.label}
                  {isActive && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />}
                </button>
              );
            })}
          </nav>

          <div className="p-6 border-t border-slate-800 bg-slate-950/30">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 overflow-hidden shrink-0">
                {user.photoURL ? <img src={user.photoURL} alt="User" /> : <UserIcon size={20} />}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-300 truncate leading-none mb-1 uppercase tracking-wide">{user.displayName || 'Direktur Utama'}</p>
                <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-400 hover:bg-red-900/20 hover:text-red-400 transition-all text-xs font-bold uppercase tracking-wider"
            >
              <LogOut size={16} />
              Keluar Sistem
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:pl-0 pt-16 lg:pt-0 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto p-6 lg:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
