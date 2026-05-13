# Suivi des optimisations de performance

Ce dossier contient les rapports Lighthouse et les analyses de
performance effectuées tout au long du TP7.

## Historique des améliorations

| Étape | Fichier | Score | TBT | FCP | LCP |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **v0** - Baseline | `lighthouse-v0.md` | 48 | 310 ms | 21.1 s | 27.6 s |
| **2.1** - Filtrage rivaux + LERP | `TP7-2.1.md` | 55 | 100 ms | - | - |
| **2.2** - Canvas bulles | `TP7-2.2.md` | 47 | 360 ms | 18.8 s | 24.2 s |
| **3** - Optimisation polling + O(n²) | `TP7-3.md` | 57 | 60 ms | 8.0 s | 14.0 s |
| **4** - Web Worker + OffscreenCanvas | `TP7-4.md` | 56 | 70 ms | 8.1 s | 14.2 s |
| **5** - Code splitting + compression | `TP7-5.md` | 56 | 40 ms | 11.3 s | 20.5 s |

## Bilan

Le **TBT** est la métrique qui a le plus progressé : de **310ms**
initial à **40ms** final, soit une réduction de 87%. Cela signifie que
le thread principal est beaucoup moins bloqué, ce qui améliore
directement la réactivité de l'interface.

Les métriques FCP et LCP restent élevées en développement à cause du
JS non minifié. En production (build Vite + compression nginx), ces
valeurs seront significativement inférieures.

## Autres fichiers

- `premiere-analyse.md` — Analyse manuelle DevTools (1.1)
- `navigation-timing.md` — Mesures API Navigation Timing (1.2.1)
- `key-features.md` — Métriques User Timing personnalisées (1.2.2)