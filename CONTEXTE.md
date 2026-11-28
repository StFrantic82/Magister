# Magister — fiche de reprise

À lire au début de toute nouvelle conversation sur l'app Magister.

## Le projet

- **Magister** : jeu de société de Flaminia Brasini, Virginio Gigli et Marco Pranzo (illustrations Miguel Coimbra), édité par **Mosaic Studio**. 2 à 4 joueurs.
- Cette app web est le prototype numérique. Elle permet de jouer contre l'IA, en local (même écran) ou en ligne, avec un tutoriel, une visite guidée, des statistiques et un onglet d'entraînement de l'IA. Elle existe en français, anglais, italien et espagnol.
- Le propriétaire est **StFrantic82** (designer, Mosaic Studio). Il écrit en français et transmet aux auteurs des PDF en anglais, parfois en français et en italien.

## Où vit le code

- **Dépôt GitHub** : `StFrantic82/Magister`, publié par GitHub Pages. C'est la référence.
- **Copie sur claude.ai** : artefact « Magister », slug `183b8b57-9653-401d-a9d5-149640000363`. On le republie avec `publish_files` en donnant la dernière version comme `base_version`.
- **Commits** : signés `StFrantic82` / `StFrantic82@users.noreply.github.com`.
- **Cache** : chaque modification augmente le paramètre `?v=NOMBRE` des scripts dans `index.html` et `ui.js` (sim-worker inclus). Sans ça, le navigateur garde l'ancienne version. L'utilisateur fait ensuite Cmd+Shift+R.

### Fichiers

| Fichier | Rôle |
|---|---|
| `engine.js` | Règles et IA. État JSON pur, pile de tâches, `ask()` pour les décisions. |
| `ui.js` | Toute l'interface, les statistiques, la visite guidée et l'onglet IA. |
| `data.js` | Cartes (80), Livres, Recteurs, objectifs, pays et villes. |
| `i18n.js`, `i18n2.js` | Textes dans les 4 langues (`fr`, `en`, `it`, `es`). |
| `sim-worker.js` | Simulations et entraînement en arrière-plan. |
| `net-firebase.js`, `firebase-config.js` | Jeu en ligne et statistiques partagées (Firestore). |
| `cards/`, `rect/`, `obj/`, `city/`, `tok/`, `ic/`, `let/`, `book/` | Images. |
| `tools/` | Scripts de simulation et de test pour Node (voir plus bas). |

## Règles en place dans l'app

À l'accueil, on choisit la règle de la partie. Elle est enregistrée dans la partie (`s.rules`, `s.ruleSet`).

- **Classique** : fin à 8 PV, jetons Émérites 3 / 2 / 2…, Recteur à 8 d'influence, Émérite à 6 pièces.
- **Règle des 6** (proposée aux auteurs) : fin à 6 PV, Recteur à 6 d'influence, Émérite à 6 pièces. Jetons Émérites selon le nombre de joueurs : **2 joueurs : un jeton de 2 PV · 3 joueurs : 2 / 1 · 4 joueurs : 2 / 2**.

Dans le code, `RULESETS` et `rulesOf(s)` sont dans `engine.js`, et `curRules()` et `SIXTXT` (textes adaptés à la règle) dans `ui.js`. `setVariant()` ne sert qu'aux simulations.

### Choix de règles déjà validés

- Les Livres se jouent ou se défaussent uniquement en cliquant dessus.
- La défausse de Salé est obligatoire. Une Promotion choisie doit être faite.
- Le premier joueur est tiré au sort.
- Rectors 5a et 5b : dans le jeu, mais **jamais dans les simulations d'analyse** (`noRect:['5a','5b']`).
- Martin (carte 39) active **Religieux**. Son image a été retouchée en attendant l'illustrateur, et l'original est conservé hors du dépôt. On a ainsi 11 cartes par type activé, plus 15 Jokers et 5 cartes sans activation.

## IA

- **Niveaux** : Flaminia (Difficile), Virginio (Moyen), Marco (Facile), avec les couleurs or, argent et bronze.
- **Évaluation** : régression linéaire apprise sur environ 2 000 parties (`evalFeat`, poids dans `DEFAULT_W`).
- **Difficile** joue en MCTS dans les parties jouées (400 itérations, recherche limitée à son propre tour). Moyen et Facile utilisent l'heuristique avec du bruit.
- **Information cachée** (`hiddenClone`) : l'IA ne voit pas les Livres adverses. Les niveaux 2 et 3 sont respectés, et les cartes de Lisboa restent connues de leur seul poseur.
- **Durées en partie IA contre IA** (règle classique, 2 joueurs) : environ 10,8 manches en Difficile, 12,4 en Moyen, 13,7 en Facile.

## Analyses déjà faites (règle des 6)

Elles sont détaillées dans `tools/pdf_rule6_answers.py`, qui génère le PDF envoyé aux auteurs.

- Les objectifs passent d'environ 70 % des PV du vainqueur à environ 52 %. Un vainqueur sur trois gagne avec un seul objectif.
- La durée ne change pas à 2 et 3 joueurs. À 4 joueurs, la partie dure environ une demi-manche de moins (9,9 manches contre 10,4).
- Le hasard n'augmente pas de façon mesurable : Difficile bat Moyen dans 77 % des parties (76 % en classique), et bat Facile dans 90 % (89 %).
- Avec le Recteur à 6, il est pris beaucoup plus souvent (68 à 89 % des joueurs), sans tuile dominante.
- Un Émérite à 8 pièces ne rééquilibre pas : il rallonge la partie.

## Scripts (`tools/`)

On les lance avec Node depuis `tools/`. Ils chargent `../data.js` et `../engine.js`.

| Script | Usage |
|---|---|
| `duel.js A B N [joueurs] [graine]` | Duel entre deux configurations d'IA, par exemple `'{}' '{}' 200`. |
| `var6.js '{variante}' N joueurs [graine]` | Répartition des PV, Recteurs et durée pour une variante de règle. |
| `var7.js '{variante}' N niveauA niveauB [graine]` | Émérites, Livres, activation verte et écart de niveau. |
| `gen.js N graine sortie.json` + `fit.py` | Génère des parties puis réapprend les poids de l'IA. |
| `lvl.js`, `rectest.js`, `slktest.js`, `eltest.js`, `bkpromo.js`, `hctest.js` | Tests de non-régression. |

Exemple de variante : `{"goal":6,"rcost":6,"tokBy":{"2":[2],"3":[2,1],"4":[2,2]},"noRect":["5a","5b"]}`.

## Façon de travailler attendue

- Répondre en français.
- Après chaque modification : tester (Node et/ou Playwright), pousser sur GitHub, republier l'artefact claude.ai, puis faire un résumé court.
- Ne jamais lancer de simulation d'analyse avec les Recteurs 5a et 5b.

## Pistes ouvertes

- Retours des auteurs sur la règle des 6 et sur les jetons selon le nombre de joueurs.
- Corriger l'illustration de Martin (icône Religieux) chez l'illustrateur.
- Le salon d'une partie en ligne n'affiche pas la règle choisie aux invités.
