const API_BASE = import.meta.env.VITE_API_TARGET || 'http://localhost:3376';
const VAPID_PUBLIC_KEY = 'BKr5FQlZ4renFe3h1ekKUGzpmHjN7kEgyurP9L_8Xfg5wX-YaJUDqBR53wAnZ0uMJOktbWkYnMaBu8U_l0PMWa8';

export function useNotifications() {

    async function requestPermission(): Promise<boolean> {
        if (!('Notification' in window)) {
            console.warn('Notifications non supportées')
            return false
        }
        if (Notification.permission === 'granted') return true
        if (Notification.permission === 'denied') return false

        const permission = await Notification.requestPermission()
        return permission === 'granted'
    }

    function sendNotification(title: string, body: string, icon?: string) {
        if (!('Notification' in window)) {
            alert(`${title}\n${body}`)
            return
        }
        if (Notification.permission !== 'granted') return

        new Notification(title, {
            body,
            icon: icon || '/icons/icon-192.png',
        })
    }

    async function subscribeToPush() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: VAPID_PUBLIC_KEY
            });
            await fetch(`${API_BASE}/game/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('zanzibar_token')}`
                },
                body: JSON.stringify(subscription)
            });
            console.log('Push subscription enregistré');
        } catch (e) {
            console.warn('Push subscription échoué:', e);
        }
    }

    return { requestPermission, sendNotification, subscribeToPush }
}