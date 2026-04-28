import { useState, useEffect } from 'react';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase.ts';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  Download, 
  Edit2, 
  Trash2, 
  Filter,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Invoice, InvoiceStatus, UserSettings } from '../types.ts';
import { generateInvoicePDF } from '../lib/pdf.ts';

interface InvoiceListProps {
  settings: UserSettings;
  onEdit: (id: string) => void;
  onNew: () => void;
}

export default function InvoiceList({ settings, onEdit, onNew }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all');

  const fetchInvoices = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(
        collection(db, 'invoices'),
        where('ownerId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await deleteDoc(doc(db, 'invoices', id));
      setInvoices(invoices.filter(inv => inv.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `invoices/${id}`);
    }
  };

  const handleDownload = async (invoice: Invoice) => {
    // Generate PDF and trigger download
    const blob = await generateInvoicePDF({
      ...invoice,
      companyName: settings.companyName,
      companyAddress: settings.companyAddress,
      bankInfo: `${settings.bankName} - ${settings.bankAccountName} (${settings.bankAccountNumber})`
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoiceNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || inv.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 uppercase">Riwayat Dokumen</h1>
          <p className="text-slate-500">Kelola dan lacak seluruh penagihan pengadaan Anda.</p>
        </div>
        <button 
          onClick={onNew}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 font-bold shadow-lg shadow-blue-600/10 transition-all hover:bg-blue-700 active:scale-95 text-sm uppercase tracking-wide"
        >
          <Plus size={18} />
          Invoice Baru
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input 
            type="text" 
            placeholder="Cari berdasarkan client atau nomor invoice..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 transition-all shadow-sm text-sm"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="pl-12 pr-10 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 appearance-none shadow-sm text-sm font-bold text-slate-600 cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value={InvoiceStatus.DRAFT}>Draft</option>
              <option value={InvoiceStatus.SENT}>Terkirim</option>
              <option value={InvoiceStatus.PAID}>Lunas</option>
              <option value={InvoiceStatus.OVERDUE}>Jatuh Tempo</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl p-24 flex flex-col items-center justify-center border border-slate-200 shadow-sm">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4" />
          <p className="font-bold text-[10px] uppercase tracking-widest text-slate-400">Menghubungkan ke server...</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-xl p-24 text-center border border-slate-200 shadow-sm">
          <FileText size={64} className="mx-auto mb-6 text-slate-100" />
          <h3 className="text-xl font-bold mb-2 text-slate-800 uppercase tracking-tight">Data Tidak Ditemukan</h3>
          <p className="text-slate-500 text-sm mb-8">Sesuaikan pencarian Anda atau buat invoice baru.</p>
          <button onClick={onNew} className="text-blue-600 font-bold uppercase tracking-widest text-xs border-b-2 border-blue-600/30 pb-1 hover:border-blue-600 transition-all">
            Buat Invoice Pertama
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4">Informasi Invoice</th>
                  <th className="px-6 py-4">Client Pemerintah</th>
                  <th className="px-6 py-4">Tanggal Terbit</th>
                  <th className="px-6 py-4">Total Tagihan</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Opsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <p className="font-bold text-slate-800">{inv.invoiceNumber}</p>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">REF: {inv.id?.slice(0, 8)}</span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-semibold text-slate-600">{inv.clientName}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-slate-500 font-medium">{new Date(inv.invoiceDate).toLocaleDateString('id-ID')}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-bold text-slate-900">Rp {inv.totalAmount.toLocaleString('id-ID')}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                        inv.status === InvoiceStatus.PAID ? 'bg-emerald-100 text-emerald-700' :
                        inv.status === InvoiceStatus.OVERDUE ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleDownload(inv)}
                          className="p-2 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors"
                          title="Cetak PDF"
                        >
                          <Download size={16} />
                        </button>
                        <button 
                          onClick={() => onEdit(inv.id!)}
                          className="p-2 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors"
                          title="Ubah"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(inv.id!)}
                          className="p-2 hover:bg-red-50 rounded text-slate-300 hover:text-red-500 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <button className="p-2 lg:hidden text-slate-300">
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
