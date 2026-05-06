# 1.2.1. API Navigation Timing

**Tableau de valeurs :**<br>
| Essai | HTML Recovery | DOM Creation | CSSOM Ready | App Shell (FCP) | CRP (Final) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| n°1 | ~~12,4~~ | ~~77~~ | ~~503,8~~ | ~~392~~ | ~~373,3~~ |
| n°2 | 331,8 | 420,6 | 908,4 | 812 | 782,4 |
| n°3 | 22,9 | 100,2 | 648,4 | 536 | 515,6 |
| n°4 | ~~336,2~~ | 410,5 | 871,7 | 816 | 790,7 |
| n°5 | 21,8 | 98,4 | 632,1 | 556 | 523,6 |
| n°6 | 331,5 | 401,2 | 880,1 | 804 | 772,1 |
| n°7 | 335,2 | ~~429,2~~ | 875,5 | 800 | 777,3 |
| n°8 | 24,3 | 109,8 | 622 | 544 | 581,9 |
| n°9 | 333,9 | 409,7 | ~~958~~ | ~~848~~ | ~~828,4~~ |
| n°10 | 21 | 143 | 592,1 | 528 | 506,6 |
| **Moyenne** | **177,8** | **261,675** | **753,7875** | **674,5** | **656,275** |
<br>


**Analyse :**<br>
On observe que le CRP se stabilise autour de 650ms. Les variations importantes du HTML Recovery suggèrent une latence réseau instable sur la VM, justifiant la méthodologie de suppression des extrêmes pour obtenir une mesure fiable du temps de rendu.

Script :
```javascript
(() => {
    const nt2 = performance.getEntriesByType("navigation")[0];
    const paint = performance.getEntriesByType("paint");
    const resources = performance.getEntriesByType("resource");

    if (!nt2) return console.error("Spec NT L2 non supportée");

    const start = nt2.startTime; 

    const htmlTime = nt2.responseEnd - start;

    const domTime = nt2.domInteractive - start;

    const cssFiles = resources.filter(r => r.initiatorType === "link" || r.name.endsWith(".css"));
    const cssomTime = cssFiles.length > 0 
        ? Math.max(...cssFiles.map(r => r.responseEnd)) - start 
        : "N/A";

    const fcp = paint.find(p => p.name === "first-contentful-paint");
    const appShellTime = fcp ? fcp.startTime - start : "N/A";

    const crpTime = nt2.domContentLoadedEventEnd - start;

    console.log("%c Relevés de Performance (ms depuis timeOrigin) ", "background: #222; color: #bada55; padding: 5px;");
    console.table({
        "HTML Recovery": htmlTime.toFixed(2),
        "DOM Creation": domTime.toFixed(2),
        "CSSOM Ready": typeof cssomTime === "number" ? cssomTime.toFixed(2) : cssomTime,
        "App Shell (FCP)": typeof appShellTime === "number" ? appShellTime.toFixed(2) : appShellTime,
        "CRP (Final)": crpTime.toFixed(2)
    });
})();
```