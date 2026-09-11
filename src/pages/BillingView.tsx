import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Printer,
  CheckCircle2,
  Clock,
  DollarSign,
  Receipt,
  Trash2,
  User,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  FileSpreadsheet,
  Wallet
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { syncInvoiceCreate, syncPaymentCreate } from '../services/backendSync';
import { toast } from '../components/ui/Toast';
import { Invoice, Payment, Patient, MedicalService, InvoiceItem, ClinicSettings } from '../types';

interface BillingViewProps {
  onPrintDocument?: (type: any, data: any, title: string) => void;
  settings: ClinicSettings;
}

export const BillingView: React.FC<BillingViewProps> = ({
  onPrintDocument,
  settings
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<MedicalService[]>([]);
  
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Payment Recording Modal
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    montant: 0,
    mode: 'especes' as Payment['mode'],
    reference_transaction: '',
    notes: ''
  });

  // New Invoice Modal
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [newInvoiceData, setNewInvoiceData] = useState({
    patient_id: '',
    prise_en_charge_part_assurance: 0,
    items: [] as {
      type: InvoiceItem['type'];
      description: string;
      quantite: number;
      prix_unitaire: number;
      total: number;
    }[]
  });

  const loadData = () => {
    setInvoices(apiService.billing.getInvoices());
    setPayments(apiService.billing.getPayments());
    setPatients(apiService.patients.getAll());
    setServices(apiService.services.getAll());
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('medicare_data_updated', handleUpdate);
    return () => window.removeEventListener('medicare_data_updated', handleUpdate);
  }, []);

  const totalCollected = invoices.reduce((sum, i) => sum + i.montant_paye, 0);
  const totalPending = invoices.reduce((sum, i) => sum + i.reste_a_payer, 0);
  const totalInvoiced = invoices.reduce((sum, i) => sum + i.total_ttc, 0);

  const handleOpenPayment = (inv: Invoice) => {
    setSelectedInvoiceForPayment(inv);
    setPaymentForm({
      montant: inv.reste_a_payer,
      mode: 'especes',
      reference_transaction: '',
      notes: ''
    });
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPayment) return;

    const newPayment = apiService.billing.recordPayment(
      selectedInvoiceForPayment.id,
      Number(paymentForm.montant),
      paymentForm.mode,
      paymentForm.reference_transaction,
      'Caissier Principal',
      paymentForm.notes
    );

    setSelectedInvoiceForPayment(null);
    if (newPayment) syncPaymentCreate(newPayment);

    // Auto open print receipt
    if (onPrintDocument && newPayment) {
      onPrintDocument('payment_receipt', newPayment, 'Reçu d’Encaissement Médical');
    }
  };

  const handleAddItemToInvoice = (desc: string, price: number, type: InvoiceItem['type'] = 'acte') => {
    setNewInvoiceData({
      ...newInvoiceData,
      items: [
        ...newInvoiceData.items,
        {
          type,
          description: desc,
          quantite: 1,
          prix_unitaire: price,
          total: price
        }
      ]
    });
  };

  const handleRemoveInvoiceItem = (idx: number) => {
    const copy = [...newInvoiceData.items];
    copy.splice(idx, 1);
    setNewInvoiceData({ ...newInvoiceData, items: copy });
  };

  const calculateInvoiceTotals = () => {
    const rawTotal = newInvoiceData.items.reduce((sum, it) => sum + it.total, 0);
    const insurancePart = (rawTotal * (newInvoiceData.prise_en_charge_part_assurance || 0)) / 100;
    const patientPart = rawTotal - insurancePart;
    return { rawTotal, insurancePart, patientPart };
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find(p => p.id === newInvoiceData.patient_id);
    if (!pat || newInvoiceData.items.length === 0) {
      toast.error('Veuillez sélectionner un patient et ajouter au moins une prestation.');
      return;
    }

    const { rawTotal, insurancePart, patientPart } = calculateInvoiceTotals();

    const created = apiService.billing.createInvoice({
      patient_id: pat.id,
      patient_nom: `${pat.nom} ${pat.prenom}`,
      patient_numero: pat.numero,
      date_emission: new Date().toISOString().split('T')[0],
      statut: 'emise',
      total_ht: rawTotal,
      tva: 0,
      total_ttc: rawTotal,
      montant_paye: 0,
      reste_a_payer: patientPart,
      prise_en_charge_part_assurance: insurancePart,
      part_patient: patientPart,
      items: newInvoiceData.items.map((it, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        ...it
      }))
    });

    setIsCreatingInvoice(false);
    syncInvoiceCreate(created);
  };

  const filteredInvoices = invoices.filter((inv) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      inv.numero.toLowerCase().includes(q) ||
      inv.patient_nom.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || inv.statut === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-['Josefin_Sans']">
            Caisse, Facturation & Règlements
          </h1>
          <p className="text-xs text-slate-500">
            Émission des factures médicales, encaissement multi-moyens (Espèces, Carte, Mobile Money, Tiers-payant) et reçus
          </p>
        </div>

        <button
          onClick={() => {
            if (patients.length > 0) {
              setNewInvoiceData(prev => ({
                ...prev,
                patient_id: patients[0].id,
                items: [
                  { type: 'consultation', description: 'Consultation Médecine Générale', quantite: 1, prix_unitaire: 25, total: 25 }
                ]
              }));
            }
            setIsCreatingInvoice(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Émettre une Facture</span>
        </button>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Recettes Totales Encaissées</span>
          <div className="text-2xl font-bold text-emerald-700 font-['Josefin_Sans'] mt-2">
            {totalCollected.toLocaleString()} {settings.devise}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Encaissées en caisse
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Restes à Recouvrer (Créances)</span>
          <div className="text-2xl font-bold text-rose-600 font-['Josefin_Sans'] mt-2">
            {totalPending.toLocaleString()} {settings.devise}
          </div>
          <span className="text-[11px] text-rose-500 font-semibold flex items-center gap-1 mt-1">
            <Clock className="w-3.5 h-3.5" /> En attente de règlement
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Volume Global Facturé</span>
          <div className="text-2xl font-bold text-slate-900 font-['Josefin_Sans'] mt-2">
            {totalInvoiced.toLocaleString()} {settings.devise}
          </div>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            {invoices.length} factures générées
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'invoices' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Factures Médicales ({invoices.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'payments' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Journal des Encaissements & Reçus ({payments.length})</span>
        </button>
      </div>

      {/* TAB 1: INVOICES */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par N° facture, patient..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Statut:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700"
              >
                <option value="all">Tous les statuts</option>
                <option value="payee">Payée</option>
                <option value="partiellement_payee">Partiellement payée</option>
                <option value="emise">Émise (Non payée)</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">N° Facture</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Date Émission</th>
                    <th className="py-3 px-4 text-right">Montant Total</th>
                    <th className="py-3 px-4 text-right">Déjà Payé</th>
                    <th className="py-3 px-4 text-right">Reste Dû</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-teal-800">
                        {inv.numero}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{inv.patient_nom}</div>
                        <span className="text-[11px] font-mono text-slate-400">{inv.patient_numero}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {inv.date_emission}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {inv.total_ttc} {settings.devise}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-emerald-700">
                        {inv.montant_paye} {settings.devise}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className={`font-bold ${inv.reste_a_payer > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                          {inv.reste_a_payer} {settings.devise}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          inv.statut === 'payee'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.statut === 'partiellement_payee'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {inv.statut === 'payee' ? 'RÉGLÉE' : inv.statut === 'partiellement_payee' ? 'PARTIEL' : 'À PAYER'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {inv.reste_a_payer > 0 && (
                            <button
                              onClick={() => handleOpenPayment(inv)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-xs"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Encaisser</span>
                            </button>
                          )}
                          {onPrintDocument && (
                            <button
                              onClick={() => onPrintDocument('invoice', inv, 'Facture Médicale')}
                              className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg"
                              title="Imprimer Facture"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PAYMENTS JOURNAL */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">N° Reçu</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Date & Heure</th>
                  <th className="py-3 px-4">Mode de Règlement</th>
                  <th className="py-3 px-4">Réf. Transaction</th>
                  <th className="py-3 px-4 text-right">Montant Encaissé</th>
                  <th className="py-3 px-4 text-right">Imprimer Reçu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-800">
                      {p.recu_numero}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {p.patient_nom}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono">
                      {p.date} • {p.heure}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-800 uppercase">
                        {p.mode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {p.reference_transaction || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-700 text-sm font-['Josefin_Sans']">
                      {p.montant} {settings.devise}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {onPrintDocument && (
                        <button
                          onClick={() => onPrintDocument('payment_receipt', p, 'Reçu d’Encaissement Médical')}
                          className="px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold inline-flex items-center gap-1"
                        >
                          <Printer className="w-3 h-3" /> Reçu
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {selectedInvoiceForPayment && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-['Josefin_Sans']">
                  Encaisser un Règlement
                </h3>
                <p className="text-xs text-slate-500">Facture {selectedInvoiceForPayment.numero} • {selectedInvoiceForPayment.patient_nom}</p>
              </div>
              <button
                onClick={() => setSelectedInvoiceForPayment(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-4 space-y-4 text-xs">
              <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 flex justify-between items-center">
                <span className="font-semibold text-teal-900">Reste à régler :</span>
                <span className="text-xl font-bold text-teal-800 font-['Josefin_Sans']">
                  {selectedInvoiceForPayment.reste_a_payer} {settings.devise}
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Montant à Encaisser ({settings.devise}) *</label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedInvoiceForPayment.reste_a_payer}
                  required
                  value={paymentForm.montant}
                  onChange={(e) => setPaymentForm({ ...paymentForm, montant: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mode de Paiement *</label>
                <select
                  value={paymentForm.mode}
                  onChange={(e) => setPaymentForm({ ...paymentForm, mode: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
                >
                  <option value="especes">Espèces (Cash)</option>
                  <option value="carte_bancaire">Carte Bancaire (TPE)</option>
                  <option value="mobile_money">Mobile Money (Orange / Wave / MTN)</option>
                  <option value="virement">Virement Bancaire</option>
                  <option value="cheque">Chèque</option>
                  <option value="tiers_payant">Prise en charge Assurance / Mutuelle</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Référence / N° Transaction (facultatif)</label>
                <input
                  type="text"
                  value={paymentForm.reference_transaction}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference_transaction: e.target.value })}
                  placeholder="Ex: TRX-98234 / Chèque N°77654"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForPayment(null)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold shadow-xs flex items-center gap-1.5"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Valider & Générer Reçu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW INVOICE MODAL */}
      {isCreatingInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-['Josefin_Sans']">
                  Nouvelle Facture Médicale
                </h3>
                <p className="text-xs text-slate-500">Ajout d'actes, consultations, analyses et médicaments</p>
              </div>
              <button
                onClick={() => setIsCreatingInvoice(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Patient à Facturer *</label>
                <select
                  required
                  value={newInvoiceData.patient_id}
                  onChange={(e) => setNewInvoiceData({ ...newInvoiceData, patient_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nom} {p.prenom} ({p.numero}) {p.assure ? `[Assuré: ${p.assurance_nom}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Add item triggers */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Lignes de Prestations</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddItemToInvoice('Consultation Spécialiste', 35, 'consultation')}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded"
                    >
                      + Consultation (35 {settings.devise})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddItemToInvoice('Bilan Sanguin NFS + CRP', 18, 'examen')}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded"
                    >
                      + Examen Labo (18 {settings.devise})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddItemToInvoice('Pansement / Soin infirmier', 10, 'acte')}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded"
                    >
                      + Soin infirmier (10 {settings.devise})
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {newInvoiceData.items.map((it, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={it.description}
                          onChange={(e) => {
                            const copy = [...newInvoiceData.items];
                            copy[idx].description = e.target.value;
                            setNewInvoiceData({ ...newInvoiceData, items: copy });
                          }}
                          className="w-full px-2 py-1 bg-white border rounded font-semibold text-slate-800 text-xs"
                        />
                      </div>
                      <div className="w-20">
                        <input
                          type="number"
                          min="1"
                          value={it.quantite}
                          onChange={(e) => {
                            const copy = [...newInvoiceData.items];
                            copy[idx].quantite = Number(e.target.value);
                            copy[idx].total = copy[idx].quantite * copy[idx].prix_unitaire;
                            setNewInvoiceData({ ...newInvoiceData, items: copy });
                          }}
                          placeholder="Qté"
                          className="w-full px-2 py-1 bg-white border rounded text-center"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          value={it.prix_unitaire}
                          onChange={(e) => {
                            const copy = [...newInvoiceData.items];
                            copy[idx].prix_unitaire = Number(e.target.value);
                            copy[idx].total = copy[idx].quantite * copy[idx].prix_unitaire;
                            setNewInvoiceData({ ...newInvoiceData, items: copy });
                          }}
                          placeholder="PU"
                          className="w-full px-2 py-1 bg-white border rounded text-right font-bold"
                        />
                      </div>
                      <span className="font-bold text-slate-900 min-w-[70px] text-right font-mono">
                        {it.total} {settings.devise}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveInvoiceItem(idx)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tiers payant assurance */}
              <div className="p-4 bg-teal-50/60 rounded-xl border border-teal-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-teal-900 block">Prise en charge Mutuelle / Tiers-Payant (%)</span>
                  <span className="text-[11px] text-teal-700">Déduit directement de la part patient</span>
                </div>
                <div className="w-28">
                  <select
                    value={newInvoiceData.prise_en_charge_part_assurance}
                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, prise_en_charge_part_assurance: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-white border border-teal-200 rounded-lg font-bold text-teal-800"
                  >
                    <option value={0}>0% (100% Patient)</option>
                    <option value={50}>50% Mutuelle</option>
                    <option value={70}>70% Mutuelle</option>
                    <option value={80}>80% Mutuelle</option>
                    <option value={100}>100% Tiers-Payant</option>
                  </select>
                </div>
              </div>

              {/* Calculated Totals Summary */}
              {(() => {
                const { rawTotal, insurancePart, patientPart } = calculateInvoiceTotals();
                return (
                  <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <span className="text-slate-400 block">Total Prestations : {rawTotal} {settings.devise}</span>
                      {insurancePart > 0 && (
                        <span className="text-teal-300 block">Part Assurance : -{insurancePart} {settings.devise}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block">Net à payer par le patient</span>
                      <span className="text-xl font-bold text-teal-400 font-['Josefin_Sans']">
                        {patientPart} {settings.devise}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingInvoice(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white bg-teal-600 hover:bg-teal-700 rounded-xl font-bold shadow-xs"
                >
                  Émettre la Facture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
