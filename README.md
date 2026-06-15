# internationalDays

Page web indiquant les journées internationales pour le jour en cours et 
permettant de lister les journées en fonction des mois.

Le projet contient également un script permettant d'envoyer les informations dans 
un channel Mattermost

## Project setup
```
pnpm install
```

### Compiles and hot-reloads for development
```
pnpm dev
```
En développement, l'API PHP est proxifiée par Vite (`/api.php` → `http://localhost:8000`
par défaut, configurable via `VITE_API_TARGET`). Lancer un serveur PHP en parallèle :
```
php -S localhost:8000 -t public
```

### Compiles and minifies for production
```
pnpm build
```

### Previews the production build
```
pnpm preview
```

### Lints and fixes files
```
pnpm lint
```
