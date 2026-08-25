import { storage } from './storage';
import { Appointment } from '../types';

export class NotificationService {
  private hasPermission = false;
  private checkInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.hasPermission = Notification.permission === 'granted';
    }
  }

  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      return this.hasPermission;
    } catch (e) {
      console.warn('Erro ao solicitar permissão de notificações', e);
      return false;
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  // Play subtle high quality audio alert for technician notifications
  public playAlertSound(): void {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      // AudioContext might be restricted until user interaction
    }
  }

  public notifyTechnician(title: string, message: string, options?: { appointmentId?: string; customerId?: string; priority?: 'baixa' | 'media' | 'alta' }): void {
    // 1. Save to in-app notification center
    storage.addNotification({
      title,
      message,
      type: 'agendamento',
      priority: options?.priority || 'media',
      appointmentId: options?.appointmentId,
      customerId: options?.customerId,
    });

    // 2. Play subtle chime
    this.playAlertSound();

    // 3. Trigger native Web Push notification if allowed
    if (this.hasPermission && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: options?.appointmentId || 'elthera_pro-alert',
        });
      } catch (e) {
        console.warn('Falha ao disparar Web Notification', e);
      }
    }
  }

  public getUnreadCount(): number {
    return storage.getNotifications().filter((n) => !n.read).length;
  }

  public checkPendingScheduleAlerts(): void {
    const appointments = storage.getAppointments();
    const todayStr = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    appointments.forEach((apt) => {
      if (apt.status === 'agendado' && apt.scheduledDate === todayStr) {
        const [aptHour, aptMin] = apt.scheduledTime.split(':').map(Number);
        const diffMinutes = (aptHour * 60 + aptMin) - (currentHours * 60 + currentMinutes);

        if (diffMinutes > 0 && diffMinutes <= 45 && !apt.notificationSent) {
          const customer = storage.getContactById(apt.customerId);
          const technician = storage.getContactById(apt.technicianId);

          this.notifyTechnician(
            `⚡ Atendimento Próximo (${apt.scheduledTime})`,
            `Técnico ${technician?.name || ''}: Visita em ${diffMinutes} min no cliente ${customer?.name || ''}.`,
            { appointmentId: apt.id, customerId: apt.customerId, priority: 'alta' }
          );

          apt.notificationSent = true;
          storage.saveAppointment(apt);
        }
      }
    });
  }

  // Periodic scanner for technician agenda alerts & pending checklists
  public startScheduleMonitor(): void {
    if (this.checkInterval) return;

    const runCheck = () => {
      const appointments = storage.getAppointments();
      const todayStr = new Date().toISOString().slice(0, 10);
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();

      appointments.forEach((apt) => {
        if (apt.status === 'agendado' && apt.scheduledDate === todayStr) {
          const [aptHour, aptMin] = apt.scheduledTime.split(':').map(Number);
          const diffMinutes = (aptHour * 60 + aptMin) - (currentHours * 60 + currentMinutes);

          // Alert 30 minutes before
          if (diffMinutes > 0 && diffMinutes <= 30 && !apt.notificationSent) {
            const customer = storage.getContactById(apt.customerId);
            const technician = storage.getContactById(apt.technicianId);

            this.notifyTechnician(
              `⚡ Atendimento Próximo (${apt.scheduledTime})`,
              `Técnico ${technician?.name || ''}: Visita em ${diffMinutes} min no cliente ${customer?.name || ''}. Endereço: ${customer?.address.street}, ${customer?.address.number}`,
              { appointmentId: apt.id, customerId: apt.customerId, priority: 'alta' }
            );

            apt.notificationSent = true;
            storage.saveAppointment(apt);
          }

          // Alert if appointment time passed and checklist is still pending
          if (diffMinutes < -15 && !apt.checklistId && apt.status === 'agendado') {
            const customer = storage.getContactById(apt.customerId);
            this.notifyTechnician(
              `⚠️ Checklist Pendente`,
              `O atendimento das ${apt.scheduledTime} em ${customer?.name || ''} ainda não teve o Checklist Técnico iniciado/finalizado.`,
              { appointmentId: apt.id, customerId: apt.customerId, priority: 'alta' }
            );
          }
        }
      });
    };

    // Run immediately then every 60 seconds
    runCheck();
    this.checkInterval = setInterval(runCheck, 60000);
  }

  public stopScheduleMonitor(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

export const notificationService = new NotificationService();
