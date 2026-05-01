# NOVA by UFO GVNG — Setup Guide

## 🚀 Démarrage rapide

### 1. Créer ton projet Supabase
1. Va sur [supabase.com](https://supabase.com) → **New project**
2. Note ton **URL** et ta **Anon Key** (Settings > API)

### 2. Configurer les variables d'environnement
```bash
cp .env.example .env
```
Ouvre `.env` et remplace :
```
VITE_SUPABASE_URL=https://TON-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=ta-anon-key-ici
```

### 3. Créer la base de données
1. Dans Supabase → **SQL Editor** → **New Query**
2. Colle tout le contenu de `supabase-schema.sql`
3. Clique **Run**

### 4. Créer les Storage Buckets
Dans Supabase → **Storage** → créer ces 4 buckets (tous en **Public**) :
- `audio`
- `video`
- `covers`
- `avatars`

### 5. Installer et lancer
```bash
npm install
npm run dev
```

L'app tourne sur http://localhost:5173

---

## 👑 Devenir admin
1. Crée un compte via l'app
2. Note ton **User UUID** dans Supabase → **Authentication** → **Users**
3. Dans SQL Editor :
```sql
UPDATE user_roles SET role = 'admin' WHERE user_id = 'ton-uuid-ici';
```

---

## 🗂️ Structure du projet

```
src/
├── branding/          # Logo, Splash, config couleurs
├── features/
│   ├── auth/          # Login, Register, ForgotPassword, AuthContext
│   ├── radio/         # UG Radio page
│   ├── tv/            # UG TV page
│   ├── discovery/     # Découverte artistes
│   ├── profile/       # Profil utilisateur
│   └── admin/         # Panel admin
└── shared/
    ├── lib/           # supabase.js
    └── ui/            # BottomNav, ProtectedRoute
```

---

## 📱 Navigation
| Route | Page |
|-------|------|
| `/radio` | UG Radio |
| `/tv` | UG TV |
| `/discovery` | Découverte |
| `/profile` | Profil |
| `/admin` | Admin Panel (admin only) |
| `/login` | Connexion |
| `/register` | Inscription |

---

## 🎨 Design System

Couleurs centralisées dans `src/branding/config.js` :
- Vert néon : `#00FF87`
- Violet spatial : `#7B2FBE`
- Noir profond : `#090909`

---

## 📦 Stack
- **React 18** + **Vite**
- **Supabase** (Auth, DB, Storage)
- **React Router v6**
- **Framer Motion** (animations)
- **Zod** (validation)
