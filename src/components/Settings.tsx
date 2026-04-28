import { useState } from 'react';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase.ts';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { 
  Building2, 
  MapPin, 
  Mail, 
  Phone, 
  CreditCard, 
  Hash, 
  Save,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { UserSettings } from '../types.ts';

interface SettingsProps {
  settings: UserSettings;
  onUpdate: (s: UserSettings) => void;
}

export default function Settings({ settings, onUpdate }: SettingsProps) {
  const [form, setForm] = useState<UserSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    setSaved(false);
    try {
      await setDoc(doc(db, 'settings', auth.currentUser.uid), form);
      onUpdate(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings');
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    {
      title: 'Company Identity',
      icon: Building2,
      fields: [
        { key: 'companyName', label: 'Company Name', icon: Building2, placeholder: 'PT. Maju Bersama' },
        { key: 'companyAddress', label: 'Full Address', icon: MapPin, placeholder: 'Jl. Sudirman No 1...', type: 'textarea' },
        { key: 'companyEmail', label: 'Business Email', icon: Mail, placeholder: 'billing@company.com' },
        { key: 'companyPhone', label: 'Contact Number', icon: Phone, placeholder: '+62...' },
      ]
    },
    {
      title: 'Invoice Numbering',
      desc: 'Control how your invoices are dynamically numbered.',
      icon: Hash,
      fields: [
        { key: 'invoicePrefix', label: 'Invoice Prefix', icon: Hash, placeholder: 'INV/' },
        { key: 'nextInvoiceNumber', label: 'Next Counter Number', icon: Hash, placeholder: '1', type: 'number' },
      ]
    },
    {
      title: 'Payment Details',
      desc: 'These will appear at the bottom of your generated PDFs.',
      icon: CreditCard,
      fields: [
        { key: 'bankName', label: 'Bank Name', icon: CreditCard, placeholder: 'Bank Mandiri/BCA' },
        { key: 'bankAccountName', label: 'Account Holder Name', icon: CreditCard, placeholder: 'PT. Maju Bersama' },
        { key: 'bankAccountNumber', label: 'Account Number', icon: CreditCard, placeholder: '1234-5678...' },
      ]
    }
  ];

  return (
    <div className="max-w-4xl space-y-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 uppercase">Pengaturan Perusahaan</h1>
        <p className="text-slate-500">Sesuaikan identitas operasional dan standar dokumen Anda.</p>
      </header>

      <div className="flex flex-col gap-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 md:p-10 space-y-12">
            {sections.map((section, sIdx) => (
              <section key={section.title} className={sIdx > 0 ? 'pt-10 border-t border-slate-100' : ''}>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-blue-600">
                    <section.icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 leading-none mb-1">{section.title}</h3>
                    {section.desc && <p className="text-[10px] text-slate-400 font-medium">{section.desc}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {section.fields.map((field) => (
                    <div key={field.key} className={field.type === 'textarea' || field.key === 'invoicePrefix' ? 'md:col-span-2' : ''}>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1 mb-2 block">{field.label}</label>
                      <div className="relative group">
                        <field.icon size={16} className="absolute left-4 top-[14px] text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                        {field.type === 'textarea' ? (
                          <textarea
                            value={(form as any)[field.key]}
                            onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                            placeholder={field.placeholder}
                            rows={3}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/5 outline-none font-medium text-sm transition-all resize-none shadow-sm"
                          />
                        ) : (
                          <input
                            type={field.type || 'text'}
                            value={(form as any)[field.key]}
                            onChange={e => setForm({ ...form, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value })}
                            placeholder={field.placeholder}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/5 outline-none font-bold text-sm tracking-tight transition-all shadow-sm"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-8 bg-slate-900 rounded-xl shadow-xl shadow-slate-900/10 text-white">
          <div className="hidden md:block">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Status Konfigurasi</p>
            <p className="text-xs font-medium text-slate-300">Seluruh data disimpan dengan enkripsi di cloud.</p>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className={`
              min-w-[200px] h-12 rounded-lg flex items-center justify-center gap-3 font-bold transition-all text-xs uppercase tracking-widest
              ${saved ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-600/20'}
            `}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : saved ? (
              <>
                <CheckCircle2 size={16} />
                Berhasil Disimpan
              </>
            ) : (
              <>
                <Save size={16} />
                Simpan Perubahan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
