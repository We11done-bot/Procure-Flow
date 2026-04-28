import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileUp, 
  RefreshCw, 
  Download, 
  Trash2, 
  FileText, 
  Scissors,
  Layers,
  Zap,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  FileType,
  Image as ImageIcon,
  ArrowRightLeft,
  ScanText
} from 'lucide-react';
import { optimizePDF, imageToPDF, pdfToImage, excelToPDF, pdfToExcel, pdfToWord, wordToPDF, performOCR } from '../lib/pdf.ts';

type ToolMode = 'compress' | 'convert';
type ConversionType = 'pdf-to-img' | 'img-to-pdf' | 'pdf-to-word' | 'word-to-pdf' | 'pdf-to-excel' | 'excel-to-pdf' | 'pdf-ocr';

export default function PDFToolbox() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [mode, setMode] = useState<ToolMode>('compress');
  const [conversionType, setConversionType] = useState<ConversionType>('pdf-to-img');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setOriginalSize(selected.size);
      setResult(null);
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      if (mode === 'compress') {
        const optimized = await optimizePDF(file);
        setResult(optimized);
      } else {
        let converted: Blob;
        switch (conversionType) {
          case 'pdf-to-img':
            converted = await pdfToImage(file);
            break;
          case 'img-to-pdf':
            converted = await imageToPDF(file);
            break;
          case 'excel-to-pdf':
            converted = await excelToPDF(file);
            break;
          case 'pdf-to-excel':
            converted = await pdfToExcel(file);
            break;
          case 'pdf-to-word':
            converted = await pdfToWord(file);
            break;
          case 'pdf-ocr':
            const imgBlob = await pdfToImage(file);
            const text = await performOCR(imgBlob);
            converted = new Blob([text], { type: 'text/plain' });
            break;
          case 'word-to-pdf':
            converted = await wordToPDF(file);
            break;
          default:
            // Simulation for any other complex formats
            await new Promise(r => setTimeout(r, 2000));
            converted = file; 
            break;
        }
        setResult(converted);
        if (converted.size === 0) {
          throw new Error('Hasil konversi kosong. Kemungkinan file sumber rusak atau tidak didukung.');
        }
      }
    } catch (error) {
      console.error(error);
      alert('Gagal memproses dokumen. Pastikan format file sesuai.');
    } finally {
      setProcessing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadResult = () => {
    if (!result || !file) return;
    const url = URL.createObjectURL(result);
    const a = document.createElement('a');
    a.href = url;
    
    let extension = 'pdf';
    if (conversionType === 'pdf-to-img') extension = 'jpg';
    else if (conversionType === 'pdf-to-word') extension = 'docx';
    else if (conversionType === 'pdf-to-excel') extension = 'xlsx';
    else if (conversionType === 'pdf-ocr') extension = 'txt';
    
    a.download = mode === 'compress' ? `optimized_${file.name}` : `converted_${file.name.split('.')[0]}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const conversionOptions: { id: ConversionType; label: string; icon: any; from: string; to: string }[] = [
    { id: 'pdf-to-img', label: 'PDF ke JPEG', icon: ImageIcon, from: '.pdf', to: '.jpg' },
    { id: 'img-to-pdf', label: 'Gambar ke PDF', icon: ImageIcon, from: '.jpg,.jpeg,.png', to: '.pdf' },
    { id: 'pdf-to-word', label: 'PDF ke Word', icon: FileType, from: '.pdf', to: '.docx' },
    { id: 'word-to-pdf', label: 'Word ke PDF', icon: FileType, from: '.doc,.docx', to: '.pdf' },
    { id: 'pdf-to-excel', label: 'PDF ke Excel', icon: FileSpreadsheet, from: '.pdf', to: '.xlsx' },
    { id: 'excel-to-pdf', label: 'Excel ke PDF', icon: FileSpreadsheet, from: '.xls,.xlsx', to: '.pdf' },
    { id: 'pdf-ocr', label: 'OCR PDF (Scan)', icon: ScanText, from: '.pdf', to: '.txt' },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 uppercase">PDF ToolBox</h1>
          <p className="text-slate-500">Optimasi dan konversi dokumen penagihan untuk portal pemerintah.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => { setMode('compress'); setFile(null); setResult(null); }}
            className={`px-6 py-2 rounded-md text-xs font-bold transition-all ${mode === 'compress' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
          >
            KOMPRESI
          </button>
          <button 
            onClick={() => { setMode('convert'); setFile(null); setResult(null); }}
            className={`px-6 py-2 rounded-md text-xs font-bold transition-all ${mode === 'convert' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
          >
            KONVERSI
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {mode === 'convert' && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {conversionOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => { setConversionType(opt.id); setFile(null); setResult(null); }}
                  className={`
                    p-4 rounded-xl border flex flex-col items-center gap-2 transition-all
                    ${conversionType === opt.id ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'}
                  `}
                >
                  <opt.icon size={24} />
                  <span className="text-[10px] font-black uppercase tracking-tighter">{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          <div 
            className={`
              relative p-12 lg:p-16 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer group
              ${file ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 bg-white hover:border-slate-400'}
            `}
          >
            <input 
              type="file" 
              accept={mode === 'compress' ? '.pdf' : conversionOptions.find(o => o.id === conversionType)?.from}
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-[50]"
            />
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all shadow-sm ${file ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-300'}`}>
              {file ? <CheckCircle size={40} /> : <FileUp size={40} />}
            </div>
            <div className="mt-8">
              <h3 className="text-xl font-bold text-slate-800 uppercase tracking-tight">
                {file ? file.name : `Pilih File ${mode === 'convert' ? 'Sumber' : 'PDF'}`}
              </h3>
              <p className="text-slate-400 text-sm mt-2 font-medium">
                {file ? `Ukuran Asli: ${formatSize(originalSize)}` : `Tarik file ke sini atau klik untuk browse`}
              </p>
            </div>
            {file && (
              <button 
                onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
                className="mt-6 px-5 py-2 rounded-lg border border-red-100 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all flex items-center gap-2 relative z-[60]"
              >
                <Trash2 size={14} /> Batalkan
              </button>
            )}
          </div>

          <AnimatePresence>
            {file && !result && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={handleProcess}
                disabled={processing}
                className="w-full bg-slate-900 text-white py-5 rounded-xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <RefreshCw className="animate-spin" size={20} />
                    Sedang Memproses...
                  </>
                ) : (
                  <>
                    <Zap size={20} className="text-blue-400" />
                    {mode === 'compress' ? 'Optimalkan Ukuran File' : 'Mulai Konversi Sekarang'}
                  </>
                )}
              </motion.button>
            )}
          </AnimatePresence>

          {result && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-emerald-50 border border-emerald-100 p-8 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm"
            >
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white shrink-0">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-900 text-sm uppercase tracking-tight">Proses Berhasil</h4>
                  <p className="text-emerald-600 text-xs font-medium">Ukuran Akhir: {formatSize(result.size)}</p>
                </div>
              </div>
              <button 
                onClick={downloadResult}
                className="w-full md:w-auto bg-emerald-600 text-white px-8 py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10"
              >
                <Download size={18} />
                Unduh Hasil
              </button>
            </motion.div>
          )}
        </div>

        <div className="space-y-6">
          <h2 className="text-[10px] font-bold tracking-[0.25em] px-4 uppercase text-slate-400">Teknologi Cerdas</h2>
          <div className="grid grid-cols-1 gap-4">
            {[
              { icon: ArrowRightLeft, title: 'Konversi Multi-Format', desc: 'Kemudahan mengubah dokumen penagihan menjadi berbagai format kantor tanpa kehilangan informasi penting.' },
              { icon: Layers, title: 'Sanitasi Struktur', desc: 'Sistem secara otomatis membersihkan metadata yang tidak diperlukan untuk mempercepat verifikasi portal.' },
              { icon: Zap, title: 'Performa Tinggi', desc: 'Pemrosesan lokal di browser menjamin keamanan data dan kecepatan tanpa perlu unggah ke server pihak ketiga.' }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 flex gap-5 group hover:border-blue-200 transition-all shadow-sm">
                <div className="w-12 h-12 bg-slate-50 rounded-xl shrink-0 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <feature.icon size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 mb-1 tracking-tight uppercase text-xs">{feature.title}</h3>
                  <p className="text-slate-500 text-[11px] leading-relaxed font-medium">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-5 bg-blue-50 rounded-xl border border-blue-100 flex gap-4">
            <AlertCircle size={20} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-blue-900 leading-normal uppercase">Digital Sovereignty</p>
              <p className="text-[10px] text-blue-800 font-medium">Konversi Office (Word/Excel) dioptimalkan untuk konten tekstual. Untuk dokumen dengan format grafik kompleks, disarankan menggunakan aplikasi desktop standar.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
