import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LoginScreen } from './components/LoginScreen';
import { GeneralDashboard } from './components/GeneralDashboard';
import { ClientDashboard } from './components/ClientDashboard';
import { TechnicalChecklistForm } from './components/TechnicalChecklistForm';
import { AppointmentsManager } from './components/AppointmentsManager';
import { FinancialManager } from './components/FinancialManager';
import { ContactsManager } from './components/ContactsManager';
import { NotificationDrawer } from './components/NotificationDrawer';
import { PdfReportModal } from './components/PdfReportModal';
import { SettingsModal } from './components/SettingsModal';
import { AuditLogModal } from './components/AuditLogModal';
import { TechnicalChecklist, AuthSession } from './types';
import { storage } from './utils/storage';
import { notificationService } from './utils/notifications';

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(() => storage.getCurrentSession());
  const [activeTab, setActiveTab] = useState<string>(() => {
    const current = storage.getCurrentSession();
    if (current && current.allowedNavTabs && current.allowedNavTabs.length > 0) {
      return current.allowedNavTabs[0];
    }
    return 'geral';
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  
  // Checklist wizard params & edit mode
  const [checklistAppointmentId, setChecklistAppointmentId] = useState<string | undefined>(undefined);
  const [checklistCustomerId, setChecklistCustomerId] = useState<string | undefined>(undefined);
  const [editingChecklist, setEditingChecklist] = useState<TechnicalChecklist | null>(null);

  // Modals state
  const [pdfChecklist, setPdfChecklist] = useState<TechnicalChecklist | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState<boolean>(false);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  // When session changes or tab permission changes, ensure activeTab is valid
  useEffect(() => {
    if (session && session.allowedNavTabs && session.allowedNavTabs.length > 0) {
      if (!session.allowedNavTabs.includes(activeTab as any)) {
        setActiveTab(session.allowedNavTabs[0]);
      }
    }
  }, [session, activeTab]);

  // Initialize notifications on mount
  useEffect(() => {
    notificationService.checkPendingScheduleAlerts();
    setUnreadNotifications(notificationService.getUnreadCount());

    if ('Notification' in window && Notification.permission === 'default') {
      notificationService.requestPermission();
    }
  }, []);

  const handleLoginSuccess = (newSession: AuthSession) => {
    setSession(newSession);
    if (newSession.allowedNavTabs && newSession.allowedNavTabs.length > 0) {
      setActiveTab(newSession.allowedNavTabs[0]);
    } else {
      setActiveTab(newSession.isTechnician ? 'checklist' : 'cliente');
    }
  };

  const handleLogout = () => {
    storage.logout();
    setSession(null);
  };

  const handleStartNewChecklist = (appointmentId?: string, customerId?: string) => {
    setEditingChecklist(null);
    setChecklistAppointmentId(appointmentId);
    setChecklistCustomerId(customerId);
    setActiveTab('checklist');
  };

  const handleEditChecklist = (checklist: TechnicalChecklist) => {
    setEditingChecklist(checklist);
    setChecklistAppointmentId(checklist.appointmentId);
    setChecklistCustomerId(checklist.customerId);
    setActiveTab('checklist');
  };

  const handleChecklistCompleted = (savedChecklist: TechnicalChecklist) => {
    // Automatically open PDF preview modal as requested
    setEditingChecklist(null);
    setPdfChecklist(savedChecklist);
  };

  const handleSelectCustomerForDashboard = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setActiveTab('cliente');
  };

  // If user is not authenticated, show LoginScreen
  if (!session) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col text-slate-900 font-sans antialiased selection:bg-amber-400 selection:text-amber-950">
      {/* Top Main Navigation */}
      <Navbar
        activeTab={activeTab}
        session={session}
        onLogout={handleLogout}
        onSelectTab={(tab) => {
          if (tab === 'checklist' && activeTab !== 'checklist') {
            setEditingChecklist(null);
            setChecklistAppointmentId(undefined);
            setChecklistCustomerId(undefined);
          }
          setActiveTab(tab);
        }}
        onOpenNotifications={() => {
          setIsNotificationsOpen(true);
          setUnreadNotifications(0);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuditLog={() => setIsAuditLogOpen(true)}
        unreadNotificationsCount={unreadNotifications}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
        {activeTab === 'geral' && (
          <GeneralDashboard
            onStartNewChecklist={handleStartNewChecklist}
            onEditChecklist={handleEditChecklist}
            onOpenPdfReport={(chk) => setPdfChecklist(chk)}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onSelectCustomer={handleSelectCustomerForDashboard}
          />
        )}

        {activeTab === 'cliente' && (
          <ClientDashboard
            selectedCustomerId={selectedCustomerId}
            session={session}
            onSelectCustomer={(id) => setSelectedCustomerId(id)}
            onStartNewChecklist={handleStartNewChecklist}
            onEditChecklist={handleEditChecklist}
            onOpenPdfReport={(chk) => setPdfChecklist(chk)}
            onScheduleAppointment={() => setActiveTab('agenda')}
          />
        )}

        {activeTab === 'checklist' && (
          <TechnicalChecklistForm
            initialAppointmentId={checklistAppointmentId}
            initialCustomerId={checklistCustomerId}
            checklistToEdit={editingChecklist || undefined}
            onChecklistCompleted={handleChecklistCompleted}
            onSaveComplete={handleChecklistCompleted}
            onCancel={() => {
              setEditingChecklist(null);
              setActiveTab('geral');
            }}
          />
        )}

        {activeTab === 'agenda' && (
          <AppointmentsManager
            onStartChecklist={handleStartNewChecklist}
            onEditChecklist={handleEditChecklist}
            onOpenPdfReport={(chk) => setPdfChecklist(chk)}
            onSelectCustomer={handleSelectCustomerForDashboard}
          />
        )}

        {activeTab === 'financeiro' && <FinancialManager />}

        {activeTab === 'contatos' && (
          <ContactsManager
            session={session}
            onSelectCustomerForDashboard={handleSelectCustomerForDashboard}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-bold text-slate-700">
            ELTHERA • Soluções em Altura | Gestão Técnica & Limpeza Fotovoltaica
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Modo Offline Habilitado • Nuvem Elthera • Assinaturas Digitais & Laudo PDF com Auditoria
          </p>
        </div>
      </footer>

      {/* Modals and Drawers */}
      {pdfChecklist && (
        <PdfReportModal
          checklist={pdfChecklist}
          isOpen={!!pdfChecklist}
          onClose={() => setPdfChecklist(null)}
        />
      )}

      {/* Audit Log Modal */}
      <AuditLogModal
        isOpen={isAuditLogOpen}
        onClose={() => setIsAuditLogOpen(false)}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onSelectAppointment={(aptId, custId) => {
          setIsNotificationsOpen(false);
          handleStartNewChecklist(aptId, custId);
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        session={session}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
