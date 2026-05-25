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
            // Fallback : alert si API non dispo
            alert(`${title}\n${body}`)
            return
        }
        if (Notification.permission !== 'granted') return

        new Notification(title, {
            body,
            icon: icon || '/icons/icon-192.png',
        })
    }

    return { requestPermission, sendNotification }
}