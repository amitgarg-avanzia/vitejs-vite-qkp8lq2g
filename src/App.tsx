import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  deleteDoc, 
  updateDoc,
  doc, 
} from 'firebase/firestore';
import { 
  Plus, 
  Trash2, 
  FileText, 
  Download, 
  PieChart, 
  Settings, 
  Check, 
  UploadCloud,
  Briefcase,
  File,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Table,
  XCircle,
  Pencil,
  Calendar
} from 'lucide-react';

/**
 * AVANZIA GLOBAL - EXPENSE TRACKER
 * VERSION: Production v1.12 (Mobile PDF Crash Fix)
 */

// --- 1. CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDHxgB2sQWOEZGsGMGjzUg8Hw_S5e3JoiM",
  authDomain: "avanzia-tracker.firebaseapp.com",
  projectId: "avanzia-tracker",
  storageBucket: "avanzia-tracker.firebasestorage.app",
  messagingSenderId: "718222076644",
  appId: "1:718222076644:web:27527ca0797ce108979af1",
  measurementId: "G-NNLWMJK9ND"
};

const appId = 'avanzia-tracker'; 

const PARTNERS = ["Amit Garg", "Amit Chopra", "Rajeev Beotra", "Vivek Khanna"];
const INITIAL_CLIENTS = ["Way2News", "Sony", "Genus", "Kimbal", "HT", "Rapid Engineering"];
const EXPENSE_HEADS = [
  "Travel - Air Fare/Train", "Travel - Cab", "Lodging - Hotel Stay", 
  "Boarding - Food Expenses", "Entertainment Expenses", "Local Travel - Cab/Other",
  "Internet and Mobile expenses", "Misc Expenses", "Subscription Charges", 
  "Capex Expenditure", "Professional Services"
];
const CATEGORIES = [
  { id: "billable", label: "Client Related - Billable" },
  { id: "non_billable", label: "Client Related - Non-billable" },
  { id: "company_general", label: "Company General Account" },
  { id: "bd_partner", label: "Business Development - Partner Account" },
  { id: "capex_partner", label: "Capex - Partner Account" },
  { id: "capex_general", label: "Capex - Company General Account" }
];
const PAYMENT_MODES = ["Paid by Company Credit Card", "Paid by Company Bank Account", "Paid by Self / Partner"];

// --- 2. INITIALIZATION ---
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase Init Error:", error);
}

// --- 3. HELPERS ---

const useTailwindLoader = () => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.tailwind) { setReady(true); return; }
    const existingScript = document.querySelector('script[src="https://cdn.tailwindcss.com"]');
    const checkTailwind = () => { if (window.tailwind) { setReady(true); return true; } return false; };
    if (existingScript) {
      const interval = setInterval(() => { if (checkTailwind()) clearInterval(interval); }, 100);
      return () => clearInterval(interval);
    }
    const script = document.createElement('script');
    script.src = "https://cdn.tailwindcss.com";
    script.async = true;
    script.onload = () => { const interval = setInterval(() => { if (checkTailwind()) clearInterval(interval); }, 50); };
    document.head.appendChild(script);
  }, []);
  return ready;
};

const useExternalScripts = () => {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const scripts = [
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.29/jspdf.plugin.autotable.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
      "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"
    ];
    let loadedCount = 0;
    const checkAllLoaded = () => { loadedCount++; if (loadedCount === scripts.length) setLoaded(true); };
    scripts.forEach(src => {
      if (!document.querySelector(`script[src="${src}"]`)) {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = checkAllLoaded;
        document.body.appendChild(script);
      } else { checkAllLoaded(); }
    });
  }, []);
  return loaded;
};

// NEW HELPER: Robust Base64 to ArrayBuffer converter
// This avoids using 'fetch' on data URLs which crashes mobile browsers
const base64ToUint8Array = (base64) => {
  const raw = window.atob(base64.split(',')[1]);
  const rawLength = raw.length;
  const array = new Uint8Array(new ArrayBuffer(rawLength));
  for (let i = 0; i < rawLength; i++) {
    array[i] = raw.charCodeAt(i);
  }
  return array;
};

const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Max 1600px for legibility
        const MAX_DIMENSION = 1600; 
        if (width > height) {
            if (width > MAX_DIMENSION) {
                height *= MAX_DIMENSION / width;
                width = MAX_DIMENSION;
            }
        } else {
            if (height > MAX_DIMENSION) {
                width *= MAX_DIMENSION / height;
                height = MAX_DIMENSION;
            }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = "#FFFFFF"; 
        ctx.fillRect(0, 0, width, height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        let quality = 0.8;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        // Limit to ~850KB
        while (dataUrl.length > 850000 && quality > 0.2) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};

// --- 4. COMPONENTS ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const baseStyle = "px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2 shadow-sm";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:bg-gray-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50"
  };
  return <button type="button" onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`} disabled={disabled}>{children}</button>;
};

const ReportsView = ({ expenses, clients, generatePDF, generateExcel }) => {
  const [filterType, setFilterType] = useState('client');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const reportOptions = [
      { id: 'client', label: 'Client Invoice (Billable Only)' },
      { id: 'client_non_billable', label: 'Client Non-Billable Summary' },
      { id: 'client_master', label: 'Client Master (All Expenses)' },
      { id: 'partner', label: 'Partner Reimbursement (Paid by Self)' },
      { id: 'partner_master', label: 'Partner Master (All Expenses)' },
      { id: 'avanzia_general', label: 'Avanzia General Account (Consolidated)' },
      { id: 'monthly_master', label: 'Monthly Master Report (All)' },
  ];

  // Filtering Logic
  const reportData = expenses.filter(item => {
      if (!item.date.startsWith(selectedMonth)) return false;

      const safeCategory = item.category || '';
      const safePaymentMode = item.paymentMode || '';

      switch (filterType) {
          case 'client':
              if (safeCategory !== 'billable') return false;
              return item.client === selectedEntity;
          case 'client_non_billable':
              if (safeCategory !== 'non_billable') return false;
              if (selectedEntity && selectedEntity !== 'All') return item.client === selectedEntity;
              return true;
          case 'client_master':
              return item.client === selectedEntity;
          case 'partner':
              if (!safePaymentMode.includes("Self")) return false;
              return item.partner === selectedEntity;
          case 'partner_master':
              return item.partner === selectedEntity;
          case 'avanzia_general':
              const generalCategories = ['company_general', 'capex_general', 'non_billable'];
              return generalCategories.includes(safeCategory);
          case 'monthly_master':
              return true;
          default:
              return false;
      }
  });

  const totalVal = reportData.reduce((acc, curr) => acc + curr.amount, 0);

  // Subtotal Calculations for UI
  let subtotals = null;
  if (filterType === 'partner_master') {
      const self = reportData.filter(i => (i.paymentMode || '').includes('Self')).reduce((a, c) => a + c.amount, 0);
      const company = totalVal - self;
      subtotals = { 'Paid by Partner (Self)': self, 'Paid by Company': company };
  } else if (filterType === 'client_master') {
      const billable = reportData.filter(i => i.category === 'billable').reduce((a, c) => a + c.amount, 0);
      const nonBillable = totalVal - billable;
      subtotals = { 'Billable': billable, 'Non-Billable': nonBillable };
  }

  return (
      <div className="space-y-8">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" /> Report Generator
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Month</label>
                      <input 
                        type="month" 
                        className="w-full border p-2 rounded-md bg-white"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                      />
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                      <select className="w-full border p-2 rounded-md bg-white" value={filterType} onChange={(e) => {setFilterType(e.target.value); setSelectedEntity('');}}>
                          {reportOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                      </select>
                  </div>

                  {(filterType.includes('client') || filterType.includes('partner')) && (
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                              Select {filterType.includes('client') ? 'Client' : 'Partner'}
                          </label>
                          <select className="w-full border p-2 rounded-md bg-white" value={selectedEntity} onChange={(e) => setSelectedEntity(e.target.value)}>
                              <option value="">-- Select --</option>
                              {filterType.includes('client') 
                                  ? clients.map(c => <option key={c} value={c}>{c}</option>)
                                  : PARTNERS.map(p => <option key={p} value={p}>{p}</option>)
                              }
                          </select>
                      </div>
                  )}
              </div>

              <div className="bg-gray-100 p-4 rounded-md mb-6 border">
                  <div className="flex justify-between items-center">
                      <div>
                          <span className="text-xs text-gray-500 uppercase font-bold block">Selected Report Scope</span>
                          <span className="text-sm text-gray-700">{reportOptions.find(r => r.id === filterType)?.label} - {selectedMonth}</span>
                      </div>
                      <div className="text-right">
                          <span className="text-xs text-gray-500 uppercase font-bold block">Grand Total</span>
                          <span className="text-xl font-bold text-gray-800">{formatCurrency(totalVal)}</span>
                      </div>
                  </div>
                  {subtotals && (
                      <div className="mt-4 pt-3 border-t border-gray-200 grid grid-cols-2 gap-4">
                          {Object.entries(subtotals).map(([label, val]) => (
                              <div key={label} className="text-right">
                                  <span className="text-xs text-gray-500 uppercase font-bold block">{label}</span>
                                  <span className="text-sm font-semibold text-blue-700">{formatCurrency(val)}</span>
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              <div className="flex gap-4">
                  <Button variant="primary" disabled={reportData.length === 0} onClick={() => generatePDF(reportData, `${filterType.toUpperCase()} Report - ${selectedMonth}`)}>
                      <Download className="w-4 h-4" /> Download PDF
                  </Button>
                  <Button variant="secondary" disabled={reportData.length === 0} onClick={() => generateExcel(reportData, `Report_${filterType}_${selectedMonth}`)}>
                      <FileText className="w-4 h-4" /> Export Excel
                  </Button>
              </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Table className="w-5 h-5 text-gray-600" /> Preview: Report Data ({reportData.length} items)
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 font-medium text-gray-600">Date</th>
                            <th className="px-4 py-3 font-medium text-gray-600">Partner</th>
                            <th className="px-4 py-3 font-medium text-gray-600">Client</th>
                            <th className="px-4 py-3 font-medium text-gray-600">Head</th>
                            <th className="px-4 py-3 font-medium text-gray-600">Description</th>
                            <th className="px-4 py-3 font-medium text-gray-600 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {reportData.length === 0 ? (
                            <tr><td colSpan="6" className="p-8 text-center text-gray-500">No records match current filters.</td></tr>
                        ) : (
                            reportData.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">{item.date}</td>
                                    <td className="px-4 py-3">{item.partner}</td>
                                    <td className="px-4 py-3">{item.client || '-'}</td>
                                    <td className="px-4 py-3">{item.head}</td>
                                    <td className="px-4 py-3 truncate max-w-xs">{item.description}</td>
                                    <td className="px-4 py-3 text-right font-mono font-medium">{formatCurrency(item.amount)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
              </div>
          </div>
      </div>
  );
};

const AdminView = ({ clients, expenses, handleAddClient, handleDelete, generateExcel, onEdit }) => {
  const [newClient, setNewClient] = useState("");
  return (
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-600" /> System Configuration
          </h2>
          <div className="mb-8">
              <h3 className="font-semibold text-gray-700 mb-3">Client Management</h3>
              <div className="flex gap-2 mb-4">
                  <input type="text" placeholder="New Client Name" className="flex-1 border p-2 rounded-md bg-white" value={newClient} onChange={(e) => setNewClient(e.target.value)} />
                  <Button onClick={() => {handleAddClient(newClient); setNewClient("");}}>Add Client</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                  {clients.map(c => <span key={c} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm border border-blue-100">{c}</span>)}
              </div>
          </div>
          <div>
              <h3 className="font-semibold text-gray-700 mb-3">All Expense Records (Master List)</h3>
              <div className="border rounded-md overflow-hidden max-h-96 overflow-y-auto">
                  <table className="min-w-full text-xs">
                      <thead className="bg-gray-100 sticky top-0">
                          <tr><th className="p-2 text-left">Date</th><th className="p-2 text-left">Client</th><th className="p-2 text-right">Amount</th><th className="p-2 text-center">Actions</th></tr>
                      </thead>
                      <tbody className="divide-y">
                          {expenses.map(exp => (
                              <tr key={exp.id} className="hover:bg-gray-50">
                                  <td className="p-2">{exp.date}</td><td className="p-2">{exp.client || 'General'}</td><td className="p-2 text-right">{formatCurrency(exp.amount)}</td>
                                  <td className="p-2 text-center flex justify-center gap-2">
                                      <button onClick={() => onEdit(exp)} className="text-blue-500 hover:text-blue-700"><Pencil className="w-4 h-4" /></button>
                                      <button onClick={() => handleDelete(exp.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
              <div className="mt-4">
                  <Button variant="outline" className="w-full" onClick={() => generateExcel(expenses, "Master_Export")}><Download className="w-4 h-4" /> Download Complete Master Data (Excel)</Button>
              </div>
          </div>
      </div>
  );
};

// --- 5. MAIN APP ---
export default function AvanziaExpenseTracker() {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [activeTab, setActiveTab] = useState('entry');
  const [expenses, setExpenses] = useState([]);
  const [clients, setClients] = useState(INITIAL_CLIENTS);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [editingId, setEditingId] = useState(null);
  
  const stylesLoaded = useTailwindLoader(); 
  const libsLoaded = useExternalScripts();

  const initialFormState = {
    partner: PARTNERS[0], client: "", head: EXPENSE_HEADS[0], date: new Date().toISOString().split('T')[0],
    amount: "", gstAmount: "", description: "", category: CATEGORIES[0].id, paymentMode: PAYMENT_MODES[2],
    receiptImage: null, missingReceiptReason: ""
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => { 
      try { 
        await signInAnonymously(auth); 
      } catch (e) { 
        console.error("Auth Error", e);
        if (e.code === 'auth/admin-restricted-operation' || e.code === 'auth/operation-not-allowed') {
          setAuthError("ACTION REQUIRED: Enable 'Anonymous' sign-in in Firebase Console.");
        } else {
          setAuthError(`Authentication Error: ${e.message}`);
        }
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    try {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'avanzia_expenses'));
      const unsubExpenses = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setExpenses(data);
      });
      const qClients = query(collection(db, 'artifacts', appId, 'public', 'data', 'avanzia_clients'));
      const unsubClients = onSnapshot(qClients, (snapshot) => {
        if (!snapshot.empty) {
          const loadedClients = snapshot.docs.map(doc => doc.data().name);
          if (loadedClients.length > 0) setClients([...new Set([...INITIAL_CLIENTS, ...loadedClients])]);
        }
      });
      return () => { unsubExpenses(); unsubClients(); };
    } catch(e) {
      console.error("Firestore Error", e);
    }
  }, [user]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000); 
  };

  const handleEdit = (expense) => {
      setFormData({
          partner: expense.partner,
          client: expense.client || "",
          head: expense.head,
          date: expense.date,
          amount: expense.amount,
          gstAmount: expense.gstAmount || "",
          description: expense.description,
          category: expense.category,
          paymentMode: expense.paymentMode,
          receiptImage: expense.receiptImage,
          missingReceiptReason: expense.missingReceiptReason || ""
      });
      setEditingId(expense.id);
      setActiveTab('entry');
      showNotification("Expense loaded for editing. Click Update when done.", "success");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { showNotification("File too large (>20MB).", "error"); return; }

    if (file.type === 'application/pdf') {
        if (file.size > 900 * 1024) { showNotification("PDF too large. Max 900KB.", "error"); return; }
        try { const base64 = await readFileAsBase64(file); setFormData(prev => ({ ...prev, receiptImage: base64, missingReceiptReason: "" })); } 
        catch (err) { showNotification("Error reading PDF", "error"); }
    } else if (file.type.startsWith('image/')) {
        try { 
            showNotification("Compressing image...", "success");
            const compressedBase64 = await compressImage(file); 
            if (compressedBase64.length > 1040000) {
                showNotification("Image too large even after compression.", "error");
                return;
            }
            setFormData(prev => ({ ...prev, receiptImage: compressedBase64, missingReceiptReason: "" })); 
        } 
        catch (err) { showNotification("Error processing image", "error"); }
    } else { showNotification("Unsupported file type. Use Image or PDF.", "error"); }
  };

  const handleAddClient = async (newClientName) => {
    if (!newClientName.trim()) return;
    try { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'avanzia_clients'), { name: newClientName, createdAt: new Date().toISOString() }); showNotification(`Client ${newClientName} added.`); } 
    catch (err) { showNotification("Failed to add client", "error"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { showNotification("Authentication missing. Refresh page.", "error"); return; }
    if (!formData.receiptImage && !formData.missingReceiptReason) { showNotification("Please attach a bill OR provide a reason.", "error"); return; }
    
    setLoading(true);
    try {
      const payload = { 
          ...formData, 
          amount: parseFloat(formData.amount) || 0, 
          gstAmount: formData.gstAmount ? parseFloat(formData.gstAmount) : 0, 
          createdAt: new Date().toISOString(), 
          createdBy: user.uid 
      };
      
      if (editingId) {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'avanzia_expenses', editingId), payload);
          showNotification("Expense updated successfully!");
          setEditingId(null);
      } else {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'avanzia_expenses'), payload);
          showNotification("Expense saved successfully!"); 
      }
      setFormData(initialFormState);
    } catch (error) { 
        console.error("Save Error:", error);
        if (error.code === 'permission-denied') showNotification("Permission Denied: Check Firestore Rules.", "error");
        else showNotification(`Error: ${error.message}`, "error");
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'avanzia_expenses', id)); showNotification("Record deleted."); } 
    catch (err) { showNotification("Error deleting record", "error"); }
  };

  const generatePDF = async (data, title) => {
    if (!window.jspdf || !window.PDFLib) { showNotification("Libraries loading... please wait 5s and try again.", "error"); return; }
    setLoading(true);
    try {
        const { jsPDF } = window.jspdf;
        const { PDFDocument } = window.PDFLib;
        const doc = new jsPDF();
        
        doc.setFontSize(18); doc.setTextColor(41, 50, 65); doc.text("Avanzia Global Private Limited", 14, 20);
        doc.setFontSize(12); doc.setTextColor(100); doc.text(title, 14, 28); doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 34);
        
        let startY = 40;
        if (title.includes("PARTNER_MASTER")) {
            const self = data.filter(i => (i.paymentMode || '').includes('Self')).reduce((a, c) => a + c.amount, 0);
            const company = data.filter(i => !(i.paymentMode || '').includes('Self')).reduce((a, c) => a + c.amount, 0);
            doc.setFontSize(10); doc.setTextColor(50);
            doc.text(`Subtotal (Paid by Partner): ${formatCurrency(self)}`, 14, startY); startY += 5;
            doc.text(`Subtotal (Paid by Company): ${formatCurrency(company)}`, 14, startY); startY += 10;
        } else if (title.includes("CLIENT_MASTER")) {
            const billable = data.filter(i => i.category === 'billable').reduce((a, c) => a + c.amount, 0);
            const nonBillable = data.reduce((acc, curr) => acc + curr.amount, 0) - billable;
            doc.setFontSize(10); doc.setTextColor(50);
            doc.text(`Subtotal (Billable): ${formatCurrency(billable)}`, 14, startY); startY += 5;
            doc.text(`Subtotal (Non-Billable): ${formatCurrency(nonBillable)}`, 14, startY); startY += 10;
        }

        const tableColumn = ["Date", "Partner", "Client", "Head", "Mode", "Description", "Amount (INR)"];
        const tableRows = [];
        let totalAmount = 0;
        data.forEach(item => {
            totalAmount += item.amount;
            const safeMode = (item.paymentMode || '').includes('Self') ? 'Self' : 'Company';
            tableRows.push([
                item.date, 
                item.partner, 
                item.client || '-', 
                item.head || '',  
                safeMode, 
                item.description || '', 
                formatCurrency(item.amount)
            ]);
        });
        tableRows.push(["", "", "", "", "", "TOTAL", formatCurrency(totalAmount)]);
        
        doc.autoTable({ head: [tableColumn], body: tableRows, startY: startY, theme: 'grid', headStyles: { fillColor: [66, 133, 244] } });
        
        const tablePdfBytes = doc.output('arraybuffer');
        const finalPdf = await PDFDocument.load(tablePdfBytes);
        
        for (const item of data) {
            if (!item.receiptImage) continue;
            try {
                const isPdf = item.receiptImage.startsWith('data:application/pdf');
                const isPng = item.receiptImage.startsWith('data:image/png');
                
                // UPDATED: Safe Base64 Conversion
                const imageBytes = base64ToUint8Array(item.receiptImage);

                if (isPdf) {
                    const receiptPdf = await PDFDocument.load(imageBytes);
                    const copiedPages = await finalPdf.copyPages(receiptPdf, receiptPdf.getPageIndices());
                    copiedPages.forEach((page) => finalPdf.addPage(page));
                } else {
                    let imageToEmbed;
                    if (isPng) {
                        imageToEmbed = await finalPdf.embedPng(imageBytes);
                    } else {
                        imageToEmbed = await finalPdf.embedJpg(imageBytes);
                    }

                    const page = finalPdf.addPage();
                    page.drawText(`Receipt: ${item.description} - ${formatCurrency(item.amount)}`, { x: 50, y: page.getHeight() - 50, size: 12 });
                    
                    const imgDims = imageToEmbed.scale(1);
                    const pageWidth = page.getWidth(); const pageHeight = page.getHeight(); const margin = 50;
                    let w = imgDims.width; let h = imgDims.height; const maxWidth = pageWidth - (margin * 2); const maxHeight = pageHeight - (margin * 2) - 60;
                    const scale = Math.min(maxWidth / w, maxHeight / h, 1);
                    page.drawImage(imageToEmbed, { x: margin, y: pageHeight - margin - 60 - (h * scale), width: w * scale, height: h * scale });
                }
            } catch (innerErr) {
                console.warn(`Skipping corrupt/incompatible image for item: ${item.description}`, innerErr);
                continue;
            }
        }
        const pdfBytes = await finalPdf.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${title.replace(/\s+/g, '_')}.pdf`; link.click();
        showNotification("PDF Report Generated!");
    } catch (err) { console.error(err); showNotification("Error generating PDF. Check console.", "error"); } finally { setLoading(false); }
  };

  const generateExcel = (data, filename) => {
    if (!window.XLSX) { showNotification("Excel Library loading... wait 5s.", "error"); return; }
    const XLSX = window.XLSX;
    
    const rowData = data.map(item => ({
        Date: item.date, Partner: item.partner, Client: item.client, 
        Head: item.head, 
        Category: CATEGORIES.find(c => c.id === item.category)?.label,
        Description: item.description, 
        Amount: item.amount, GST_Component: item.gstAmount || 0, 
        Payment_Mode: item.paymentMode, 
        Receipt_Type: item.receiptImage ? (item.receiptImage.startsWith('data:application/pdf') ? 'PDF' : 'Image') : "Missing", 
        Missing_Reason: item.missingReceiptReason
    }));

    if (filename.includes("Partner_Master")) {
        const self = data.filter(i => (i.paymentMode || '').includes('Self')).reduce((a, c) => a + c.amount, 0);
        const company = data.filter(i => !(i.paymentMode || '').includes('Self')).reduce((a, c) => a + c.amount, 0);
        rowData.push({});
        rowData.push({ Description: "SUBTOTAL (Paid by Self)", Amount: self });
        rowData.push({ Description: "SUBTOTAL (Paid by Company)", Amount: company });
    } else if (filename.includes("Client_Master")) {
        const billable = data.filter(i => i.category === 'billable').reduce((a, c) => a + c.amount, 0);
        const nonBillable = data.reduce((acc, curr) => acc + curr.amount, 0) - billable;
        rowData.push({});
        rowData.push({ Description: "SUBTOTAL (Billable)", Amount: billable });
        rowData.push({ Description: "SUBTOTAL (Non-Billable)", Amount: nonBillable });
    }

    const ws = XLSX.utils.json_to_sheet(rowData);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Expenses"); XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const renderEntryForm = () => (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              {editingId ? <Pencil className="w-6 h-6 text-orange-600" /> : <Plus className="w-6 h-6 text-blue-600" />} 
              {editingId ? "Edit Expense Entry" : "New Expense Entry"}
          </h2>
          {editingId && (
              <button onClick={() => {setEditingId(null); setFormData(initialFormState);}} className="text-sm text-red-500 underline">Cancel Edit</button>
          )}
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Partner Name</label><select required className="w-full border border-gray-300 p-2 rounded-lg bg-white" value={formData.partner} onChange={e => setFormData({...formData, partner: e.target.value})}>{PARTNERS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Expense Date</label><input type="date" required className="w-full border border-gray-300 p-2 rounded-lg" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Client (If Applicable)</label><select className="w-full border border-gray-300 p-2 rounded-lg bg-white" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})}><option value="">-- General / No Client --</option>{clients.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Expense Head</label><select required className="w-full border border-gray-300 p-2 rounded-lg bg-white" value={formData.head} onChange={e => setFormData({...formData, head: e.target.value})}>{EXPENSE_HEADS.map(h => <option key={h} value={h}>{h}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Total Bill Amount (INR)</label><input type="number" step="0.01" required className="w-full border border-gray-300 p-2 rounded-lg" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} /></div>
          {(formData.category.includes('partner') || formData.paymentMode.includes('Self')) && (
            <div className="bg-blue-50 p-3 rounded-md border border-blue-200"><label className="block text-xs font-bold text-blue-800 uppercase mb-1">GST Component</label><input type="number" step="0.01" className="w-full border border-blue-200 p-2 text-sm rounded bg-white" value={formData.gstAmount} onChange={e => setFormData({...formData, gstAmount: e.target.value})} /></div>
          )}
          <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><input type="text" required className="w-full border border-gray-300 p-2 rounded-lg" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Expense Category</label><select required className="w-full border border-gray-300 p-2 rounded-lg bg-white" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label><select required className="w-full border border-gray-300 p-2 rounded-lg bg-white" value={formData.paymentMode} onChange={e => setFormData({...formData, paymentMode: e.target.value})}>{PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
          <div className="md:col-span-2 border-t border-gray-200 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Supporting Document</label>
            <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="flex-1 w-full"><label className="flex flex-col items-center px-4 py-6 bg-white text-blue rounded-lg shadow-sm border border-blue-200 cursor-pointer hover:bg-blue-50 transition-colors"><UploadCloud className="w-8 h-8 text-blue-500" /><span className="mt-2 text-base text-blue-600 font-semibold">Select File</span><input type='file' className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} /></label></div>
                <div className="flex-1 w-full">{!formData.receiptImage ? (<div><label className="block text-xs font-bold text-red-600 uppercase mb-1">No attachment? Provide reason:</label><textarea className="w-full border border-red-200 bg-red-50 rounded-lg p-2 text-sm" rows={3} value={formData.missingReceiptReason} onChange={e => setFormData({...formData, missingReceiptReason: e.target.value})} /></div>) : (<div className="relative h-24 w-full bg-gray-50 rounded-md border border-gray-200 flex items-center justify-center">{formData.receiptImage.startsWith('data:application/pdf') ? <div className="text-center"><File className="w-8 h-8 text-red-500 mx-auto" /><span className="text-xs font-bold text-gray-600">PDF Attached</span></div> : <img src={formData.receiptImage} alt="Preview" className="h-full w-full object-contain" />}<button type="button" onClick={() => setFormData(prev => ({...prev, receiptImage: null}))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"><Trash2 className="w-3 h-3" /></button></div>)}</div>
            </div>
          </div>
        </div>
        <div className="pt-4 flex justify-end">
            <Button onClick={handleSubmit} disabled={loading} className={`w-full md:w-auto ${editingId ? 'bg-orange-600 hover:bg-orange-700' : ''}`}>
                {loading ? "Saving..." : (editingId ? "Update Expense Record" : "Save Expense Record")}
            </Button>
        </div>
      </form>
    </div>
  );

  // --- WAIT FOR STYLES ---
  if (!stylesLoaded) {
      return (
          <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
              <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  <p style={{ marginTop: '20px', color: '#666' }}>Loading Application...</p>
                  <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 pb-20">
      {/* Auth Error Banner */}
      {authError && (
        <div className="bg-red-600 text-white p-4 text-center font-bold sticky top-0 z-50 shadow-lg flex items-center justify-center gap-2 animate-pulse">
           <AlertTriangle className="w-6 h-6" />
           {authError}
        </div>
      )}
      
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium animate-bounce flex items-center gap-2 ${notification.type === 'error' ? 'bg-red-500' : 'bg-green-600'}`}>
            {notification.type === 'error' ? <XCircle className="w-5 h-5"/> : <Check className="w-5 h-5"/>}
            {notification.message}
        </div>
      )}

      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2"><div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm"><Briefcase className="w-6 h-6" /></div><div><h1 className="text-xl font-bold text-gray-900 leading-tight">Avanzia Global</h1><p className="text-xs text-gray-500">Consulting Expense Tracker</p></div></div>
            <nav className="hidden md:flex space-x-1">{[{ id: 'entry', icon: Plus, label: 'New Expense' }, { id: 'reports', icon: PieChart, label: 'Reports & Exports' }, { id: 'admin', icon: Settings, label: 'Admin / Master' }].map(item => (<button key={item.id} onClick={() => setActiveTab(item.id)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === item.id ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}><item.icon className="w-4 h-4" />{item.label}</button>))}</nav>
          </div>
        </div>
      </header>
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex justify-around p-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">{[{ id: 'entry', icon: Plus, label: 'Add' }, { id: 'reports', icon: PieChart, label: 'Reports' }, { id: 'admin', icon: Settings, label: 'Admin' }].map(item => (<button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center p-2 rounded-md ${activeTab === item.id ? 'text-blue-600' : 'text-gray-400'}`}><item.icon className="w-6 h-6" /><span className="text-xs mt-1">{item.label}</span></button>))}</div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'entry' && renderEntryForm()}
        {activeTab === 'reports' && <ReportsView expenses={expenses} clients={clients} generatePDF={generatePDF} generateExcel={generateExcel} />}
        {activeTab === 'admin' && <AdminView clients={clients} expenses={expenses} handleAddClient={handleAddClient} handleDelete={handleDelete} generateExcel={generateExcel} onEdit={handleEdit} />}
      </main>
    </div>
  );
}