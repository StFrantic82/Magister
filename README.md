# Magister

Application web jouable du jeu de société **Magister** — Flaminia Brasini, Virginio Gigli & Marco Pranzo, illustrations Miguel Coimbra, édité par **Mosaic Studio**. 2–4 joueurs, 14 ans et +.

Dirige une université médiévale : recrute des étudiants, fais-en des professeurs, des émérites et un recteur, et envoie tes voyageurs à travers l'Europe. Dès qu'un joueur atteint 8 points de victoire, on termine le tour : l'université la plus prestigieuse l'emporte.

## Fonctionnalités

- **Partie locale** de 2 à 4 joueurs, humains ou ordinateur, sur le même écran (sauvegarde automatique, bouton Annuler).
- **Tutoriel** illustré en 8 étapes, puis partie guidée avec conseils contextuels.
- **Statistiques** sur toutes les parties : Étudiants, niveaux, Livres, Recteurs, objectifs Émérites, pays, villes, durée des parties.
- **Simulations IA** : lots de parties IA contre IA et entraînement de l'IA (réglages ajustés par générations, option « parties rapides »).
- Interface en **français, anglais et italien**.

## Lancer l'application

Aucune installation ni compilation : c'est un site statique.

- **GitHub Pages** : *Settings → Pages → Deploy from a branch → `main` / root*, puis ouvrir l'adresse indiquée.
- **En local** : depuis ce dossier, `python3 -m http.server 8000` puis ouvrir <http://localhost:8000>. (Ouvrir `index.html` directement par double-clic bloque les simulations, qui utilisent un Web Worker.)

## Limites hors de claude.ai

La partie en ligne (tables avec code), les statistiques partagées entre joueurs et l'IA entraînée commune utilisent la base de données de la plateforme claude.ai. Hébergée ailleurs, l'application fonctionne entièrement en local : statistiques et réglages de l'IA sont enregistrés dans le navigateur de chaque joueur. Le jeu à distance nécessiterait de brancher un service de synchronisation (Firebase, Supabase…).

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` | Page, styles et structure |
| `data.js` | Données des cartes, Livres, Recteurs, objectifs, pays, Lettres |
| `engine.js` | Moteur de règles et IA (état JSON pur, sans interface) |
| `ui.js` | Interface : accueil, plateau, tutoriel, statistiques, simulations |
| `i18n.js`, `i18n2.js` | Traductions FR / EN / IT |
| `sim-worker.js` | Simulations IA en arrière-plan |
| `cards/`, `book/`, `rect/`, `obj/`, `let/`, `city/`, `tok/`, `ic/` | Visuels |

Pour modifier une carte, éditer sa ligne dans `data.js` ; pour un texte, sa clé dans `i18n.js` / `i18n2.js`.

## Droits

Code, règles, illustrations et logos © Mosaic Studio et leurs auteurs. Tous droits réservés.
