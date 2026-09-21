# Modèles d'email Supabase

Les modèles sont versionnés ici et branchés dans `supabase/config.toml` pour le
dev local. **Le projet hébergé ne les lit pas automatiquement** : après chaque
modification, coller le contenu du fichier dans le dashboard
(Authentication → Email Templates → onglet correspondant), ainsi que le sujet.

| Fichier         | Onglet dashboard | Sujet                                              |
|-----------------|------------------|----------------------------------------------------|
| `recovery.html` | Reset password   | Réinitialisation de votre mot de passe – TGA       |

Les liens pointent sur `/auth/callback?token_hash=…&type=…&next=…` : la session
est posée côté serveur avant la redirection, ce qui fonctionne même si l'email
est ouvert dans un autre navigateur que celui de la demande (app Gmail, etc.).
Le logo est chargé depuis `{{ .SiteURL }}/images/logo-tga.png`.
