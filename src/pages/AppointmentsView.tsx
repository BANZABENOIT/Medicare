import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Stethoscope,
  Plus,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  XCircle,
  Play,
  Check,
  CalendarDays,
  List,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  HeartPulse
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { syncAppointmentCreate } from '../services/backendSync';
import { toast } from '../components/ui/Toast';
import { Appointment, Patient, Doctor, MedicalService, AppointmentStatus, ClinicSettings } from '../types';

interface AppointmentsViewProps {
  onStartConsultationFromAppointment?: (apt: Appointment) => void;
  settings: ClinicSettings;
}

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  onStartConsultationFromAppointment,
  settings
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<MedicalService[]>([]);
  
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [doctorFilter, setDoctorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Booking Modal State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingConflictWarning, setBookingConflictWarning] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState({
    patient_id: '',
    doctor_id: '',
    service_id: '',
    date: new Date().toISOString().split('T')[0],
    heure: '09:00',
    duree_minutes: 30,
    motif: 'Consultation générale',
    priorite: 'normale' as Appointment['priorite'],
    notes: ''
  });

  const loadData = () => {
    setAppointments(apiService.appointments.getAll());
    setPatients(apiService.patients.getAll());
    setDoctors(apiService.doctors.getAll());
    setServices(apiService.services.getAll());
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('medicare_data_updated', handleUpdate);
    return () => window.removeEventListener('medicare_data_updated', handleUpdate);
  }, []);

  const handleStatusChange = (id: string, newStatus: AppointmentStatus) => {
    apiService.appointments.updateStatus(id, newStatus);
  };

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingConflictWarning(null);

    const selectedPatient = patients.find(p => p.id === bookingData.patient_id);
    const selectedDoctor = doctors.find(d => d.id === bookingData.doctor_id);
    const selectedService = services.find(s => s.id === bookingData.service_id);

    if (!selectedPatient || !selectedDoctor || !selectedService) {
      toast.error('Veuillez sélectionner un patient, un médecin et un service.');
      return;
    }

    const result = apiService.appointments.create({
      patient_id: selectedPatient.id,
      patient_nom: `${selectedPatient.nom} ${selectedPatient.prenom}`,
      patient_numero: selectedPatient.numero,
      doctor_id: selectedDoctor.id,
      doctor_nom: `${selectedDoctor.titre || 'Dr.'} ${selectedDoctor.prenom} ${selectedDoctor.nom}`,
      service_id: selectedService.id,
      service_nom: selectedService.nom,
      date: bookingData.date,
      heure: bookingData.heure,
      duree_minutes: Number(bookingData.duree_minutes),
      motif: bookingData.motif,
      priorite: bookingData.priorite,
      statut: 'programme',
      notes: bookingData.notes
    });

    if (!result.success) {
      setBookingConflictWarning(result.conflictMessage || 'Conflit de créneau détecté.');
      return;
    }

    setIsBookingOpen(false);
    setBookingConflictWarning(null);
    syncAppointmentCreate(result.appointment || {
      id: result.appointment?.id || `rdv-${Date.now()}`,
      patient_id: selectedPatient.id,
      doctor_id: selectedDoctor.id,
      date: bookingData.date,
      heure: bookingData.heure,
      motif: bookingData.motif,
      notes: bookingData.notes
    });
  };

  const filteredAppointments = appointments.filter((apt) => {
    const query = searchTerm.toLowerCase();
    const matchSearch =
      apt.patient_nom.toLowerCase().includes(query) ||
      apt.doctor_nom.toLowerCase().includes(query) ||
      apt.motif.toLowerCase().includes(query);
    const matchDoctor = doctorFilter === 'all' || apt.doctor_id === doctorFilter;
    const matchStatus = statusFilter === 'all' || apt.statut === statusFilter;
    const matchDate = viewMode === 'calendar' ? apt.date === selectedDate : true;
    return matchSearch && matchDoctor && matchStatus && matchDate;
  });

  const getStatusBadge = (statut: AppointmentStatus) => {
    switch (statut) {
      case 'en_attente':
        return <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-full">En salle d’attente</span>;
      case 'en_consultation':
        return <span className="px-2 py-0.5 text-xs font-bold bg-teal-100 text-teal-800 rounded-full animate-pulse">En consultation</span>;
      case 'confirme':
        return <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-800 rounded-full">Confirmé</span>;
      case 'termine':
        return <span className="px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full">Terminé</span>;
      case 'annule':
        return <span className="px-2 py-0.5 text-xs font-bold bg-rose-100 text-rose-800 rounded-full">Annulé</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 rounded-full">Programmé</span>;
    }
  };

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '14:00', '14:30', '15:00',
    '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
  ];

  return (
    <div className="space-y-4">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-['Josefin_Sans']">
            Planification & Agenda des Rendez-vous
          </h1>
          <p className="text-xs text-slate-500">
            Gestion du flux patient, disponibilités médicales et détection des conflits
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Liste</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'calendar' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Planning Jour</span>
            </button>
          </div>

          <button
            onClick={() => {
              if (doctors.length > 0 && services.length > 0 && patients.length > 0) {
                setBookingData({
                  ...bookingData,
                  patient_id: patients[0].id,
                  doctor_id: doctors[0].id,
                  service_id: services[0].id
                });
              }
              setIsBookingOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Rendez-vous</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par patient, médecin, motif..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
          />
        </div>

        {/* Doctor Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Médecin:</span>
          <select
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700"
          >
            <option value="all">Tous les médecins</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>{d.titre || 'Dr.'} {d.nom} ({d.specialite})</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Statut:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700"
          >
            <option value="all">Tous les statuts</option>
            <option value="programme">Programmé</option>
            <option value="confirme">Confirmé</option>
            <option value="en_attente">En salle d'attente</option>
            <option value="en_consultation">En consultation</option>
            <option value="termine">Terminé</option>
            <option value="annule">Annulé</option>
          </select>
        </div>

        {viewMode === 'calendar' && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-teal-800"
            />
          </div>
        )}
      </div>

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date & Heure</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Médecin & Service</th>
                  <th className="py-3 px-4">Motif</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Changer Statut / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{apt.date}</div>
                      <div className="text-teal-700 font-mono font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {apt.heure} ({apt.duree_minutes} min)
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{apt.patient_nom}</div>
                      <span className="text-[11px] font-mono text-slate-400">{apt.patient_numero}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{apt.doctor_nom}</div>
                      <span className="text-[11px] text-teal-700 font-medium">{apt.service_nom}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium max-w-[200px] truncate">{apt.motif}</div>
                      {apt.priorite === 'urgente' && (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                          Urgent
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(apt.statut)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {apt.statut === 'programme' && (
                          <button
                            onClick={() => handleStatusChange(apt.id, 'en_attente')}
                            title="Placer en salle d'attente"
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Arrivé</span>
                          </button>
                        )}
                        {(apt.statut === 'en_attente' || apt.statut === 'confirme' || apt.statut === 'programme') && (
                          <button
                            onClick={() => {
                              handleStatusChange(apt.id, 'en_consultation');
                              if (onStartConsultationFromAppointment) {
                                onStartConsultationFromAppointment(apt);
                              }
                            }}
                            title="Démarrer la consultation"
                            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                          >
                            <Stethoscope className="w-3 h-3" />
                            <span>Consulter</span>
                          </button>
                        )}
                        {apt.statut === 'en_consultation' && (
                          <button
                            onClick={() => handleStatusChange(apt.id, 'termine')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Terminer</span>
                          </button>
                        )}
                        {apt.statut !== 'annule' && apt.statut !== 'termine' && (
                          <button
                            onClick={() => handleStatusChange(apt.id, 'annule')}
                            title="Annuler le rendez-vous"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredAppointments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Aucun rendez-vous ne correspond aux critères sélectionnés.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CALENDAR / DAY SCHEDULE VIEW */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">
              Agenda du {selectedDate}
            </h2>
            <div className="text-xs text-slate-500">
              {filteredAppointments.length} rendez-vous planifiés
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {timeSlots.map((slot) => {
              const slotAppointments = filteredAppointments.filter(a => a.heure === slot);
              return (
                <div 
                  key={slot} 
                  className={`p-3 rounded-xl border transition-all ${
                    slotAppointments.length > 0 
                      ? 'bg-teal-50/40 border-teal-200 shadow-xs' 
                      : 'bg-slate-50/60 border-slate-200/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                    <span className="font-mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-teal-600" /> {slot}
                    </span>
                    {slotAppointments.length > 0 && (
                      <span className="text-[10px] bg-teal-600 text-white px-1.5 py-0.2 rounded font-bold">
                        {slotAppointments.length} RDV
                      </span>
                    )}
                  </div>

                  {slotAppointments.map((apt) => (
                    <div key={apt.id} className="p-2.5 bg-white rounded-lg border border-slate-200 mb-1.5 shadow-2xs">
                      <div className="flex items-center justify-between font-bold text-xs text-slate-900">
                        <span>{apt.patient_nom}</span>
                        {getStatusBadge(apt.statut)}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1">
                        {apt.doctor_nom} • <span className="italic">{apt.motif}</span>
                      </div>
                    </div>
                  ))}

                  {slotAppointments.length === 0 && (
                    <div className="text-[11px] text-slate-400 italic text-center py-2">
                      Créneau libre
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* NEW APPOINTMENT BOOKING MODAL */}
      {isBookingOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-['Josefin_Sans']">
                  Prendre un Rendez-vous
                </h3>
                <p className="text-xs text-slate-500">Sélectionnez le patient, le praticien et le créneau</p>
              </div>
              <button
                onClick={() => { setIsBookingOpen(false); setBookingConflictWarning(null); }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="p-4 space-y-4 text-xs">
              
              {/* Conflict Alert Box */}
              {bookingConflictWarning && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Conflit d’agenda détecté :</strong>
                    <span>{bookingConflictWarning}</span>
                  </div>
                </div>
              )}

              {/* Patient Selection */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Patient *</label>
                <select
                  required
                  value={bookingData.patient_id}
                  onChange={(e) => setBookingData({ ...bookingData, patient_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="">-- Choisir un patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nom} {p.prenom} ({p.numero} - {p.telephone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Service & Doctor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Service Médical *</label>
                  <select
                    required
                    value={bookingData.service_id}
                    onChange={(e) => {
                      const srvId = e.target.value;
                      const srvDocs = doctors.filter(d => d.service_id === srvId);
                      setBookingData({
                        ...bookingData,
                        service_id: srvId,
                        doctor_id: srvDocs[0]?.id || bookingData.doctor_id
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.nom}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Médecin Soignant *</label>
                  <select
                    required
                    value={bookingData.doctor_id}
                    onChange={(e) => setBookingData({ ...bookingData, doctor_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-teal-800"
                  >
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.titre || 'Dr.'} {d.nom} ({d.specialite})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Time slot */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={bookingData.date}
                    onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Heure *</label>
                  <select
                    value={bookingData.heure}
                    onChange={(e) => setBookingData({ ...bookingData, heure: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  >
                    {timeSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Durée (min)</label>
                  <select
                    value={bookingData.duree_minutes}
                    onChange={(e) => setBookingData({ ...bookingData, duree_minutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                  </select>
                </div>
              </div>

              {/* Motif & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Motif de Consultation *</label>
                  <input
                    type="text"
                    required
                    value={bookingData.motif}
                    onChange={(e) => setBookingData({ ...bookingData, motif: e.target.value })}
                    placeholder="Ex: Douleurs abdominales, Suivi HTA, Vaccin..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Priorité</label>
                  <select
                    value={bookingData.priorite}
                    onChange={(e) => setBookingData({ ...bookingData, priorite: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  >
                    <option value="normale">Normale</option>
                    <option value="urgente">Urgente</option>
                    <option value="suivi">Suivi régulier</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notes Complémentaires</label>
                <textarea
                  rows={2}
                  value={bookingData.notes}
                  onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                  placeholder="Informations utiles pour l'accueil ou le soignant..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBookingOpen(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white bg-teal-600 hover:bg-teal-700 rounded-xl font-bold transition-colors shadow-xs"
                >
                  Confirmer le Rendez-vous
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
