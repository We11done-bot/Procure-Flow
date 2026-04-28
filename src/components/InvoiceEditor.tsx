import { useState, useEffect } from 'react';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase.ts';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, addDoc, Transaction, runTransaction } from 'firebase/firestore';
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Save, 
  FileText,
  Download,
  AlertCircle
} from 'lucide-react';
import { Invoice, InvoiceStatus, InvoiceItem, UserSettings } from '../types.ts';
import { generateInvoicePDF } from '../lib/pdf.ts';

interface InvoiceEditorProps {
  invoiceId: string | null;
  onBack: () => void;
  settings: UserSettings;
  onSettingsUpdate: (s: UserSettings) => void;
}

export default function InvoiceEditor({ invoiceId, onBack, settings, onSettingsUpdate }: InvoiceEditorProps) {
  const [loading, setLoading] = useState(!!invoiceId);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState<Partial<Invoice>>({
    invoiceNumber: '',
    clientName: '',
    clientAddress: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [{ id: Math.random().toString(36).substr(2, 9), description: '', quantity: 1, unitPrice: 0, total: 0 }],
    subtotal: 0,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 0,
    status: InvoiceStatus.DRAFT,
    notes: ''
  });

  useEffect(() => {
    if (invoiceId) {
      const fetchInvoice = async () => {
        try {
          const docRef = doc(db, 'invoices', invoiceId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setForm(docSnap.data() as Invoice);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `invoices/${invoiceId}`);
        } finally {
          setLoading(false);
        }
      };
      fetchInvoice();
    } else {
      // Auto-generate invoice number based on settings
      const nextNum = settings.invoicePrefix + settings.nextInvoiceNumber.toString().padStart(4, '0');
      setForm(prev => ({ ...prev, invoiceNumber: nextNum }));
    }
  }, [invoiceId, settings]);

  const calculateTotals = (items: InvoiceItem[], taxRate: number) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;
    setForm(prev => ({ ...prev, subtotal, taxAmount, totalAmount }));
  };

  const addItem = () => {
    const newItem: InvoiceItem = { id: Math.random().toString(36).substr(2, 9), description: '', quantity: 1, unitPrice: 0, total: 0 };
    const newItems = [...(form.items || []), newItem];
    setForm({ ...form, items: newItems });
    calculateTotals(newItems, form.taxRate || 0);
  };

  const removeItem = (id: string) => {
    const newItems = form.items?.filter(item => item.id !== id) || [];
    setForm({ ...form, items: newItems });
    calculateTotals(newItems, form.taxRate || 0);
  };

  const updateItem = (id: string, updates: Partial<InvoiceItem>) => {
    const newItems = form.items?.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        updated.total = updated.quantity * updated.unitPrice;
        return updated;
      }
      return item;
    }) || [];
    setForm({ ...form, items: newItems });
    calculateTotals(newItems, form.taxRate || 0);
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      if (invoiceId) {
        // Simple update
        await updateDoc(doc(db, 'invoices', invoiceId), {
          ...form,
          updatedAt: serverTimestamp()
        });
      } else {
        // Use Transaction to ensure unique numbering and update counter
        await runTransaction(db, async (transaction) => {
          const settingsRef = doc(db, 'settings', auth.currentUser!.uid);
          const settingsDoc = await transaction.get(settingsRef);
          
          if (!settingsDoc.exists()) throw new Error('Settings not found');
          
          const currentSettings = settingsDoc.data() as UserSettings;
          
          // Double check invoice number if user changed it manually? 
          // For now, let's trust the sequential flow.
          
          const newInvoiceRef = doc(collection(db, 'invoices'));
          transaction.set(newInvoiceRef, {
            ...form,
            status: InvoiceStatus.DRAFT,
            ownerId: auth.currentUser!.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          // Increment settings counter
          const updatedSettings = {
            ...currentSettings,
            nextInvoiceNumber: currentSettings.nextInvoiceNumber + 1
          };
          transaction.update(settingsRef, { nextInvoiceNumber: updatedSettings.nextInvoiceNumber });
          
          onSettingsUpdate(updatedSettings);
        });
      }
      onBack();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'invoices');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    const pdfData = {
      ...form,
      companyName: settings.companyName,
      companyAddress: settings.companyAddress,
      bankInfo: `${settings.bankName}\nA/N: ${settings.bankAccountName}\nAcc: ${settings.bankAccountNumber}`
    } as any;
    const blob = await generateInvoicePDF(pdfData);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.invoiceNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div>Loading Invoice...</div>;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-black/50 hover:text-black font-bold uppercase tracking-widest text-xs transition-colors">
          <ChevronLeft size={20} />
          Back to List
        </button>
        <div className="flex gap-3">
          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold text-xs uppercase tracking-widest text-slate-600 transition-all"
          >
            <Download size={16} />
            Preview PDF
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-600/10 transition-all disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {invoiceId ? 'Perbarui Invoice' : 'Simpan Invoice'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 md:p-10 space-y-10">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block mb-2">Nomor Invoice</label>
                <input 
                  type="text" 
                  value={form.invoiceNumber}
                  onChange={e => setForm({...form, invoiceNumber: e.target.value})}
                  className="text-3xl font-bold tracking-tight w-full bg-transparent border-b border-slate-100 focus:border-blue-400 outline-none transition-colors py-2"
                  placeholder="INV/000"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block mb-2">Tanggal Terbit</label>
                  <input 
                    type="date" 
                    value={form.invoiceDate}
                    onChange={e => setForm({...form, invoiceDate: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-lg text-sm font-medium outline-none focus:border-blue-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block mb-2">Tenggat Waktu</label>
                  <input 
                    type="date" 
                    value={form.dueDate}
                    onChange={e => setForm({...form, dueDate: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-lg text-sm font-medium outline-none focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 p-8 rounded-xl border border-slate-100 space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Detail Client Pemerintah</h3>
              <div className="space-y-3">
                <input 
                  type="text" 
                  placeholder="Nama Instansi (e.g. Dinas PUPR)" 
                  value={form.clientName}
                  onChange={e => setForm({...form, clientName: e.target.value})}
                  className="w-full bg-white px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-400 outline-none font-bold text-sm shadow-sm"
                />
                <textarea 
                  placeholder="Alamat Lengkap & Kontak Instansi" 
                  rows={3}
                  value={form.clientAddress}
                  onChange={e => setForm({...form, clientAddress: e.target.value})}
                  className="w-full bg-white px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-400 outline-none font-medium text-xs shadow-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 px-2">Daftar Barang / Jasa</h3>
            <div className="space-y-3">
              {form.items?.map((item) => (
                <div key={item.id} className="flex flex-col md:flex-row gap-3 p-4 bg-slate-50/50 rounded-xl border border-slate-100 group transition-all">
                  <div className="flex-grow">
                    <input 
                      type="text" 
                      placeholder="Deskripsi Pekerjaan" 
                      value={item.description}
                      onChange={e => updateItem(item.id, { description: e.target.value })}
                      className="w-full bg-transparent p-2 font-bold text-sm tracking-tight outline-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="w-20">
                      <input 
                        type="number" 
                        placeholder="Qty" 
                        value={item.quantity}
                        onChange={e => updateItem(item.id, { quantity: Number(e.target.value) })}
                        className="w-full bg-white p-2 rounded-lg border border-slate-200 font-mono text-center text-xs outline-none focus:border-blue-400"
                      />
                    </div>
                    <div className="w-36">
                      <input 
                        type="number" 
                        placeholder="Unit Price" 
                        value={item.unitPrice}
                        onChange={e => updateItem(item.id, { unitPrice: Number(e.target.value) })}
                        className="w-full bg-white p-2 rounded-lg border border-slate-200 font-mono text-right text-xs outline-none focus:border-blue-400"
                      />
                    </div>
                    <div className="w-36 flex items-center justify-end px-3">
                      <span className="font-bold text-slate-800 text-sm">Rp {item.total.toLocaleString('id-ID')}</span>
                    </div>
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-white rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={addItem}
              className="w-full flex items-center justify-center gap-2 p-4 border border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all font-bold text-[10px] uppercase tracking-widest"
            >
              <Plus size={16} />
              Tambah Baris Pekerjaan
            </button>
          </div>

          {/* Footer Totals & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-slate-100">
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 px-2">Catatan & Syarat Pembayaran</label>
              <textarea 
                rows={5}
                value={form.notes}
                onChange={e => setForm({...form, notes: e.target.value})}
                placeholder="Sertakan informasi rekening atau termin pembayaran..."
                className="w-full bg-slate-50 p-4 rounded-xl outline-none border border-transparent focus:border-slate-200 font-medium text-xs leading-relaxed"
              />
            </div>
            
            <div className="space-y-6">
              <div className="space-y-3 px-4">
                <div className="flex justify-between items-center text-slate-400 font-bold uppercase tracking-widest text-[9px]">
                  <span>Subtotal</span>
                  <span>Rp {form.subtotal?.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center gap-8">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">PPN (%)</span>
                    <input 
                      type="number" 
                      value={form.taxRate}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setForm({...form, taxRate: val});
                        calculateTotals(form.items || [], val);
                      }}
                      className="w-14 bg-slate-50 border border-slate-100 px-2 py-1 rounded font-mono text-center text-xs outline-none focus:border-blue-400"
                    />
                  </div>
                  <span className="font-bold text-slate-500 text-xs">Rp {form.taxAmount?.toLocaleString('id-ID')}</span>
                </div>
              </div>
              <div className="bg-slate-900 text-white p-6 rounded-xl flex justify-between items-center shadow-xl shadow-slate-900/10">
                <span className="font-bold uppercase tracking-[0.2em] text-[10px] opacity-50">Total Tagihan</span>
                <span className="text-2xl font-bold tracking-tight">Rp {form.totalAmount?.toLocaleString('id-ID')}</span>
              </div>
              
              <div className="flex items-start gap-3 bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold leading-normal">Nomor invoice akan otomatis dikunci dan urutan nomor di sistem akan bertambah setelah Anda menekan tombol Simpan.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
