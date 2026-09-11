import React from 'react';
import { Printer, X, Download, ShieldCheck, QrCode } from 'lucide-react';
import { ClinicSettings } from '../../types';

interface PrintableDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: 'prescription' | 'invoice' | 'payment_receipt' | 'lab_result' | 'consultation_summary';
  data: any;
  settings: ClinicSettings;
}

export const PrintableDocumentModal: React.FC<PrintableDocumentModalProps> = ({
  isOpen,
  onClose,
  title,
  type,
  data,
  settings
}) => {
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 no-print">
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500">Aperçu avant impression du document médical officiel</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer le document</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-100 flex justify-center">
          <div 
            id="printable-document" 
            className="w-full max-w-2xl bg-white p-8 rounded-xl shadow-md border border-slate-200 text-slate-900 text-sm leading-relaxed"
          >
            {/* Medical Header */}
            <div className="flex items-start justify-between border-b-2 border-teal-600 pb-6 mb-6">
              <div>
                <h1 className="text-xl font-bold text-teal-800 tracking-tight">{settings.nom}</h1>
                <p className="text-xs font-semibold text-slate-600">{settings.slogan}</p>
                <p className="text-xs text-slate-500 mt-1">{settings.adresse}, {settings.ville} ({settings.pays})</p>
                <p className="text-xs text-slate-500">Tél: {settings.telephone} | Email: {settings.email}</p>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">N° Agrément Ministère: {settings.numero_agrement}</p>
              </div>
              <div className="text-right">
                <div className="px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-lg text-right inline-block">
                  <span className="text-[10px] uppercase font-bold text-teal-800 tracking-wider block">Document Officiel</span>
                  <span className="text-xs font-mono font-bold text-slate-800">
                    {data.numero || data.recu_numero || `REF-${Date.now().toString().slice(-6)}`}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2">Date: {data.date || new Date().toISOString().split('T')[0]}</p>
              </div>
            </div>

            {/* Document Body According to Type */}

            {/* 1. PRESCRIPTION */}
            {type === 'prescription' && (
              <div>
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl mb-6 border border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500">Médecin Prescripteur :</p>
                    <p className="font-bold text-slate-900 text-base">{data.doctor_nom}</p>
                    <p className="text-xs text-teal-700 font-medium">{data.doctor_specialite}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Patient(e) :</p>
                    <p className="font-bold text-slate-900 text-base">{data.patient_nom}</p>
                    {data.patient_age && <p className="text-xs text-slate-600">Âge : {data.patient_age} ans</p>}
                  </div>
                </div>

                <div className="text-center my-4 pb-2">
                  <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider underline underline-offset-4 decoration-teal-600">
                    Ordonnance Médicale
                  </h2>
                </div>

                <div className="space-y-4 my-6">
                  {data.items?.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-50/70 rounded-lg border-l-4 border-teal-500">
                      <div className="flex justify-between font-bold text-slate-900">
                        <span>{idx + 1}. {item.medicament_nom} {item.dosage}</span>
                        <span className="text-xs text-teal-700 font-medium">{item.forme}</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-700 mt-1">
                        Posologie : {item.posologie} — {item.frequence}
                      </div>
                      <div className="text-xs text-slate-600">
                        Durée du traitement : <span className="font-medium">{item.duree}</span>
                      </div>
                      {item.instructions && (
                        <div className="text-xs text-slate-500 italic mt-0.5">
                          Note : {item.instructions}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {data.instructions_generales && (
                  <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-lg text-xs text-teal-900 mt-4">
                    <strong>Instructions générales :</strong> {data.instructions_generales}
                  </div>
                )}

                {/* Footer stamp & signature */}
                <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-end">
                  <div className="text-center">
                    <div className="w-16 h-16 border border-dashed border-slate-300 rounded flex items-center justify-center text-slate-400 mb-1">
                      <QrCode className="w-10 h-10" />
                    </div>
                    <span className="text-[10px] text-slate-400 block">Vérification QR Sécurisée</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800">Signature & Cachet du Médecin</p>
                    <div className="h-16 flex items-end justify-end">
                      <div className="border border-teal-600 text-teal-700 text-[11px] font-bold px-3 py-1 rounded-sm rotate-[-3deg] opacity-85">
                        {data.doctor_nom}<br />
                        <span className="text-[9px] font-normal">{settings.nom}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. INVOICE / CASHIER RECEIPT */}
            {(type === 'invoice' || type === 'payment_receipt') && (
              <div>
                <div className="flex justify-between items-start bg-slate-50 p-4 rounded-xl mb-6 border border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500">Facturé à :</p>
                    <p className="font-bold text-slate-900 text-base">{data.patient_nom}</p>
                    <p className="text-xs text-slate-600">N° Patient : {data.patient_numero || data.patient_id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Réf. Reçu / Facture :</p>
                    <p className="font-mono font-bold text-slate-900 text-base">{data.recu_numero || data.numero}</p>
                    <p className="text-xs text-slate-600">Date : {data.date}</p>
                  </div>
                </div>

                <div className="text-center my-4 pb-2">
                  <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider underline underline-offset-4 decoration-teal-600">
                    {type === 'payment_receipt' ? 'Reçu d’Encaissement Médical' : 'Facture Médicale'}
                  </h2>
                </div>

                {data?.items && (
                  <table className="w-full text-xs text-left mb-6">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Prestation / Acte</th>
                        <th className="py-2 px-2 text-center">Qté</th>
                        <th className="py-2 px-3 text-right">Prix Unitaire</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(data.items || []).map((it: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 font-medium text-slate-800">{it.description}</td>
                          <td className="py-2.5 px-2 text-center text-slate-600">{it.quantite}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{it.prix_unitaire} {settings.devise}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">{it.total} {settings.devise}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center mb-6">
                  <div>
                    {data.mode && (
                      <p className="text-xs text-slate-600">
                        Mode de règlement : <strong className="uppercase text-slate-900">{data.mode}</strong>
                      </p>
                    )}
                    {data.reference_transaction && (
                      <p className="text-xs text-slate-500">Réf transaction : {data.reference_transaction}</p>
                    )}
                    {data.encaisse_par_nom && (
                      <p className="text-xs text-slate-500">Encaissé par : {data.encaisse_par_nom}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Montant Réglé</span>
                    <span className="text-2xl font-bold text-teal-700 font-['Josefin_Sans']">
                      {data.montant || data.total_ttc} {settings.devise}
                    </span>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center">
                  <div className="text-[11px] text-slate-500">
                    Merci de votre confiance. Conservez ce reçu pour tout remboursement mutuelle.
                  </div>
                  <div className="border border-emerald-600 text-emerald-700 text-[10px] font-bold px-3 py-1 rounded">
                    PAIEMENT VALIDÉ — CAISSE
                  </div>
                </div>
              </div>
            )}

            {/* 3. LAB RESULT */}
            {type === 'lab_result' && (
              <div>
                <div className="flex justify-between items-start bg-slate-50 p-4 rounded-xl mb-6 border border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500">Patient(e) :</p>
                    <p className="font-bold text-slate-900 text-base">{data.patient_nom}</p>
                    <p className="text-xs text-slate-500">Prescrit par : {data.doctor_nom}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Examen :</p>
                    <p className="font-bold text-slate-900">{data.examen_nom}</p>
                    <p className="text-xs text-teal-700 font-medium">{data.categorie}</p>
                  </div>
                </div>

                <div className="text-center my-4 pb-2">
                  <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider underline underline-offset-4 decoration-teal-600">
                    Compte-Rendu d’Analyses Médicales
                  </h2>
                </div>

                <table className="w-full text-xs text-left mb-6">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Paramètre Analysé</th>
                      <th className="py-2 px-3 text-center">Résultat</th>
                      <th className="py-2 px-3 text-center">Unité</th>
                      <th className="py-2 px-3 text-right">Valeurs de Référence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.resultats?.map((res: any, idx: number) => (
                      <tr key={idx} className={res.est_anormal ? 'bg-rose-50/50' : ''}>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {res.parametre}
                          {res.remarque && <span className="block text-[10px] text-slate-500">{res.remarque}</span>}
                        </td>
                        <td className={`py-2.5 px-3 text-center font-bold ${res.est_anormal ? 'text-rose-600' : 'text-slate-900'}`}>
                          {res.valeur} {res.est_anormal && '⚠️'}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{res.unite}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">{res.normes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {data.conclusion && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-6">
                    <strong className="text-slate-800">Conclusion biologique :</strong>
                    <p className="text-slate-700 mt-1">{data.conclusion}</p>
                  </div>
                )}

                <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center">
                  <div className="text-xs text-slate-500">
                    Validé le {data.date_validation || data.date_analyse || data.date_demande} par {data.valide_par_nom || 'Laboratoire d’Analyses'}
                  </div>
                  <div className="border border-teal-600 text-teal-700 text-[10px] font-bold px-3 py-1 rounded">
                    RÉSULTAT BIOLOGIQUE VALIDÉ
                  </div>
                </div>
              </div>
            )}

            {/* 4. CONSULTATION SUMMARY */}
            {type === 'consultation_summary' && (
              <div>
                <div className="flex justify-between items-start bg-slate-50 p-4 rounded-xl mb-6 border border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500">Patient(e) :</p>
                    <p className="font-bold text-slate-900 text-base">{data.patient_nom}</p>
                    <p className="text-xs text-slate-600">N° : {data.patient_numero}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Médecin Traitant :</p>
                    <p className="font-bold text-slate-900">{data.doctor_nom}</p>
                    <p className="text-xs text-teal-700">{data.doctor_specialite}</p>
                  </div>
                </div>

                <div className="text-center my-4 pb-2">
                  <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider underline underline-offset-4 decoration-teal-600">
                    Compte-Rendu de Consultation Médicale
                  </h2>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <strong className="text-slate-800">Motif de consultation :</strong>
                    <p className="text-slate-700 mt-0.5">{data.motif}</p>
                  </div>

                  {data.constantes && (
                    <div className="p-3 bg-teal-50/50 rounded-lg border border-teal-100">
                      <strong className="text-teal-900 block mb-1.5">Constantes vitales :</strong>
                      <div className="grid grid-cols-3 gap-2 text-slate-700">
                        {data.constantes.tension_systolique && <div>Tension : <strong>{data.constantes.tension_systolique}/{data.constantes.tension_diastolique} mmHg</strong></div>}
                        {data.constantes.pouls && <div>Pouls : <strong>{data.constantes.pouls} bpm</strong></div>}
                        {data.constantes.temperature && <div>Température : <strong>{data.constantes.temperature} °C</strong></div>}
                        {data.constantes.poids && <div>Poids : <strong>{data.constantes.poids} kg</strong></div>}
                        {data.constantes.taille && <div>Taille : <strong>{data.constantes.taille} cm</strong></div>}
                        {data.constantes.imc && <div>IMC : <strong>{data.constantes.imc} kg/m²</strong></div>}
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-slate-50 rounded-lg">
                    <strong className="text-slate-800">Diagnostic Médical :</strong>
                    <p className="text-slate-900 font-bold text-sm mt-0.5">
                      {data.diagnostic_principal} {data.code_cim10 && <span className="font-mono text-xs text-teal-700">({data.code_cim10})</span>}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg">
                    <strong className="text-slate-800">Plan de traitement & Conduite à tenir :</strong>
                    <p className="text-slate-700 mt-0.5 whitespace-pre-line">{data.plan_traitement}</p>
                  </div>
                </div>

                <div className="mt-10 pt-4 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-xs text-slate-500">Date de consultation : {data.date}</span>
                  <span className="text-xs font-bold text-slate-800">Visa du Praticien</span>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
