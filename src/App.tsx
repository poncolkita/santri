import React, { useState, useEffect, useRef } from "react";
import {
  Volume2,
  Tv,
  CheckCircle,
  Users,
  Clock,
  Play,
  RotateCw,
  Search,
  Check,
  XCircle,
  AlertCircle,
  FileText,
  User,
  Building2,
  VolumeX,
  Plus,
  Download,
  Database,
  Wifi,
  WifiOff,
  Copy,
  ChevronRight,
  RefreshCw,
  Lock,
  ChevronDown,
  Settings
} from "lucide-react";

// Koneksi parameter (Sesuai spesifikasi - Hardcoded)
const SYSTEM_ID = "PONCOL-2026-JCZCVP";
const SPREADSHEET_ID = "1QmU1fIty8r9xee26Yj1iSd5s1gCJd_NcxzcbQWt3L1g";
const SHEET_NAME = "ANTRIAN";
const API_KEY = "AIzaSyAeBnLR5BMA-WPEz4rLtGFVAs4bpdWz81s";

// Resolusi Parameter dengan mengecek dari Environment Variable (.env / Vercel Env) atau default value
const RESOLVED_SPREADSHEET_ID = (import.meta as any).env?.VITE_SPREADSHEET_ID || SPREADSHEET_ID;
const RESOLVED_SHEET_NAME = (import.meta as any).env?.VITE_SHEET_NAME || SHEET_NAME;
const RESOLVED_API_KEY = (import.meta as any).env?.VITE_GOOGLE_SHEETS_API_KEY || API_KEY;

// Interface Antrian
interface QueueItem {
  id: number;
  no_antrian: string;
  nama: string;
  alamat: string;
  layanan: string;
  status: "wait" | "calling" | "called" | "done" | "skip";
  calledLoket?: string;
  calledTime?: string;
}

// Interface Riwayat Panggilan
interface CallHistoryItem {
  no_antrian: string;
  nama: string;
  loket: string;
  time: string;
}

// Data Contoh bawaan (Mock Data/Fallback) yang diinput otomatis jika API Key Google Sheets unconfigured/offline
const FALLBACK_DATA: QueueItem[] = [
  { id: 1, no_antrian: "A001", nama: "Bambang Pamungkas", alamat: "Jl. Pahlawan No. 25, Kartoharjo, Kota Madiun", layanan: "KTP", status: "wait" },
  { id: 2, no_antrian: "B001", nama: "Rina Wijayanti", alamat: "Jl. Ring Road Barat RT 04/RW 02, Sogaten", layanan: "SKCK", status: "wait" },
  { id: 3, no_antrian: "C001", nama: "Slamet Rahardjo", alamat: "Dusun Sogaten RT 10 No. 4, Karangrejo", layanan: "Akte Lahir", status: "wait" },
  { id: 4, no_antrian: "D001", nama: "Aisyah Putri Rahma", alamat: "Perum Demangan Indah Blok C-5, Jisenan", layanan: "Izin Usaha", status: "wait" },
  { id: 5, no_antrian: "E001", nama: "Eko Prasetyo", alamat: "Jl. Slamet Riyadi Gg. Melati 3, Kota Madiun", layanan: "Lainnya", status: "wait" },
  { id: 6, no_antrian: "A002", nama: "Siti Aminah", alamat: "Jl. Diponegoro No.12, Madiun", layanan: "KTP", status: "wait" },
  { id: 7, no_antrian: "B002", nama: "Kuswanto", alamat: "Dusun Suko RT 02/RW 01, Poncol", layanan: "SKCK", status: "wait" },
  { id: 8, no_antrian: "C002", nama: "Diana Lestari", alamat: "Jl. Mawar Gg. 3 No. 12, Kel. Poncol", layanan: "Akte Lahir", status: "wait" }
];

// Fungsi normalisasi pesan error untuk memandu pengguna mendaftarkan API Sheets di Google Cloud (menjaga detail error asli)
const normalizeSheetError = (message: string): string => {
  if (!message) return "Gagal menghubungi Google Sheets API Server.";
  return message;
};

// Ekstraktor tautan konsol untuk link aktivasi langsung
const extractCloudConsoleUrl = (text: string | null): string | null => {
  if (!text) return null;
  const match = text.match(/https?:\/\/(?:console\.developers|console\.cloud)\.google\.com\/[a-zA-Z0-9-._~:\/?#[\]@!$&'()*+,;=]+/i);
  return match ? match[0] : null;
};

// Ekstraktor nomor proyek dari pesan error Google Cloud
const extractProjectNumber = (text: string | null): string | null => {
  if (!text) return null;
  const match = text.match(/(?:project\s+|project=)([0-9]+)/i);
  return match ? match[1] : null;
};

// Render kartu info pemecahan masalah koneksi yang interaktif & informatif
const renderConnectionErrorCard = (errorText: string | null) => {
  if (!errorText) return null;

  const lower = errorText.toLowerCase();
  const projectNumber = extractProjectNumber(errorText);
  const consoleUrl = extractCloudConsoleUrl(errorText);

  // Deteksi tipe error
  const isBlocked = lower.includes("blocked") || lower.includes("restrict");
  const isDisabled = lower.includes("disabled") || lower.includes("has not been used") || lower.includes("enable") || !!consoleUrl;
  const isInvalidKey = lower.includes("api key not valid") || lower.includes("invalid") || lower.includes("key tidak valid") || lower.includes("403");

  // Siapkan tautan bantuan dinamis sesuai nomor project terdeteksi
  const googleSheetsEnableUrl = projectNumber 
    ? `https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=${projectNumber}`
    : `https://console.cloud.google.com/apis/library/sheets.googleapis.com`;

  const credentialsUrl = projectNumber
    ? `https://console.cloud.google.com/apis/credentials?project=${projectNumber}`
    : `https://console.cloud.google.com/apis/credentials`;

  return (
    <div className="mt-4 p-4 md:p-5 bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl flex flex-col gap-4 text-xs shadow-xl animate-fadeIn">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-rose-500/15 rounded-xl text-rose-400 shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="font-extrabold text-slate-100 text-sm tracking-tight uppercase">
            {isBlocked && "🔒 AKSES API KEY DIBLOKIR / DIBATASI (API RESTRICTIONS)"}
            {isDisabled && "⚠️ GOOGLE SHEETS API BELUM AKTIF"}
            {isInvalidKey && !isBlocked && !isDisabled && "❌ API KEY ATAU HAK AKSES BERMASALAH"}
            {!isBlocked && !isDisabled && !isInvalidKey && "📡 MASALAH SINKRONISASI DATABASES / SPREADSHEET"}
          </h4>
          <p className="text-slate-400 text-[11.5px] leading-relaxed">
            {errorText}
          </p>
        </div>
      </div>

      {/* DETAILED DIAGNOSTICS & RESOLUTION */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3.5 text-slate-300">
        {isBlocked && (
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-300 px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
              Penyebab & Solusi Mandiri:
            </span>
            <p className="text-[11.5px] leading-relaxed text-slate-300">
              API pembatasan (API Restrictions) pada kunci Google Cloud Anda sedang aktif, namun Anda <strong>belum memberikan centang/izin untuk layanan &quot;Google Sheets API&quot;</strong>.
            </p>
            <div className="mt-2 text-[11px] bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 text-slate-400 space-y-1">
              <p className="font-bold text-slate-200">Cara Mematikan Pembatasan atau Memberi Izin:</p>
              <p>1. Buka halaman pengaturan API Key Anda di Google Cloud Console.</p>
              <p>2. Cari bagian <strong>&quot;API restrictions&quot; (Pembatasan API)</strong> di bagian bawah halaman.</p>
              <p>3. Ubah pilihan ke <strong>&quot;Don't restrict key&quot; (Jangan batasi kunci)</strong> untuk menghapus pembatasan sepenuhnya, ATAU jika ingin tetap membatasi, pilih opsi edit lalu pastikan Anda memberi centang pada <strong>&quot;Google Sheets API&quot;</strong>.</p>
              <p>4. Klik <strong>Save / Simpan</strong>, tunggu 30 detik, lalu klik tombol sinkronisasi lagi di sini.</p>
            </div>
            <div className="pt-1.5 flex flex-wrap gap-2">
              <a
                href={credentialsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-3 py-2 rounded-lg text-[10px] uppercase tracking-wider transition shadow cursor-pointer"
              >
                ⚙️ Atur API Key Restrictions di Cloud Console
              </a>
            </div>
          </div>
        )}

        {isDisabled && (
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-300 px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
              Penyebab & Solusi Mandiri:
            </span>
            <p className="text-[11.5px] leading-relaxed text-slate-300">
              Layanan library <strong>&quot;Google Sheets API&quot;</strong> belum diaktifkan di dalam proyek Google Cloud Console Anda, sehingga API Key ditolak oleh Google.
            </p>
            <div className="mt-2 text-[11px] bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 text-slate-400 space-y-1">
              <p className="font-bold text-slate-200">Cara Mengaktifkan Google Sheets API:</p>
              <p>1. Klik tombol jalankan aktivasi cepat berwarna biru di bawah ini.</p>
              <p>2. Begitu halaman Google Cloud Console terbuka, klik tombol biru besar bertuliskan <strong>&quot;ENABLE&quot; (Aktifkan)</strong>.</p>
              <p>3. Tunggu proses aktivasi sekitar 1 menit di console Google.</p>
              <p>4. Kembali ke halaman Web Antrian ini lalu klik tombol <strong>&quot;Segarkan Data&quot;</strong>.</p>
            </div>
            <div className="pt-1.5 flex flex-wrap gap-2">
              <a
                href={consoleUrl || googleSheetsEnableUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black px-3.5 py-2.5 rounded-lg text-[11px] uppercase tracking-widest transition shadow animate-bounce cursor-pointer"
              >
                👉 AKTIFKAN GOOGLE SHEETS API (1-KLIK)
              </a>
            </div>
          </div>
        )}

        {isInvalidKey && !isBlocked && !isDisabled && (
          <div className="space-y-4 text-left">
            <span className="inline-flex items-center gap-1 bg-rose-500/15 text-rose-300 px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
              CARA MEMPEROLEH API KEY (VITE_GOOGLE_SHEETS_API_KEY):
            </span>
            <p className="text-slate-300 text-[11.5px] leading-relaxed">
              API Key Google Sheets diperoleh gratis melalui <strong>Google Cloud Console</strong>. Ikuti langkah mudah berikut ini untuk membuat kunci API Anda sendiri:
            </p>
            <div className="mt-2 text-[11.5px] bg-[#070b13] p-4.5 rounded-xl border border-slate-800 text-slate-300 space-y-3.5 leading-relaxed">
              <p className="font-extrabold text-[#9A91FB] flex items-center gap-1.5 border-b border-slate-900 pb-1.5 uppercase tracking-wide">
                <span>📋</span> Langkah Demi Langkah Membuat API Key:
              </p>
              
              <div className="flex gap-2.5">
                <span className="bg-[#534AB7] text-white font-black w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                <div>
                  <p className="font-bold text-white">Buka Google Cloud Console</p>
                  <p className="text-slate-400 text-[11px]">Kunjungi tautan resmi <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">console.cloud.google.com</a> dan masuk menggunakan akun Google/Gmail Anda.</p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <span className="bg-[#534AB7] text-white font-black w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                <div>
                  <p className="font-bold text-white">Buat Proyek Baru (Jika Belum Ada)</p>
                  <p className="text-slate-400 text-[11px]">Klik menu dropdown di bagian atas layar (sebelah logo Google Cloud), lalu klik <strong>&quot;NEW PROJECT&quot;</strong> (Proyek Baru) dan berikan nama bebas (contoh: <code>antrian-desa</code>).</p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <span className="bg-[#534AB7] text-white font-black w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                <div>
                  <p className="font-bold text-white">Aktifkan Google Sheets API</p>
                  <p className="text-slate-400 text-[11px]">Pada kotak pencarian di bagian paling atas halaman Google Cloud, cari kata kunci <strong>&quot;Google Sheets API&quot;</strong>. Klik layanan tersebut, lalu klik tombol biru besar bertuliskan <strong>&quot;ENABLE&quot;</strong> (Aktifkan).</p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <span className="bg-[#534AB7] text-white font-black w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</span>
                <div>
                  <p className="font-bold text-white">Buat API Key</p>
                  <p className="text-slate-400 text-[11px]">Buka menu navigasi kiri <strong>&quot;APIs & Services&quot; &gt; &quot;Credentials&quot;</strong>. Klik tombol <strong>&quot;+ CREATE CREDENTIALS&quot;</strong> di atas, lalu pilih opsi <strong>&quot;API Key&quot;</strong>. Google akan langsung menampilkan kunci panjang Anda (contoh: <code>AIzaSy...</code>).</p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <span className="bg-[#534AB7] text-white font-black w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">5</span>
                <div>
                  <p className="font-bold text-white">Bagikan Spreadsheet Anda</p>
                  <p className="text-slate-400 text-[11px]">Buka Google Spreadsheet antrian Anda, klik <span className="bg-blue-600 px-1.5 py-0.5 rounded text-[10px] text-white font-bold">Bagikan / Share</span> di pojok kanan atas, lalu ubah status Akses Umum menjadi <strong>&quot;Anyone with the link can view&quot;</strong> (Siapa saja yang memiliki link dapat melihat).</p>
                </div>
              </div>
            </div>
            
            <div className="pt-1.5 flex flex-wrap gap-2">
              <a
                href={credentialsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-2.5 rounded-xl text-[10.5px] uppercase tracking-wider transition shadow-md hover:scale-[1.01] cursor-pointer"
              >
                🚀 Buka Cloud Console untuk Membuat Kunci API Sekarang
              </a>
            </div>
          </div>
        )}

        {!isBlocked && !isDisabled && !isInvalidKey && (
          <div className="space-y-2">
            <p className="text-slate-300 text-[11.5px]">
              Silakan periksa apakah file Google Spreadsheet Anda sudah di-set hak aksesnya ke <strong>&quot;Siapa saja yang memiliki link dapat melihat&quot; (Anyone with link can view)</strong>. Jika hak aksesnya masih &quot;Dibatasi&quot; (Restricted), REST API Key tidak dapat membaca data Anda.
            </p>
            <div className="text-[11px] bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 text-slate-400 space-y-1">
              <p className="font-bold text-slate-200">Cara Mengubah Hak Akses Spreadsheet:</p>
              <p>1. Buka file Google Spreadsheet antrian Anda.</p>
              <p>2. Klik tombol biru <strong>&quot;Bagikan&quot; (Share)</strong> di pojok kanan atas.</p>
              <p>3. Pada bagian &quot;Akses umum&quot; (General access), ubah status dari <strong>&quot;Dibatasi&quot; (Restricted)</strong> menjadi <strong>&quot;Siapa saja yang memiliki link&quot; (Anyone with the link)</strong>.</p>
              <p>4. Set perannya sebagai <strong>&quot;Pelihat&quot; (Viewer)</strong> agar data tetap aman.</p>
              <p>5. Klik <strong>Selesai</strong> dan coba segarkan kembali halaman Web Antrian ini.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  // State Navigasi & Koneksi Sheet
  const [activeTab, setActiveTab] = useState<"operator" | "display" | "info">("operator");
  const [instansiName, setInstansiName] = useState<string>("PEMERINTAH DESA PONCOL");
  const [subHeader, setSubHeader] = useState<string>("SISTEM PELAYANAN ADM & INFORMASI DIGITAL");

  // State Parameter Koneksi (Bisa disesuaikan oleh user via UI, beralih antara database fallback dan Google Sheets)
  const [customSpreadsheetId, setCustomSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem("VITE_SPREADSHEET_ID") || RESOLVED_SPREADSHEET_ID;
  });
  const [customSheetName, setCustomSheetName] = useState<string>(() => {
    return localStorage.getItem("VITE_SHEET_NAME") || RESOLVED_SHEET_NAME;
  });
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    const saved = localStorage.getItem("VITE_GOOGLE_SHEETS_API_KEY");
    return (saved && saved.trim() !== "" && !saved.includes("GANTI_DENGAN")) ? saved : RESOLVED_API_KEY;
  });

  // State Data & Sinkronisasi
  const [queueList, setQueueList] = useState<QueueItem[]>(FALLBACK_DATA);
  const [historyList, setHistoryList] = useState<CallHistoryItem[]>([
    { no_antrian: "A040", nama: "Bambang Pamungkas", loket: "Loket 2", time: "09:12" },
    { no_antrian: "B011", nama: "Rina Wijayanti", loket: "Loket 1", time: "09:05" }
  ]);
  
  // Custom Operator Loket State (6 Operator)
  const [operatorNames, setOperatorNames] = useState<string[]>(() => {
    const saved = localStorage.getItem("VITE_OPERATOR_NAMES");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 6) {
          return parsed;
        }
      } catch (e) {}
    }
    return [
      "Operator 1 (Pendaftaran)",
      "Operator 2 (Sertifikasi)",
      "Operator 3 (Kependudukan)",
      "Operator 4 (Umum)",
      "Operator 5 (Keuangan)",
      "Operator 6 (Kesejahteraan)"
    ];
  });

  const [currentLoket, setCurrentLoket] = useState<string>(() => {
    const savedNames = localStorage.getItem("VITE_OPERATOR_NAMES");
    let initialName = "Operator 1 (Pendaftaran)";
    if (savedNames) {
      try {
        const parsed = JSON.parse(savedNames);
        if (Array.isArray(parsed) && parsed[0]) initialName = parsed[0];
      } catch (e) {}
    }
    return `Loket 1 (${initialName})`;
  });
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // State Monitoring API
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [lastFetchTime, setLastFetchTime] = useState<string>("");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState<boolean>(true);
  const [testResult, setTestResult] = useState<string>("");

  // State TTS & Clock
  const [isAnnouncing, setIsAnnouncing] = useState<boolean>(false);
  const [ttsText, setTtsText] = useState<string>("Siap dipanggil");
  const [currentTime, setCurrentTime] = useState<string>("");
  const [gasCopied, setGasCopied] = useState<boolean>(false);
  const [showGasCode, setShowGasCode] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Ref
  const intervalFetchRef = useRef<any>(null);
  const ttsTimeoutRef = useRef<any>(null);

  // Clock Digital Real-time (HH:MM:SS)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      setCurrentTime(formatted);
    };

    updateTime();
    const clockInterval = setInterval(updateTime, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Sinkronisasi data otomatis saat aplikasi terbuka & setiap 30 detik
  useEffect(() => {
    fetchDataFromSheets();

    // Auto-refresh setiap 30 detik
    intervalFetchRef.current = setInterval(() => {
      fetchDataFromSheets();
    }, 30000);

    return () => {
      if (intervalFetchRef.current) {
        clearInterval(intervalFetchRef.current);
      }
    };
  }, [customSpreadsheetId, customApiKey, customSheetName]);

  // Fungsi penggabungan data API dengan status pengerjaan lokal (Memory JS)
  const mergeWithLocalMemory = (fetchedItems: QueueItem[]) => {
    setQueueList((prev) => {
      if (prev.length === 0) return fetchedItems;
      const prevMap = new Map<string, QueueItem>(prev.map((item) => [item.no_antrian, item]));
      return fetchedItems.map((item) => {
        const existing = prevMap.get(item.no_antrian);
        if (existing) {
          // Tetap gunakan status lokal, loket pemanggil, dan waktu pemanggilan jika sudah diproses di Memory JS
          return {
            ...item,
            status: existing.status,
            calledLoket: existing.calledLoket,
            calledTime: existing.calledTime
          };
        }
        return item;
      });
    });
  };

  // Ambil Data dari Google Sheets
  const fetchDataFromSheets = async () => {
    setIsFetching(true);
    setFetchError(null);

    const hasApiKeyPlaceholder = !customApiKey || customApiKey.includes("GANTI_DENGAN") || customApiKey === "AIzaSyCtY4ESw7YTQ2b4sbJaLJmNc_1q1cQAnow";
    const activeApiKey = hasApiKeyPlaceholder ? "" : customApiKey;

    if (!activeApiKey) {
      setFetchError("API Key Google Sheets belum diubah dari setelan default bawaan. Saat ini aplikasi berjalan dalam 'Mode Demonstrasi' menggunakan database lokal (fallback).");
      setIsUsingFallback(true);
      setIsFetching(false);
      return;
    }

    const urlAntrian = `https://sheets.googleapis.com/v4/spreadsheets/${customSpreadsheetId}/values/${customSheetName}?key=${activeApiKey}`;

    try {
      // Fetch Sheet Antrian
      const resAntrian = await fetch(urlAntrian);
      if (!resAntrian.ok) {
        const errJson = await resAntrian.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Gagal mengambil sheet antrian (HTTP ${resAntrian.status})`);
      }

      const dataAntrian = await resAntrian.json();
      if (!dataAntrian.values || dataAntrian.values.length === 0) {
        throw new Error(`Data sheet '${customSheetName}' kosong atau baris header tidak ditemukan.`);
      }

      const rows = dataAntrian.values;
      const headers = rows[0].map((h: any) => String(h).toUpperCase().trim());

      // Mencari indeks kolom secara murni fleksibel agar aman jika urutan kolom berbeda
      const idxNo = headers.indexOf("NO_ANTRIAN") !== -1 ? headers.indexOf("NO_ANTRIAN") : (headers.indexOf("NOMOR") !== -1 ? headers.indexOf("NOMOR") : 0);
      const idxNama = headers.indexOf("NAMA_LENGKAP") !== -1 ? headers.indexOf("NAMA_LENGKAP") : (headers.indexOf("NAMA") !== -1 ? headers.indexOf("NAMA") : 1);
      const idxAlamat = headers.indexOf("ALAMAT") !== -1 ? headers.indexOf("ALAMAT") : (headers.indexOf("DOMISILI") !== -1 ? headers.indexOf("DOMISILI") : 2);
      const idxLayanan = headers.indexOf("JENIS_LAYANAN") !== -1 ? headers.indexOf("JENIS_LAYANAN") : (headers.indexOf("LAYANAN") !== -1 ? headers.indexOf("LAYANAN") : 3);
      const idxStatus = headers.indexOf("STATUS") !== -1 ? headers.indexOf("STATUS") : (headers.indexOf("KETERANGAN") !== -1 ? headers.indexOf("KETERANGAN") : 5);
      const idxLoket = headers.indexOf("LOKET") !== -1 ? headers.indexOf("LOKET") : 6;
      const idxWaktu = headers.indexOf("WAKTU_DAFTAR") !== -1 ? headers.indexOf("WAKTU_DAFTAR") : (headers.indexOf("JAM") !== -1 ? headers.indexOf("JAM") : 7);

      const parsedItems: QueueItem[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const getVal = (idx: number) => (row[idx] !== undefined ? String(row[idx]).trim() : "");

        // Normalisasi status dari lembar Google Sheets ke tipe data JS
        const rawStatus = getVal(idxStatus).trim().toUpperCase();
        let normalizedStatus: "wait" | "calling" | "called" | "done" | "skip" = "wait";
        if (rawStatus === "MENUNGGU" || rawStatus === "WAIT") normalizedStatus = "wait";
        else if (rawStatus === "DIPANGGIL" || rawStatus === "CALLING") normalizedStatus = "calling";
        else if (rawStatus === "TELAH DIPANGGIL" || rawStatus === "CALLED") normalizedStatus = "called";
        else if (rawStatus === "SELESAI" || rawStatus === "DONE") normalizedStatus = "done";
        else if (rawStatus === "DILEWATI" || rawStatus === "SKIP" || rawStatus === "LEWAT") normalizedStatus = "skip";

        parsedItems.push({
          id: i,
          no_antrian: getVal(idxNo) || `A${String(i).padStart(3, "0")}`,
          nama: getVal(idxNama) || "Warga Tanpa Nama",
          alamat: getVal(idxAlamat) || "Domisili Rahasia",
          layanan: getVal(idxLayanan) || "Administrasi Umum",
          status: normalizedStatus,
          calledLoket: getVal(idxLoket) || "-",
          calledTime: getVal(idxWaktu) || "-"
        });
      }

      mergeWithLocalMemory(parsedItems);
      setIsUsingFallback(false);

      const now = new Date();
      setLastFetchTime(now.toLocaleTimeString("id-ID"));
    } catch (err: any) {
      console.error(err);
      const normalizedMsg = normalizeSheetError(err.message || "");
      setFetchError(normalizedMsg);
      setIsUsingFallback(true);
      const now = new Date();
      setLastFetchTime(now.toLocaleTimeString("id-ID") + " (Local Fallback)");
    } finally {
      setIsFetching(false);
    }
  };

  // Uji Coba Ping Koneksi Mandiri
  const handleTestConnection = async () => {
    setTestResult("Sedang mencoba melakukan ping ke Google Sheets API versi v4...");
    const hasApiKeyPlaceholder = !customApiKey || customApiKey.includes("GANTI_DENGAN") || customApiKey === "AIzaSyCtY4ESw7YTQ2b4sbJaLJmNc_1q1cQAnow";
    const activeApiKey = hasApiKeyPlaceholder ? "" : customApiKey;

    if (!activeApiKey) {
      setTestResult("PING GAGAL: Google Sheets API Key bawaan/default tidak valid dan belum disesuaikan. Silakan masukkan API Key baru Anda di panel pengaturan.");
      return;
    }

    const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${customSpreadsheetId}?key=${activeApiKey}`;
    try {
      const startTime = Date.now();
      const res = await fetch(testUrl);
      const latency = Date.now() - startTime;
      
      if (res.ok) {
        const data = await res.json();
        setTestResult(
          `PING BERHASIL! \n` +
          `• Latensi: ${latency}ms\n` +
          `• Nama Spreadsheet: "${data.properties.title || "Untitled"}"\n` +
          `• Status Koneksi: AKTIF & Valid (200 OK)\n` +
          `• Jumlah Sheet Terbaca: ${data.sheets?.length || 0} unit\n` +
          `• Sinkronisasi otomatis aman digunakan.`
        );
      } else {
        const errResponse = await res.json().catch(() => ({}));
        const errMsg = errResponse.error?.message || "";
        const isBlocked = errMsg.toLowerCase().includes("blocked") || errMsg.toLowerCase().includes("not enabled") || errMsg.toLowerCase().includes("restrict");
        
        setTestResult(
          `PING GAGAL (HTTP Code: ${res.status})\n` +
          `• Pesan: ${errMsg || "Tidak dapat memetakan detail error."}\n` +
          `• Solusi: Cek apakah API Key Anda valid dan hak akses file spreadsheet di-set "Siapa saja dengan link dapat melihat (Viewer)".` +
          (isBlocked ? 
            `\n\n💡 REKOMENDASI SOLUSI UNTUK ERROR ANDA:\n` +
            `Error ini mengonfirmasi bahwa "Google Sheets API" belum diaktifkan di Console Anda.\n` +
            `Cara Mengaktifkan:\n` +
            `1. Gunakan kolom pencarian di bagian atas Google Cloud Console Anda (di mana Anda membuat API Key)\n` +
            `2. Ketik "Google Sheets API" di kolom pencarian tersebut\n` +
            `3. Klik layanan "Google Sheets API" yang muncul di hasil pencarian\n` +
            `4. Klik tombol biru bertuliskan "ENABLE" (Aktifkan)\n` +
            `5. Tunggu 1 menit lalu tekan tombol "TEST KONEKSI" lagi di sini, status akan langsung sukses!`
            : ""
          )
        );
      }
    } catch (e: any) {
      setTestResult(`ERROR KONEKTIVITAS: ${e.message}\nPastikan koneksi internet Anda stabil.`);
    }
  };

  // Reset API Key kembali ke setelan standard
  const handleSaveApiKey = (key: string) => {
    localStorage.setItem("VITE_GOOGLE_SHEETS_API_KEY", key);
    setCustomApiKey(key);
  };

  // Filter & Searching Berdasarkan Nama / No Antrian
  const filteredQueue = queueList.filter((item) => {
    const query = searchQuery ? searchQuery.toLowerCase() : "";
    const matchesSearch =
      item.nama.toLowerCase().includes(query) ||
      item.no_antrian.toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === "all" ||
      item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pemrosesan Panggilan Suara (Text-to-Speech id-ID)
  const triggerTtsAnnouncement = (item: QueueItem, targetLoket: string) => {
    if (!window.speechSynthesis) {
      console.warn("Speech Synthesis tidak didukung browser ini.");
      return;
    }

    // Batalkan seluruh antrian suara terdahulu jika sedang mengantre
    window.speechSynthesis.cancel();
    if (ttsTimeoutRef.current) {
      clearTimeout(ttsTimeoutRef.current);
    }

    // Eja nomor antrian karakter demi karakter agar terbaca jelas
    const spelledCode = String(item.no_antrian)
      .toUpperCase()
      .split("")
      .map((char) => (char === "0" ? "nol" : char))
      .join(" ");

    // Format Kalimat: "Nomor antrian [nomor dieja], atas nama [nama], silakan menuju [loket]"
    const sentence = `Nomor antrian ${spelledCode}, atas nama ${item.nama}, silakan menuju ${targetLoket}`;

    setTtsText(`Memanggil ${item.no_antrian} ke ${targetLoket}`);
    setIsAnnouncing(true);

    const speakSentence = (text: string, onEnded: () => void) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = 0.88; // Rate Kecepatan 0.88

      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find((v) => v.lang.startsWith("id") || v.lang === "id-ID");
      if (idVoice) {
        utterance.voice = idVoice;
      }

      utterance.onstart = () => setIsAnnouncing(true);
      utterance.onend = onEnded;
      utterance.onerror = onEnded;

      window.speechSynthesis.speak(utterance);
    };

    // Panggil Ke-1, tunggu jeda 800ms, lalu panggil Ke-2 otomatis (total 2 kali)
    speakSentence(sentence, () => {
      ttsTimeoutRef.current = setTimeout(() => {
        speakSentence(sentence, () => {
          setIsAnnouncing(false);
        });
      }, 800); // Jeda 800ms
    });
  };

  // Eksekusi Pemanggilan Item Antrian
  const handleCallItem = (item: QueueItem) => {
    const updated = queueList.map((q) => {
      if (q.status === "calling") {
        return { ...q, status: "called" as const };
      }
      if (q.id === item.id) {
        return {
          ...q,
          status: "calling" as const,
          calledLoket: currentLoket,
          calledTime: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        };
      }
      return q;
    });

    setQueueList(updated);

    // Daftarkan ke histori papan panggil (maksimal 6 unit teratas disimpan)
    const logTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const newHist: CallHistoryItem = {
      no_antrian: item.no_antrian,
      nama: item.nama,
      loket: currentLoket,
      time: logTime.substring(0, 5),
    };

    setHistoryList((prev) => [newHist, ...prev.slice(0, 5)]);
    triggerTtsAnnouncement(item, currentLoket);
  };

  // Fitur "PANGGIL BERIKUTNYA"
  const handleCallNextQueue = () => {
    // Ambil baris STATUS="wait" (MENUNGGU) pertama
    const nextItem = queueList.find((q) => q.status === "wait");
    if (!nextItem) {
      alert("Tidak ada antrian berikutnya yang berstatus 'MENUNGGU'.");
      return;
    }
    handleCallItem(nextItem);
  };

  // Memaksa status menjadi SELESAI
  const handleMarkItemAsDone = (item: QueueItem) => {
    const updated = queueList.map((q) => {
      if (q.id === item.id) {
        return { ...q, status: "done" as const };
      }
      return q;
    });
    setQueueList(updated);
  };

  // Memaksa status menjadi DILEWATI
  const handleSkipItem = (item: QueueItem) => {
    const updated = queueList.map((q) => {
      if (q.id === item.id) {
        return { ...q, status: "skip" as const };
      }
      return q;
    });
    setQueueList(updated);
  };

  // Re-Antrikan Item Kembali ke Status MENUNGGU
  const handleRequeueItem = (item: QueueItem) => {
    const updated = queueList.map((q) => {
      if (q.id === item.id) {
        return { ...q, status: "wait" as const, calledLoket: undefined, calledTime: undefined };
      }
      return q;
    });
    setQueueList(updated);
  };

  // Tes Pengeras Suara Manual
  const handleTestTtsSound = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance("Tes koneksi suara aktif. Pengeras suara siap dipergunakan.");
    utter.lang = "id-ID";
    utter.rate = 0.88;
    window.speechSynthesis.speak(utter);
  };

  // Statistik Perhitungan
  const statTotal = queueList.length;
  const statWait = queueList.filter((q) => q.status === "wait").length;
  const statCalling = queueList.filter((q) => q.status === "calling" || q.id === queueList.find(x => x.status === "calling")?.id).length;
  const statDone = queueList.filter((q) => q.status === "done").length;

  const currentCallingItem = queueList.find((item) => item.status === "calling");
  const displayWaitNext = queueList.filter((q) => q.status === "wait").slice(0, 4);

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] font-sans text-slate-800 antialiased">
      
      {/* HEADER UTAMA APLIKASI */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="bg-white p-1 rounded-xl shadow-xs border border-slate-100/80 flex items-center justify-center shrink-0">
              <img 
                src="https://res.cloudinary.com/maswardi/image/upload/v1772681855/magetan_u0plbg.png" 
                alt="Logo Magetan" 
                className="w-10 h-11 object-contain" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                {instansiName}
                {isUsingFallback && (
                  <span className="text-[10px] bg-amber-150 text-amber-800 border border-amber-200/50 rounded-full px-2 py-0.5 font-bold uppercase tracking-wide">
                    Mode Fallback Offline (Demo)
                  </span>
                )}
              </h1>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#534AB7]">{subHeader}</p>
            </div>
          </div>

          {/* Navigation Tabs (3 Dedicated Tab Murni Sesuai Spesifikasi) */}
          <nav className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 gap-1 shrink-0">
            <button
              onClick={() => setActiveTab("operator")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "operator"
                  ? "bg-white text-[#534AB7] shadow-sm font-black border border-slate-250/20"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Users className="w-4 h-4" />
              Panel Operator
            </button>
            <button
              onClick={() => setActiveTab("display")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "display"
                  ? "bg-white text-[#534AB7] shadow-sm font-black border border-slate-250/20"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Tv className="w-4 h-4" />
              Display Publik
            </button>
            <button
              onClick={() => setActiveTab("info")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 relative ${
                activeTab === "info"
                  ? "bg-white text-[#534AB7] shadow-sm font-black border border-slate-250/20"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Database className="w-4 h-4" />
              Info Sistem

            </button>
          </nav>

          {/* Digital Clock Header & Sync Status */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-[9px] block text-slate-400 font-bold uppercase tracking-wider leading-none">Sinkronisasi terakhir</span>
              <span className="text-[11px] font-mono font-bold text-[#534AB7]">
                {lastFetchTime ? lastFetchTime : "Sedang antre..."}
              </span>
            </div>
            
            <div className="bg-[#534AB7]/5 border border-[#534AB7]/10 text-[#534AB7] font-mono px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-black">
              <Clock className="w-4 h-4 animate-spin-slow" />
              {currentTime || "00:00:00"}
            </div>
          </div>
        </div>
      </header>



      {/* DYNAMIC VIEW CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        
        {/* ======================= TAB 1: PANEL OPERATOR ANTRIAN ======================= */}
        {activeTab === "operator" && (
          <div className="space-y-6">
            
            {/* KARTU KONEKTIVITAS SPREADSHEET (SANGAT SEDERHANA) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-teal-50">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl text-white ${isUsingFallback ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`}>
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Koneksi Lembar Spreadsheet</h3>
                    <p className="text-[11px] text-slate-500">
                      {isUsingFallback 
                        ? `Mode Fallback Offline (Demo) — Menampilkan data tiruan. Masukkan API Key & ID untuk menyambung data cloud.` 
                        : `Berhasil Terkoneksi dengan Cloud Google Sheet! Membaca Tab: "${customSheetName}"`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="px-4 py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#534AB7]" />
                    {showSettings ? "Sembunyikan Pengaturan" : "Ubah Spreadsheet ID / API Key"}
                  </button>
                  <button
                    onClick={fetchDataFromSheets}
                    disabled={isFetching}
                    className="px-4 py-2 bg-[#534AB7] hover:bg-[#433b9b] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
                    {isFetching ? "Sinkron..." : "Segarkan Data"}
                  </button>
                </div>
              </div>

              {/* TAMPILAN ERROR KONEKSI */}
              {renderConnectionErrorCard(fetchError)}

              {/* CONFIG COLLAPSIBLE FORM */}
              {showSettings && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-150 animate-fadeIn text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-extrabold uppercase mb-1 tracking-wider">GOOGLE SPREADSHEET ID</label>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={customSpreadsheetId}
                      placeholder="Masukkan Spreadsheet ID..."
                      onChange={(e) => {
                        setCustomSpreadsheetId(e.target.value);
                        localStorage.setItem("VITE_SPREADSHEET_ID", e.target.value);
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-extrabold uppercase mb-1 tracking-wider">NAMA TAB SHEET (KATEGORI)</label>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={customSheetName}
                      placeholder="Contoh: ANTRIAN atau Sheet1..."
                      onChange={(e) => {
                        setCustomSheetName(e.target.value);
                        localStorage.setItem("VITE_SHEET_NAME", e.target.value);
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-extrabold uppercase mb-1 tracking-wider">GOOGLE SHEETS API KEY (REST v4)</label>
                    <input
                      type="password"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={customApiKey.includes("GANTI_DENGAN") ? "" : customApiKey}
                      placeholder="Masukkan Google API Key valid Anda..."
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomApiKey(val);
                        localStorage.setItem("VITE_GOOGLE_SHEETS_API_KEY", val);
                      }}
                    />
                  </div>

                  {/* SEKSI GOLONGAN NAMA OPERATOR LOKET (6 OPERATOR) */}
                  <div className="md:col-span-3 border-t border-slate-200/60 pt-3 mt-1">
                    <p className="font-extrabold text-[#534AB7] mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                      <span>👤</span> NAMA OPERATOR LOKET (6 OPERATOR AKTIF)
                    </p>
                    <p className="text-[11px] text-slate-400 mb-3.5 leading-relaxed">
                      Silakan sesuaikan nama operator atau nama bagian pelayanan untuk masing-masing loket. Perubahan ini otomatis mengubah drop-down pemanggil dan monitor antrian.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {operatorNames.map((opName, idx) => (
                        <div key={idx} className="space-y-1">
                          <label className="block text-[9px] text-[#534AB7] font-black uppercase tracking-wider">
                            LOKET {idx + 1}
                          </label>
                          <input
                            type="text"
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-sans font-extrabold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs shadow-sm"
                            value={opName}
                            onChange={(e) => {
                              const newOps = [...operatorNames];
                              newOps[idx] = e.target.value;
                              setOperatorNames(newOps);
                              localStorage.setItem("VITE_OPERATOR_NAMES", JSON.stringify(newOps));
                              
                              // Sinkronisasi string currentLoket jika saat ini operator sedang aktif memilih loket ini
                              if (currentLoket.startsWith(`Loket ${idx + 1} `) || currentLoket === `Loket ${idx + 1} (${operatorNames[idx]})`) {
                                setCurrentLoket(`Loket ${idx + 1} (${e.target.value})`);
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-3 flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-slate-200/60 mt-1">
                    <span>💡 <i>Sistem menyimpan kustomisasi nama operator secara langsung di browser lokal Anda.</i></span>
                    <button
                      onClick={() => {
                        setCustomSpreadsheetId(RESOLVED_SPREADSHEET_ID);
                        setCustomSheetName(RESOLVED_SHEET_NAME);
                        setCustomApiKey(RESOLVED_API_KEY);
                        const defaultOps = [
                          "Operator 1 (Pendaftaran)",
                          "Operator 2 (Sertifikasi)",
                          "Operator 3 (Kependudukan)",
                          "Operator 4 (Umum)",
                          "Operator 5 (Keuangan)",
                          "Operator 6 (Kesejahteraan)"
                        ];
                        setOperatorNames(defaultOps);
                        setCurrentLoket(`Loket 1 (${defaultOps[0]})`);
                        localStorage.removeItem("VITE_SPREADSHEET_ID");
                        localStorage.removeItem("VITE_SHEET_NAME");
                        localStorage.removeItem("VITE_GOOGLE_SHEETS_API_KEY");
                        localStorage.removeItem("VITE_OPERATOR_NAMES");
                      }}
                      className="text-[#534AB7] hover:underline font-bold transition cursor-pointer"
                    >
                      Reset Ke Setelan Bawaan Kantor Desa (Termasuk Operator)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* TOOLBAR ATAS: REFRESH MANUAL & STATUS AUDIO */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 w-full md:w-auto">
                <button
                  onClick={fetchDataFromSheets}
                  disabled={isFetching}
                  className={`bg-slate-150 hover:bg-slate-200 text-slate-700 py-2 px-3.5 rounded-xl border border-slate-200 text-xs font-bold transition flex items-center gap-1.5 ${isFetching ? "opacity-50" : ""}`}
                  title="Tekan untuk menyinkronkan data langsung dari Google Sheets"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#534AB7] ${isFetching ? "animate-spin" : ""}`} />
                  {isFetching ? "Menyegarkan..." : "Refresh Data"}
                </button>

                <div className="h-5 w-px bg-slate-200 hidden md:block"></div>

                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    {isAnnouncing && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isAnnouncing ? "bg-emerald-500" : "bg-slate-350 bg-slate-400"}`}></span>
                  </span>
                  <div className="text-xs text-slate-500 leading-tight">
                    <span className="font-bold uppercase text-[9px] text-slate-400 block tracking-wider">Audio Panggilan</span>
                    {isAnnouncing ? (
                      <span className="text-[#534AB7] font-bold">{ttsText}</span>
                    ) : (
                      <span>Siap memanggil (id-ID)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* TEST SUARA & PILIH LOKET */}
              <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
                <button
                  onClick={handleTestTtsSound}
                  className="px-3.5 py-1.5 text-[11px] font-bold bg-indigo-55 bg-indigo-50 hover:bg-indigo-100 text-[#534AB7] border border-indigo-200/50 rounded-xl transition flex items-center gap-1.5"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Uji Coba Suara
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">LOKET SEKARANG:</span>
                  <select
                    value={currentLoket}
                    onChange={(e) => setCurrentLoket(e.target.value)}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-extrabold text-[#534AB7] px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/15 transition cursor-pointer"
                  >
                    {operatorNames.map((opName, idx) => (
                      <option key={idx} value={`Loket ${idx + 1} (${opName})`}>
                        Loket {idx + 1} ({opName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SEKSI BARIS STATISTIK KARTU */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">Total Daftar</p>
                <div className="flex items-baseline justify-between mt-1">
                  <p className="text-3xl font-black text-slate-900">{statTotal}</p>
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase">Kumpulan Data</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between border-l-4 border-l-amber-500">
                <p className="text-[10px] uppercase tracking-wider text-amber-600 font-extrabold">Menunggu</p>
                <div className="flex items-baseline justify-between mt-1">
                  <p className="text-3xl font-black text-slate-900">{statWait}</p>
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full uppercase">Antre Giliran</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between border-l-4 border-l-[#534AB7]">
                <p className="text-[10px] uppercase tracking-wider text-indigo-600 font-extrabold">Dipanggil (Active)</p>
                <div className="flex items-baseline justify-between mt-1">
                  <p className="text-3xl font-black text-[#534AB7]">{statCalling}</p>
                  <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full uppercase animate-pulse">Di Loket</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between border-l-4 border-l-emerald-500">
                <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-extrabold">Selesai</p>
                <div className="flex items-baseline justify-between mt-1">
                  <p className="text-3xl font-black text-slate-900">{statDone}</p>
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">Terlayani</span>
                </div>
              </div>
            </div>

            {/* MAIN TWO-COLUMN WORKSPACE GRID */}
            <div className="grid grid-cols-12 gap-6 items-start">
              
              {/* TABLE LIST & INTERACTIVE CONTROLS (8 of 12 Col) */}
              <section className="col-span-12 lg:col-span-8 space-y-4">
                
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  
                  {/* SEARCH BAR & BUTTON PANGGIL BERIKUTNYA */}
                  <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="relative w-full sm:w-1/2">
                      <input
                        type="text"
                        placeholder="Ketik Nama, Alamat, atau Kode No Antrian..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#534AB7]/10 focus:border-indigo-400 transition"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>

                    <button
                      onClick={handleCallNextQueue}
                      className="w-full sm:w-auto bg-[#534AB7] hover:bg-[#433b9b] text-white px-5 py-2.5 rounded-xl font-extrabold text-xs tracking-wider transition-colors shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 text-white fill-current" />
                      PANGGIL BERIKUTNYA
                    </button>
                  </div>

                  {/* FILTER BAR STATUS TABULASI DATA */}
                  <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 flex flex-wrap gap-1 md:gap-1.5 text-[10px]">
                    <button
                      onClick={() => setStatusFilter("all")}
                      className={`px-3 py-1.5 rounded-lg font-black uppercase tracking-wider transition ${
                        statusFilter === "all" ? "bg-[#534AB7] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      Semua ({statTotal})
                    </button>
                    <button
                      onClick={() => setStatusFilter("wait")}
                      className={`px-3 py-1.5 rounded-lg font-black uppercase tracking-wider transition ${
                        statusFilter === "wait" ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      Menunggu ({statWait})
                    </button>
                    <button
                      onClick={() => setStatusFilter("calling")}
                      className={`px-3 py-1.5 rounded-lg font-black uppercase tracking-wider transition ${
                        statusFilter === "calling" ? "bg-indigo-100 text-indigo-800 border border-indigo-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      Dipanggil ({statCalling})
                    </button>
                    <button
                      onClick={() => setStatusFilter("done")}
                      className={`px-3 py-1.5 rounded-lg font-black uppercase tracking-wider transition ${
                        statusFilter === "done" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      Selesai ({statDone})
                    </button>
                  </div>

                  {/* TABEL CORE DATA */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-sans">
                      <thead className="bg-[#F8FAFC] text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-200">
                        <tr>
                          <th className="px-5 py-3">No. Antrian</th>
                          <th className="px-5 py-3">Nama Lengkap & Alamat</th>
                          <th className="px-5 py-3">Layanan</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3 text-right">Aksi Panggilan</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs divide-y divide-slate-100">
                        {filteredQueue.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                              <VolumeX className="w-8 h-8 text-slate-350 mx-auto mb-2" />
                              Tidak ditemukan data antrian terdaftar untuk filter ini.
                            </td>
                          </tr>
                        ) : (
                          filteredQueue.map((item) => {
                            const isCalling = item.status === "calling";
                            const isDone = item.status === "done";
                            const isSkip = item.status === "skip";
                            const isWait = item.status === "wait";
                            const isCalled = item.status === "called";

                            let rowClass = "hover:bg-slate-50/80 transition-colors ";
                            if (isCalling) {
                              rowClass = "bg-indigo-50/60 border-l-4 border-l-[#534AB7]";
                            } else if (isDone) {
                              rowClass = "opacity-55 bg-slate-50/30";
                            } else if (isSkip) {
                              rowClass = "bg-rose-50/20 text-slate-500";
                            }

                            return (
                              <tr key={item.id} className={rowClass}>
                                {/* No Antrian */}
                                <td className={`px-5 py-4 font-mono font-black text-sm tracking-wide ${isCalling ? "text-[#534AB7]" : "text-slate-800"}`}>
                                  {item.no_antrian}
                                </td>

                                {/* Nama Lengkap & Alamat */}
                                <td className="px-5 py-4">
                                  <div className="font-extrabold text-slate-900">{item.nama}</div>
                                  <div className="text-[10px] text-slate-400 font-semibold truncate max-w-[240px] mt-0.5">{item.alamat}</div>
                                </td>

                                {/* Jenis Layanan */}
                                <td className="px-5 py-4">
                                  <span className="bg-slate-100 text-slate-650 px-2.5 py-1 rounded-md text-[10px] font-bold border border-slate-205 border-slate-205">
                                    {item.layanan}
                                  </span>
                                  {item.calledLoket && (
                                    <span className="block text-[9px] text-[#534AB7] font-extrabold uppercase mt-1">
                                      Diproses di {item.calledLoket}
                                    </span>
                                  )}
                                </td>

                                {/* Status Badge */}
                                <td className="px-5 py-4">
                                  {isWait && (
                                    <span className="bg-amber-50 text-amber-700 font-bold px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wider border border-amber-100">
                                      Menunggu
                                    </span>
                                  )}
                                  {isCalling && (
                                    <span className="bg-indigo-100 text-[#534AB7] font-black px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wider border border-indigo-200 animate-pulse">
                                      Dipanggil
                                    </span>
                                  )}
                                  {isCalled && (
                                    <span className="bg-purple-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wider border border-indigo-100">
                                      Sudah Dipanggil
                                    </span>
                                  )}
                                  {isDone && (
                                    <span className="bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wider border border-emerald-100">
                                      Selesai
                                    </span>
                                  )}
                                  {isSkip && (
                                    <span className="bg-slate-100 text-slate-500 font-bold px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wider border border-slate-200">
                                      Dilewati
                                    </span>
                                  )}
                                </td>

                                {/* Aksi Buttons */}
                                <td className="px-5 py-4 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    {(isWait || isCalled || isSkip) && (
                                      <>
                                        <button
                                          onClick={() => handleCallItem(item)}
                                          className="px-2.5 py-1 bg-[#534AB7] hover:bg-[#433b9b] text-white rounded-lg font-black text-[10px] transition"
                                        >
                                          Panggil
                                        </button>
                                        <button
                                          onClick={() => handleSkipItem(item)}
                                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg font-bold text-[10px] transition"
                                        >
                                          Lewati
                                        </button>
                                      </>
                                    )}

                                    {isCalling && (
                                      <>
                                        <button
                                          onClick={() => handleMarkItemAsDone(item)}
                                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-[10px] flex items-center gap-0.5 transition shadow-sm"
                                        >
                                          <Check className="w-3 h-3" />
                                          Selesai
                                        </button>
                                        <button
                                          onClick={() => handleCallItem(item)}
                                          className="px-2.5 py-1 bg-[#534AB7]/10 text-[#534AB7] hover:bg-[#534AB7]/20 rounded-lg font-black text-[10px] transition"
                                        >
                                          Ulangi
                                        </button>
                                      </>
                                    )}

                                    {isDone && (
                                      <button
                                        onClick={() => handleRequeueItem(item)}
                                        className="px-2.5 py-1 bg-slate-150 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[10px] transition"
                                      >
                                        Antrikan Lagi
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* NOTE SINKRONISASI */}
                <p className="text-[10px] text-slate-400 italic">
                  * Seluruh manipulasi status (panggil, selesaikan, lewati) tersimpan aman di memory utama JavaScript. Status asal pendaftaran tetap dilisensikan murni dari Google Sheets read-only.
                </p>
              </section>

              {/* SEDANG DIPANGGIL TV BOX (RIGHT PANEL - 4 of 12 Col) */}
              <aside className="col-span-12 lg:col-span-4 space-y-6">
                
                {/* WIDGET KOTAK UTAMA: SEDANG DIPANGGIL */}
                <div className="bg-[#534AB7] rounded-3xl p-6 text-white shadow-xl text-center relative overflow-hidden border border-[#443cb0]">
                  <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/5 rounded-full blur-2xl"></div>
                  
                  <span className="text-[10px] font-black tracking-widest bg-white/10 px-3 py-1 rounded-full uppercase">
                    SESTION AKTIF: {currentLoket.toUpperCase()}
                  </span>

                  <div className="py-6 space-y-3">
                    {currentCallingItem ? (
                      <>
                        <p className="text-[11px] font-bold text-indigo-200 tracking-wider uppercase leading-none">NOMOR ANTRIAN</p>
                        <h3 className="text-7xl font-sans font-black text-amber-300 tracking-wider font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)] leading-none my-2">
                          {currentCallingItem.no_antrian}
                        </h3>
                        <p className="text-base font-extrabold text-white tracking-tight leading-tight uppercase truncate">{currentCallingItem.nama}</p>
                        <p className="text-[10px] text-indigo-150 font-medium truncate opacity-85">{currentCallingItem.alamat}</p>
                        
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                          <span className="inline-block bg-white/15 px-3 py-1 rounded text-[10px] font-bold text-indigo-100 uppercase tracking-wide">
                            Layanan: {currentCallingItem.layanan}
                          </span>
                          
                          <button
                            onClick={() => triggerTtsAnnouncement(currentCallingItem, currentCallingItem.calledLoket || currentLoket)}
                            className="w-full py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transform active:scale-95 transition flex items-center justify-center gap-1.5"
                          >
                            <Volume2 className="w-4 h-4" />
                            PANGGIL ULANG SUARA
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="py-10 space-y-3">
                        <VolumeX className="w-12 h-12 text-indigo-300/40 mx-auto" />
                        <h4 className="font-extrabold text-sm text-indigo-100 uppercase tracking-wider">Belum Ada Panggilan</h4>
                        <p className="text-xs text-indigo-200/70 max-w-[200px] mx-auto text-center leading-relaxed">
                          Tidak ada antrian yang disorot saat ini untuk {currentLoket}. Klik &quot;Panggil&quot; di tombol tabel.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIWAYAT PANGGILA HARIAN (6 Terakhir) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#534AB7] border-b border-slate-100 pb-3 mb-4">
                    Riwayat 6 Panggilan Terakhir
                  </h4>

                  <div className="space-y-3">
                    {historyList.length === 0 ? (
                      <p className="text-slate-400 text-xs italic text-center py-6">Belum ada riwayat panggil harian.</p>
                    ) : (
                      historyList.slice(0, 6).map((log, index) => (
                        <div key={index} className="flex items-center justify-between border-b border-slate-50 pb-2.5 text-xs last:border-0 last:pb-0">
                          <div>
                            <span className="font-mono text-xs font-black text-slate-800 tracking-wider">{log.no_antrian}</span>
                            <p className="text-[10px] text-slate-400 font-semibold truncate w-32 md:w-44">{log.nama}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-[#534AB7] px-2 py-0.5 rounded-full font-black uppercase tracking-tight inline-block mb-1">
                              {log.loket}
                            </span>
                            <span className="block text-[8px] font-mono text-slate-400 font-bold">{log.time}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </aside>

            </div>

          </div>
        )}

        {/* ======================= TAB 2: DISPLAY PUBLIK ======================= */}
        {activeTab === "display" && (
          <div className="space-y-6">
            
            {/* TV LAYOUT CANVAS MONITOR PUBLIK */}
            <div className="bg-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-850 flex flex-col min-h-[580px] justify-between">
              
              {/* DISPLAY HEADER */}
              <div className="bg-slate-950 px-6 py-5 border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-lg border border-indigo-100/10 p-1.5 shrink-0">
                    <img 
                      src="https://res.cloudinary.com/maswardi/image/upload/v1772681855/magetan_u0plbg.png" 
                      alt="Logo Magetan" 
                      className="w-11 h-12 object-contain" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-black tracking-wide text-white uppercase">{instansiName}</h2>
                    <p className="text-[10px] font-extrabold text-[#aec3ff] tracking-widest uppercase">{subHeader}</p>
                  </div>
                </div>

                {/* Real-time Jam Digital Besar */}
                <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-center font-mono">
                  <span className="text-[9px] block text-indigo-300 font-extrabold uppercase tracking-widest leading-none mb-1">WAKTU SEKARANG</span>
                  <span className="text-base text-emerald-400 font-black tracking-wider">{currentTime || "00:00:00"}</span>
                </div>
              </div>

              {/* MAIN CONTENT GRID TV SCREEN */}
              <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
                
                {/* UTAMA (3 KOLOM): KOTAK SEDANG DIPANGGIL KHARISMATIK UNGU */}
                <div className="lg:col-span-3 bg-gradient-to-br from-[#534AB7] to-[#393193] rounded-2xl p-6 md:p-8 border border-indigo-400/10 flex flex-col justify-between shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-2xl -mr-20 -mt-20 pointer-events-none"></div>

                  <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
                    <span className="text-xs md:text-sm font-extrabold tracking-widest text-[#aec3ff] uppercase flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-amber-300 animate-bounce" />
                      Pekerjaan Panggilan Aktif
                    </span>

                    {isAnnouncing && (
                      <span className="bg-emerald-500 text-white text-[9px] font-black tracking-wider px-3 py-1 rounded-full animate-pulse border border-emerald-400 uppercase">
                        SUARA MEMANGGIL
                      </span>
                    )}
                  </div>

                  {currentCallingItem ? (
                    <div className="text-center py-8 md:py-10 space-y-4 relative z-10">
                      <p className="text-indigo-200 text-xs font-black tracking-widest uppercase mb-1">NOMOR ANTRIAN</p>
                      
                      {/* GIGANTIC NOMOR */}
                      <span className="text-8xl md:text-[8rem] font-sans font-black text-amber-300 tracking-wide font-mono leading-none block drop-shadow-lg">
                        {currentCallingItem.no_antrian}
                      </span>

                      <div className="space-y-1">
                        <h4 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">{currentCallingItem.nama}</h4>
                        <p className="text-xs text-indigo-150 font-bold opacity-80 leading-relaxed truncate max-w-sm md:max-w-md mx-auto">
                          {currentCallingItem.alamat} • <span className="italic text-amber-250 font-normal">&quot;Layanan {currentCallingItem.layanan}&quot;</span>
                        </p>
                      </div>

                      <div className="mt-6 inline-block bg-white text-slate-900 border-2 border-amber-300 shadow-xl rounded-2xl px-6 py-3 font-black text-sm md:text-lg tracking-widest uppercase">
                        SILAKAN MENUJU: <span className="text-[#534AB7] font-sans font-black underline">{currentCallingItem.calledLoket || currentLoket}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 space-y-4 relative z-10">
                      <VolumeX className="w-16 h-16 text-indigo-305 text-indigo-300/30 mx-auto" />
                      <h3 className="text-lg font-black text-indigo-100 uppercase tracking-widest">MENUNGGU PANGGILAN ANTRIAN</h3>
                      <p className="text-xs text-indigo-200/50 max-w-xs mx-auto leading-relaxed">
                        Belum ada nomor pendaftaran yang diarahkan ke loket. Silakan ambil tiket pendaftaran dan antre dengan tertib.
                      </p>
                    </div>
                  )}

                  <div className="border-t border-white/10 pt-4 flex justify-between items-center text-[10px] font-black text-indigo-200 uppercase tracking-widest relative z-10">
                    <span>* Harap membawa berkas kependudukan pendukung</span>
                    <span>BAHASA INDONESIA id-ID</span>
                  </div>
                </div>

                {/* SAMPING (2 KOLOM): DAFTAR 4 ANTRIAN BERIKUTNYA */}
                <div className="lg:col-span-2 bg-slate-950/40 rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
                      <Users className="w-4 h-4 text-[#534AB7]" />
                      Antrian Mendatang
                    </h3>

                    <div className="space-y-2.5">
                      {displayWaitNext.length === 0 ? (
                        <div className="py-20 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-3">
                          <CheckCircle className="w-8 h-8 text-slate-700" />
                          <p className="font-semibold select-none leading-relaxed">Seluruh nomor antrian telah rampung diolah.</p>
                        </div>
                      ) : (
                        displayWaitNext.map((item, index) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3.5 bg-slate-900 rounded-xl border border-slate-800 hover:border-indigo-500/10 transition-all font-sans"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-base font-black text-amber-300 bg-[#534AB7]/20 border border-indigo-500/10 px-2.5 py-1 rounded-lg tracking-wider">
                                {item.no_antrian}
                              </span>
                              <div>
                                <span className="block text-xs font-extrabold text-white uppercase truncate w-24 md:w-32">{item.nama}</span>
                                <span className="block text-[9px] text-slate-500 font-bold uppercase truncate tracking-wide mt-0.5">{item.layanan}</span>
                              </div>
                            </div>
                            <span className="text-[8px] bg-slate-850 text-indigo-300 font-extrabold border border-indigo-950 px-2 py-1 rounded-md uppercase">
                              ANTRE KE-{index + 1}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-[#534AB7]/10 rounded-xl p-3 text-[10px] text-indigo-200 border border-indigo-500/10 text-center leading-relaxed">
                    <span className="font-extrabold text-white block mb-0.5">MAKLUMAT PELAYANAN:</span>
                    Budayakan tertib antre bagi ketenteraman bersama warga Dusun Poncol-Madiun.
                  </div>
                </div>

              </div>

              {/* TICKER RUNNING TEXT */}
              <footer className="bg-[#534AB7] h-10 flex items-center overflow-hidden">
                <span className="w-32 bg-[#443cb0] h-full flex items-center justify-center text-[10px] font-black text-white px-4 border-r border-white/5 select-none tracking-widest uppercase font-mono">
                  PENGUMUMAN
                </span>
                <div className="flex-1 px-4 text-xs font-bold text-indigo-100 whitespace-nowrap overflow-hidden relative">
                  <style>{`
                    @keyframes t_marquees_2026 {
                      0% { transform: translateX(100%); }
                      100% { transform: translateX(-100%); }
                    }
                    .t-marquee-cl {
                      display: inline-block;
                      white-space: nowrap;
                      animation: t_marquees_2026 25s linear infinite;
                    }
                  `}</style>
                  <div className="t-marquee-cl">
                    Selamat datang di Unit Pelayanan Publik Digital Terpadu {instansiName}. Silakan ambil nomor antrian Anda. • Pastikan dokumen persyaratan seperti Kartu Keluarga, KTP, dan surat keterangan telah lengkap sebelum menuju loket petugas. • Pelayanan terbuka untuk seluruh warga tanpa pungutan biaya (GRATIS). • Budayakan tertib antre bagi kenyamanan bersama. Terima kasih atas pengertian Anda.
                  </div>
                </div>
              </footer>

            </div>

          </div>
        )}

        {/* ======================= TAB 3: INFO SISTEM ======================= */}
        {activeTab === "info" && (
          <div className="space-y-6">
            
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="bg-[#534AB7]/10 p-3 rounded-2xl text-[#534AB7] border border-indigo-100 shadow-inner">
                  <Database className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Koneksi & Integrasi Google Sheets</h2>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                    Aplikasi ini dirancang terhubung langsung ke basis data Google Sheets menggunakan REST API (Read-only) untuk sinkronisasi harian dengan platform Apps Script.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={handleTestConnection}
                  className="px-5 py-2.5 bg-[#534AB7] hover:bg-[#433b9b] text-white rounded-xl text-xs font-extrabold tracking-wider transition shadow-md"
                >
                  TEST KONEKSI (PING)
                </button>
                <button
                  onClick={fetchDataFromSheets}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-650 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Paksa Sync
                </button>
              </div>
            </div>

            {/* STATUS PARAMETER GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* KOLOM KIRI: PARAMETER DETAIL KONEKSI */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#534AB7]" />
                  Parameter Konfigurasi
                </h3>

                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider mb-0.5">SYSTEM_ID (Standard)</span>
                    <span className="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 block select-all">
                      {SYSTEM_ID}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider mb-0.5">SPREADSHEET_ID (Lembar Aktif)</span>
                    <input
                      type="text"
                      className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-450"
                      value={customSpreadsheetId}
                      onChange={(e) => {
                        setCustomSpreadsheetId(e.target.value);
                        localStorage.setItem("VITE_SPREADSHEET_ID", e.target.value);
                      }}
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider mb-0.5">SHEET_NAME (Kategori)</span>
                    <input
                      type="text"
                      className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-450"
                      value={customSheetName}
                      onChange={(e) => {
                        setCustomSheetName(e.target.value);
                        localStorage.setItem("VITE_SHEET_NAME", e.target.value);
                      }}
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider mb-0.5">GOOGLE_SHEETS_API_KEY</span>
                    <input
                      type="password"
                      placeholder="Masukkan API Key valid Anda..."
                      className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-705 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-450"
                      value={customApiKey.includes("GANTI_DENGAN") ? "" : customApiKey}
                      onChange={(e) => {
                        setCustomApiKey(e.target.value);
                        localStorage.setItem("VITE_GOOGLE_SHEETS_API_KEY", e.target.value);
                      }}
                    />
                    <p className="text-[9px] text-slate-400 mt-1 font-sans italic">
                      Ubah API Key di atas jika ingin menyinkronkan data lembar Google Sheet pribadi Anda. Data disimpan lokal di browser.
                    </p>
                  </div>
                </div>
              </div>

              {/* KOLOM TENGAH: REAL-TIME HEALTH CARD */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5 mb-4">
                    <Wifi className="w-4 h-4 text-emerald-500" />
                    Status Saluran Konektivitas
                  </h3>

                  <div className="space-y-4 text-xs font-sans">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-505 font-medium">Model Layanan:</span>
                      <span className="font-extrabold text-slate-800">REST API v4 (Read-Only)</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-505 font-medium">Beban Sinkronisasi:</span>
                      <span className="font-extrabold text-slate-800">30 Detik (Auto)</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-505 font-medium">Total Baris data Terbaca:</span>
                      <span className="font-black text-[#534AB7]">{queueList.length} Baris data</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-505 font-medium">Versi Infrastruktur Sheet:</span>
                      <span className="font-mono text-slate-700 bg-slate-100 px-1.5 rounded">v3.0.0 (REST v4)</span>
                    </div>

                    <div className="flex items-center justify-between pb-2">
                      <span className="text-slate-505 font-medium">Status Koneksi Terakhir:</span>
                      {isUsingFallback ? (
                        <span className="bg-amber-50 rounded-md py-0.5 px-2 text-amber-600 font-extrabold border border-amber-200 text-[10px] uppercase">
                          FALLBACK (OFFLINE)
                        </span>
                      ) : (
                        <span className="bg-emerald-50 rounded-md py-0.5 px-2 text-emerald-600 font-extrabold border border-emerald-200 text-[10px] uppercase">
                          TERKONEKSI (ONLINE)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {renderConnectionErrorCard(fetchError)}
              </div>

              {/* KOLOM KANAN: JENDELA LOG OUTPUT TEST */}
              <div className="bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl overflow-hidden flex flex-col h-[280px]">
                <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex justify-between items-center text-slate-400 text-[10px] font-mono select-none">
                  <span>console_ping_test.log</span>
                  <span className="text-indigo-400 font-black uppercase">SHEETS DIAGNOSTICS</span>
                </div>
                <pre className="p-4 overflow-auto text-[11px] font-mono text-emerald-400 bg-[#0F172A] flex-1 leading-relaxed selection:bg-slate-700 select-all whitespace-pre-wrap">
                  {testResult ? testResult : 'Siap melakukan pengujian... Tekan tombol "TEST KONEKSI" di atas.'}
                </pre>
              </div>

            </div>

            {/* SEKSI AKORDION: GOOGLE APPS SCRIPT BACKEND CODE */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowGasCode(!showGasCode)}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-xl text-slate-600 border border-slate-200">
                    <FileText className="w-5 h-5 text-[#534AB7]" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-extrabold text-slate-900 uppercase">Salin / Unduh Google Apps Script Backend</h4>
                    <p className="text-[11px] text-slate-400">Kode Apps Script untuk menghasilkan file Google Spreadsheet dan antrian terpadu di cloud.</p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-250 ${showGasCode ? "transform rotate-180" : ""}`} />
              </button>

              {showGasCode && (
                <div className="p-5 border-t border-slate-150 bg-slate-50/50 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-slate-500 leading-normal max-w-2xl">
                      Salin script di bawah, buka <strong>script.google.com</strong>, ganti seluruh isi kode editor di sana dengan script ini, klik simpan, lalu jalankan fungsi <code>setupInfrastruktur</code>. Menghasilkan database dan fungsi pendaftaran <code>tambahAntrian()</code> instan.
                    </p>

                    <button
                      onClick={() => {
                        const codeText = `/**
 * Setup Infrastruktur Sistem Antrian Terpadu Kantor Pemerintahan Desa Poncol.
 */
function setupInfrastruktur() {
  var KODE_INSTANSI = "PONCOL"; 
  var NAMA_INSTANSI_LENGKAP = "PEMERINTAH DESA PONCOL MADIUN"; 
  var TAHUN_SEKARANG = new Date().getFullYear();

  try {
    Logger.log("=== MEMULAI SINKRONISASI & INSTALASI INFRASTRUKTUR ===");

    // 1. GENERATE SYSTEM_ID UNIK
    var charPool = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    var randomPart = "";
    for (var i = 0; i < 6; i++) {
      var randIndex = Math.floor(Math.random() * charPool.length);
      randomPart += charPool.charAt(randIndex);
    }
    var systemId = KODE_INSTANSI + "-" + TAHUN_SEKARANG + "-" + randomPart;

    PropertiesService.getScriptProperties().setProperty("SYSTEM_ID", systemId);
    Logger.log("[PROSES 1/8] Berhasil generate SYSTEM_ID: " + systemId);

    // 2. BUAT SPREADSHEET BARU
    var dateToday = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    var fileName = "Data Antrian - " + KODE_INSTANSI + " - " + dateToday;
    var ss = SpreadsheetApp.create(fileName);
    var ssId = ss.getId();
    var ssUrl = ss.getUrl();
    PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", ssId);
    Logger.log("[PROSES 2/8] Berhasil membuat Spreadsheet baru: '" + fileName + "'");

    // 3. SELESAIKAN SHEET "ANTRIAN"
    var sheetAntrian = ss.getSheets()[0];
    sheetAntrian.setName("ANTRIAN");

    var headersAntrian = [
      "NO_ANTRIAN", 
      "NAMA_LENGKAP", 
      "ALAMAT", 
      "JENIS_LAYANAN", 
      "NO_HP", 
      "STATUS", 
      "LOKET", 
      "WAKTU_DAFTAR", 
      "WAKTU_DIPANGGIL", 
      "KETERANGAN"
    ];
    sheetAntrian.appendRow(headersAntrian);

    var headerRangeAntrian = sheetAntrian.getRange("A1:J1");
    headerRangeAntrian.setFontWeight("bold");
    headerRangeAntrian.setBackground("#1a237e");
    headerRangeAntrian.setFontColor("#ffffff");
    sheetAntrian.setFrozenRows(1);

    Logger.log("[PROSES 3/8] Berhasil mengonfigurasi dan memformat Sheet 'ANTRIAN'");

    // 4. BUAT SHEET "KONFIGURASI"
    var sheetKonfigurasi = ss.insertSheet("KONFIGURASI");
    var dataKonfigurasi = [
      ["SYSTEM_ID", systemId],
      ["NAMA_INSTANSI", NAMA_INSTANSI_LENGKAP],
      ["SPREADSHEET_ID", ssId],
      ["TANGGAL_DIBUAT", dateToday],
      ["VERSI", "1.0.0"],
      ["STATUS", "AKTIF"]
    ];
    
    for (var j = 0; j < dataKonfigurasi.length; j++) {
      sheetKonfigurasi.appendRow(dataKonfigurasi[j]);
    }
    sheetKonfigurasi.getRange("A1:A6").setFontWeight("bold");
    sheetKonfigurasi.getRange("A1:A6").setBackground("#f0f4c3");
    Logger.log("[PROSES 4/8] Berhasil membuat dan mengisi Sheet 'KONFIGURASI'");

    return {
      systemId: systemId,
      spreadsheetId: ssId,
      url: ssUrl,
      fileName: fileName
    };
  } catch (error) {
    Logger.log("Pesan Kesalahan: " + error.toString());
  }
}

/**
 * Menambahkan data antrian baru ke sheet ANTRIAN secara otomatis
 * menghasilkan nomor antrian berdasar kategori pelayanan.
 */
function tambahAntrian(namaLengkap, alamat, jenisLayanan, noHp) {
  var systemId = PropertiesService.getScriptProperties().getProperty("SYSTEM_ID") || "SYSTEM_ID_BELUM_DIATUR";
  var spreadsheetId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  
  var ss = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("Spreadsheet tidak ditemukan.");
  
  var sheet = ss.getSheetByName("ANTRIAN");
  if (!sheet) throw new Error("Sheet ANTRIAN tidak ditemukan.");
  
  var prefix = "E";
  var layananClean = (jenisLayanan || "").toString().trim().toUpperCase();
  if (layananClean === "KTP" || layananClean.indexOf("KTP") !== -1) {
    prefix = "A";
  } else if (layananClean === "SKCK" || layananClean.indexOf("SKCK") !== -1) {
    prefix = "B";
  } else if (layananClean === "AKTE LAHIR" || layananClean.indexOf("AKTE") !== -1 || layananClean.indexOf("LAHIR") !== -1) {
    prefix = "C";
  } else if (layananClean === "IZIN USAHA" || layananClean.indexOf("IZIN") !== -1 || layananClean.indexOf("USAHA") !== -1) {
    prefix = "D";
  }
  
  var lastRow = sheet.getLastRow();
  var count = 0;
  if (lastRow > 1) {
    var values = sheet.getRange("A2:A" + lastRow).getValues();
    for (var i = 0; i < values.length; i++) {
      var cellValue = (values[i][0] || "").toString().trim();
      if (cellValue.charAt(0).toUpperCase() === prefix) count++;
    }
  }
  
  var nextNum = count + 1;
  var noUrutStr = ("000" + nextNum).slice(-3);
  var noAntrian = prefix + noUrutStr;
  var waktuDaftar = Utilities.formatDate(new Date(), "GMT+7", "HH:mm");
  
  sheet.appendRow([
    noAntrian,
    namaLengkap || "",
    alamat || "",
    jenisLayanan || "",
    noHp || "",
    "MENUNGGU",
    "-",
    waktuDaftar,
    "-",
    "Terdaftar via Apps Script (" + systemId + ")"
  ]);
  
  return noAntrian;
}

function testTambah() {
  var hasil = tambahAntrian("Siti Aminah", "Jl. Diponegoro No.12 Madiun", "KTP", "08123456789");
  Logger.log("Nomor antrian baru: " + hasil);
}`;
                        navigator.clipboard.writeText(codeText);
                        setGasCopied(true);
                        setTimeout(() => setGasCopied(false), 2000);
                      }}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border shrink-0 ${
                        gasCopied
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-[#534AB7] hover:bg-[#433b9b] border-transparent text-white"
                      }`}
                    >
                      {gasCopied ? "TERSALIN " : "SALIN JASA BACKEND CODE"}
                    </button>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-inner max-h-60 overflow-y-auto">
                    <pre className="p-4 text-[10px] font-mono text-emerald-400 bg-[#0F172A] leading-relaxed">
{`function tambahAntrian(namaLengkap, alamat, jenisLayanan, noHp) {
  // Menghitung urutan otomatis berdasar prefix layanan
  // Menambahkan data baris baru ke sheet ANTRIAN
  // Mengembalikan nomor antrian yang dibentuk
}`}
                    </pre>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* FOOTER INSTANSI */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs mt-auto">
        <p className="font-extrabold tracking-wide text-slate-500 uppercase text-[10px]">
          &copy; 2026 {instansiName} — DIREKTORAT PELAYANAN DESA DIGITAL REPUBLIK INDONESIA
        </p>
        <p className="text-slate-400 font-mono text-[9px] mt-0.5 uppercase tracking-widest leading-none">
          Kewenangan Sistem Terpadu • Berstandarkan Standar Pelayanan Minimal v3.0.0
        </p>
      </footer>

    </div>
  );
}
