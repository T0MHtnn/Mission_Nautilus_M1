export type Theme = 'light' | 'dark' | 'auto'

const STORAGE_KEY = 'zanzibar_theme'
const LIGHT_THRESHOLD = 50

export function useTheme() {
    function applyTheme(theme: Theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark')
            document.body.classList.remove('light')
        } else if (theme === 'light') {
            document.body.classList.add('light')
            document.body.classList.remove('dark')
        } else {
            document.body.classList.remove('dark', 'light')
        }
        localStorage.setItem(STORAGE_KEY, theme)
    }

    function loadTheme() {
        const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
        applyTheme(saved || 'auto')
    }

    function startLightSensor() {
        if (!('AmbientLightSensor' in window)) {
            console.warn('AmbientLightSensor non supporté')
            return
        }
        try {
            // @ts-ignore
            const sensor = new AmbientLightSensor()
            sensor.addEventListener('reading', () => {
                const theme = localStorage.getItem(STORAGE_KEY) as Theme
                if (theme !== 'auto') return
                if (sensor.illuminance < LIGHT_THRESHOLD) {
                    document.body.classList.add('dark')
                    document.body.classList.remove('light')
                } else {
                    document.body.classList.remove('dark')
                    document.body.classList.add('light')
                }
            })
            sensor.start()
        } catch (e) {
            console.warn('Erreur AmbientLightSensor:', e)
        }
    }

    return { applyTheme, loadTheme, startLightSensor }
}