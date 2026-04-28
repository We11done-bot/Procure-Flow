import { useState, useEffect } from 'react';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase.ts';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { motion } from 'motion/react';
import { 
  FileText, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Plus, 
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { Invoice, InvoiceStatus } from '../types.ts';

interface DashboardProps {
  onNewInvoice: () => void;
  onManageInvoices: () => void;
}

export default function Dashboard({ onNewInvoice, onManageInvoices }: DashboardProps) {
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0
  });
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!auth.currentUser) return;
      
      try {
        const q = query(
          collection(db, 'invoices'),
          where('ownerId', '==', auth.currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
        
        const newStats = invoices.reduce((acc, inv) => {
          acc.total += inv.totalAmount;
          if (inv.status === InvoiceStatus.PAID) acc.paid += inv.totalAmount;
          else if (inv.status === InvoiceStatus.OVERDUE) acc.overdue += inv.totalAmount;
          else acc.pending += inv.totalAmount;
          return acc;
        }, { total: 0, paid: 0, pending: 0, overdue: 0 });
        
        setStats(newStats);
        setRecentInvoices(invoices.slice(0, 5));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'invoices');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    { label: 'Total Piutang Berjalan', value: stats.total, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-white' },
    { label: 'Invoice Terbayar', value: stats.paid, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-white' },
    { label: 'Dalam Proses', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-white' },
    { label: 'Jatuh Tempo', value: stats.overdue, icon: FileText, color: 'text-red-600', bg: 'bg-white' },
  ];

  if (loading) return <div className="h-96 flex items-center justify-center font-bold text-slate-400 animate-pulse">MEMUAT DATA OPERASIONAL...</div>;

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Ringkasan Operasional</h2>
          <p className="text-slate-500 text-sm">Update Sistem Terakhir: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onNewInvoice}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 font-bold shadow-lg shadow-blue-900/10 hover:bg-blue-700 transition-all active:scale-95 text-sm"
          >
            <Plus size={18} />
            Buat Invoice Baru
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`p-6 rounded-xl border border-slate-200 ${stat.bg} shadow-sm group hover:border-blue-200 transition-colors cursor-default`}
          >
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-3">{stat.label}</p>
            <h3 className={`text-2xl font-bold text-slate-800 ${stat.color === 'text-blue-600' ? '' : stat.color}`}>
              Rp {stat.value.toLocaleString('id-ID')}
            </h3>
            <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '70%' }}
                className={`h-full ${stat.color.replace('text', 'bg')}`} 
              />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Invoices */}
        <div className="lg:col-span-2 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 tracking-tight">Invoice Terbaru</h3>
            <button onClick={onManageInvoices} className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-700">Lihat Semua</button>
          </div>
          
          <div className="flex-1">
            {recentInvoices.length === 0 ? (
              <div className="p-12 text-center text-slate-300">
                <FileText size={48} className="mx-auto mb-4 opacity-10" />
                <p className="text-sm font-medium">Belum ada invoice tercatat.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                      <th className="px-6 py-4">Nomor Invoice</th>
                      <th className="px-6 py-4">Client Pemerintah</th>
                      <th className="px-6 py-4 text-right">Nilai Tagihan</th>
                      <th className="px-6 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={onManageInvoices}>
                        <td className="px-6 py-4 font-bold text-slate-700">{inv.invoiceNumber}</td>
                        <td className="px-6 py-4 text-slate-500 font-medium">{inv.clientName}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-800">Rp {inv.totalAmount.toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 text-[10px] font-bold rounded uppercase tracking-tighter ${
                            inv.status === InvoiceStatus.PAID ? 'bg-emerald-100 text-emerald-700' :
                            inv.status === InvoiceStatus.OVERDUE ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Knowledge Base */}
        <div className="space-y-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] px-2">Optimasi Dokumen</h3>
          <div className="bg-slate-900 rounded-xl p-8 text-white flex flex-col items-center justify-center text-center shadow-xl shadow-slate-900/10">
            <div className="w-16 h-16 bg-blue-600/20 border border-blue-500/50 rounded-full flex items-center justify-center mb-6">
              <ArrowUpRight size={24} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-bold mb-2 uppercase tracking-wide">Pustaka Regulasi</h3>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">Panduan pengadaan barang/jasa sesuai standar portal pemerintah SPSE.</p>
            <div className="w-full space-y-3">
              {['Aturan Pajak 2024', 'Legalitas E-Invoicing', 'FAQ Penagihan'].map(item => (
                <div key={item} className="p-3 bg-white/5 border border-white/5 rounded-lg text-xs font-bold text-slate-300 hover:bg-white/10 transition-colors cursor-pointer flex justify-between items-center px-4">
                  {item}
                  <ChevronRight size={14} className="opacity-30" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
