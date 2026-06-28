import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "nav": {
        "home": "Home",
        "postAd": "Post an Ad",
        "buySell": "Buy & Sell",
        "adoption": "Adoption",
        "profile": "Profile",
        "messages": "Messages",
        "admin": "Admin",
        "login": "Login / Sign Up",
        "adminSupport": "Admin Support",
        "health": "Health & Tips",
        "coupling": "Coupling",
        "notifications": "Notifications",
        "lostAndFound": "Lost & Found"
      },
      "health": {
        "title": "Animal Health & Community",
        "subtitle": "Share experiences, give advice, and help fellow owners.",
        "searchPlaceholder": "Search for health issues, advice...",
        "shareExperience": "Share Experience",
        "noPosts": "No health posts found for this category.",
        "postSuccess": "Experience shared successfully!",
        "postTitle": "Title of your experience",
        "postContent": "Describe your experience or advice...",
        "selectAnimal": "Select Animal Type",
        "translateAction": "Translate to {{lang}}",
        "viewOriginal": "View Original",
        "like": "Like",
        "comment": "Comment",
        "follow": "Follow",
        "following": "Following",
        "translating": "Translating...",
        "continueReading": "Continue reading",
        "showLess": "Show less",
        "pendingApproval": "Pending Admin Approval"
      },
      "coupling": {
        "title": "Pet Coupling",
        "subtitle": "Find the perfect partner for your pet.",
        "postOffer": "Post Coupling Offer",
        "petGender": "Gender",
        "male": "Male",
        "female": "Female",
        "targetPet": "Looking for",
        "responses": "Responses",
        "respond": "Send Response",
        "myPetInfo": "My Pet's Information",
        "respondDesc": "Share your pet's details and photos to respond to this offer.",
        "noOffers": "No coupling offers found yet.",
        "success": "Coupling offer posted successfully!",
        "responseSuccess": "Response sent successfully!",
        "petName": "Pet Name",
        "petBreed": "Pet Breed",
        "requirements": "Requirements / Preferences",
        "viewResponses": "View Responses ({{count}})",
        "pendingApproval": "Pending Review"
      },
      "lostAndFound": {
        "title": "Lost & Found Pets",
        "subtitle": "Help reunite lost pets with their families.",
        "searchPlaceholder": "Search by animal type, location...",
        "createPost": "Report a Pet",
        "postSuccess": "Post submitted for review successfully!",
        "postTitle": "Title of your post (e.g. Lost Golden Retriever)",
        "postContent": "Describe the animal, last seen location, date, and contact info...",
        "location": "Last Seen Location (City)",
        "status": { "lost": "Lost", "found": "Found" },
        "postType": "Post Type"
      },
      "footer": {
        "description": "Morocco's premier destination for buying and selling animals. From pets to livestock, find your perfect companion with confidence and security.",
        "browse": "Browse",
        "quickLinks": "Quick Links",
        "support": "Support",
        "rights": "All rights reserved.",
        "terms": "Terms",
        "privacy": "Privacy",
        "safety": "Safety Tips",
        "language": "Language"
      },
      "categories": {
        "all": "All",
        "pets": "Pets for sell",
        "livestock": "Livestock",
        "adoption": "Pet for adoption (free)",
        "accessories": "Accessories",
        "pet": "Pet for sell",
        "accessory": "Accessories"
      },
      "home": {
        "heroTitle": "Find Your Perfect",
        "heroSubtitle": "Animal Companion",
        "searchPlaceholder": "Search for pets, livestock...",
        "locationPlaceholder": "Location",
        "searchButton": "Search",
        "browseCategories": "Browse Categories",
        "viewAll": "View All",
        "latestListings": "Latest Listings",
        "showingResults": "Showing {{count}} results",
        "noListingsFound": "No listings found",
        "adjustFilters": "Try adjusting your filters"
      },
      "admin": {
        "title": "Admin",
        "dashboard": "Dashboard",
        "subtitle": "Manage users, moderate listings, and view platform health.",
        "overview": "Overview",
        "listings": "Listings",
        "users": "Users",
        "reports": "Reports",
        "settings": "Settings",
        "totalUsers": "Total Users",
        "totalAds": "Total Ads",
        "pendingReports": "Pending Reports",
        "status": {
          "pending": "Awaiting Approval"
        }
      },
      "chat": {
        "title": "Messages",
        "searchPlaceholder": "Search conversations...",
        "noMessages": "No messages yet",
        "startConversation": "Start a conversation",
        "rateUser": "Rate User",
        "typeMessage": "Type your message here...",
        "conversations": "Your Conversations",
        "selectChat": "Select a chat from the sidebar to start messaging sellers or buyers."
      },
      "profile": {
        "listingsCount": "Ads",
        "favoritesCount": "Favorites",
        "reviewsCount": "Reviews",
        "followersCount": "Followers",
        "followingCount": "Following",
        "myListings": "My Listings",
        "savedItems": "Saved Items",
        "accountSettings": "Settings",
        "logout": "Logout",
        "noAds": "No ads yet",
        "startSelling": "Start selling today!",
        "personalInfo": "Personal Info",
        "displayName": "Display Name",
        "phoneNumber": "Phone Number",
        "location": "Location",
        "whatsapp": "WhatsApp (Optional)",
        "aboutBio": "About / Bio",
        "privacyVisibility": "Privacy & Visibility",
        "privacyDesc": "Control what information is visible to other users on your listings.",
        "showPhone": "Show Phone",
        "showLocation": "Show Location",
        "showEmail": "Show Email",
        "noFavorites": "No favorites yet",
        "saveInterest": "Save listings you're interested in to see them here.",
        "saveChanges": "Save Changes",
        "saving": "Saving..."
      },
      "login": {
        "welcome": "Welcome Back",
        "subtitle": "Join Morocco's Animal Community & Marketplace",
        "google": "Continue with Google",
        "secureAccess": "Secure Access",
        "emailPlaceholder": "Email Address",
        "passwordPlaceholder": "Password",
        "signIn": "Sign In",
        "signUp": "Sign Up",
        "noAccount": "Don't have an account?",
        "hasAccount": "Already have an account?",
        "agreement": "By continuing, you agree to Su9.ma's",
        "and": "and"
      },
      "createListing": {
        "title": "Post an Ad",
        "subtitle": "Reach thousands of buyers across Morocco",
        "photos": "Photos",
        "dragDrop": "Drag & drop photos here",
        "orClick": "or click to browse (up to 10 photos)",
        "basicInfo": "Basic Information",
        "listingTitle": "Listing Title",
        "description": "Description",
        "category": "Category",
        "price": "Price",
        "aiAssist": "AI Assist",
        "aiGenerating": "Generating...",
        "breed": "Breed / Type",
        "petType": "Pet Type",
        "petTypes": {
          "dog": "Dog",
          "cat": "Cat",
          "bird": "Bird",
          "fish": "Fish",
          "sheep": "Sheep",
          "other": "Other"
        },
        "selectPetType": "Select Pet Type",
        "selectBreed": "Select Breed",
        "age": "Age",
        "ageUnits": {
          "days": "Days",
          "weeks": "Weeks",
          "months": "Months",
          "years": "Years"
        },
        "location": "Location",
        "contactPreference": "Contact Preference",
        "cancel": "Cancel",
        "publish": "Publish Ad"
      },
      "listingDetail": {
        "back": "Back to Results",
        "description": "Description",
        "posted": "Posted {{time}} ago",
        "breed": "Breed",
        "age": "Age",
        "category": "Category",
        "price": "Price",
        "chat": "Chat with Seller",
        "favorite": "Favorite",
        "saved": "Saved",
        "share": "Share",
        "report": "Report this listing",
        "sellerInfo": "Seller Information",
        "memberSince": "Member since {{year}}",
        "viewOtherAds": "View Seller's Other Ads",
        "removeAd": "Remove Ad",
        "removeTitle": "Remove Listing",
        "removeDesc": "Please let us know why you are removing this ad. This helps us improve our service.",
        "removePlaceholder": "e.g., Sold on Su9.ma, Sold elsewhere, No longer available...",
        "confirmRemove": "Confirm Removal"
      }
      ,
      "termsPage": {
        "title": "Terms of Use",
        "welcome": "Welcome to Su9.ma. By using our marketplace, you agree to the following terms:",
        "sections": {
          "purpose": {
            "title": "1. Website Purpose",
            "content": "This website is an online classified advertising platform dedicated to animals (dogs, cats, birds, sheep, and ornamental fish) within the Kingdom of Morocco. Its purpose is to connect buyers and sellers. The platform does not sell or buy any animals directly."
          },
          "role": {
            "title": "2. Role of the Platform",
            "content": "The platform acts only as an intermediary for publishing advertisements. It does not participate in any transaction between users. All agreements, payments, and exchanges are made directly between users outside the platform."
          },
          "user": {
            "title": "3. User Responsibility",
            "content": "Users are fully responsible for the accuracy of the information they publish. Advertisements must be truthful and not misleading. Users must not post false, fraudulent, or deceptive content."
          },
          "allowed": {
            "title": "4. Allowed Animals",
            "content": "The following categories are allowed: Dogs, Cats, Birds, Sheep, Ornamental fish."
          },
          "prohibitedAnimals": {
            "title": "5. Prohibited Animals",
            "content": "It is strictly forbidden to publish advertisements for: Protected or endangered species, Wild animals without legal authorization, Any animals prohibited under Moroccan law."
          },
          "prohibitedContent": {
            "title": "6. Prohibited Content",
            "content": "Users are strictly prohibited from posting: Fraudulent or scam advertisements, Fake or misleading listings, Offensive, abusive, or illegal content, Any activity that violates applicable laws in Morocco."
          },
          "liability": {
            "title": "7. Legal Liability",
            "content": "The platform is not responsible for any transactions or disputes between users. All buying, selling, or exchanges are the sole responsibility of the users involved. Users are fully responsible for ensuring their advertisements comply with applicable laws."
          },
          "data": {
            "title": "8. Data Protection",
            "content": "Some personal data (such as phone number or email) may be collected to enable communication between users. Personal data is not sold or shared with third parties. Data processing complies with applicable personal data protection laws in Morocco and may fall under the supervision of CNDP."
          },
          "removal": {
            "title": "9. Right to Remove Content",
            "content": "The platform reserves the right to remove any advertisement that violates these Terms without prior notice. The platform may suspend or block any user who violates the rules."
          },
          "reporting": {
            "title": "10. Reporting Violations",
            "content": "Users can report: Suspicious or illegal advertisements, Fraudulent activity, Inappropriate or misleading content."
          },
          "changes": {
            "title": "11. Changes to Terms",
            "content": "These Terms of Use may be updated at any time. Continued use of the website means acceptance of any updated terms."
          },
          "acceptance": {
            "title": "12. Acceptance of Terms",
            "content": "By using this website, you confirm that you have read, understood, and agreed to these Terms of Use."
          }
        }
      },
      "privacyPage": {
        "title": "Privacy Policy",
        "welcome": "This Privacy Policy explains how su9.ma (“we”, “our”, “the platform”) collects, uses, stores, and protects personal data when you use our website.",
        "sections": {
          "introduction": {
            "title": "1. Introduction",
            "content": "The platform operates as an online classified ads service for animals (dogs, cats, birds, sheep, and ornamental fish) in the Kingdom of Morocco. Its purpose is to connect buyers and sellers."
          },
          "controller": {
            "title": "2. Data Controller",
            "content": "The data controller responsible for processing personal data is su9.ma. For inquiries, contact us at Contact@su9.ma."
          },
          "framework": {
            "title": "3. Legal Framework",
            "content": "We process personal data in accordance with applicable data protection laws in the Kingdom of Morocco, principles aligned with the GDPR, and under the supervision of the CNDP."
          },
          "collect": {
            "title": "4. Information We Collect",
            "content": "We collect information provided by users (name, phone, email, location, ad content) and automatically collected data (IP address, device info, usage data)."
          },
          "purpose": {
            "title": "5. Purpose of Data Collection",
            "content": "We use data to manage advertisements, enable communication, improve user experience, detect fraud, and comply with legal obligations."
          },
          "basis": {
            "title": "6. Legal Basis for Processing",
            "content": "Processing is based on user consent, contractual necessity for publishing ads, legitimate interests (security), and legal obligations."
          },
          "sharing": {
            "title": "7. Data Sharing",
            "content": "We do not sell personal data. Data is shared between users for transactions, with service providers, or if required by law."
          },
          "retention": {
            "title": "8. Data Retention",
            "content": "Data is kept only as long as necessary for its purpose. Users may request deletion of their data at any time."
          },
          "rights": {
            "title": "9. User Rights",
            "content": "Users have the right to access, correct, or delete their data, object to processing, and withdraw consent."
          },
          "cookies": {
            "title": "10. Cookies and Tracking",
            "content": "We use cookies to improve performance, remember preferences, and analyze traffic patterns. You can disable these in your browser settings."
          },
          "security": {
            "title": "11. Data Security",
            "content": "We implement technical measures to protect data against unauthorized access or misuse, though users share data at their own risk."
          },
          "thirdparty": {
            "title": "12. Third-Party Services",
            "content": "We use third-party providers for hosting, analytics, and notifications, all of whom are required to respect data protection obligations."
          },
          "disclaimer": {
            "title": "13. Animal Listings Disclaimer",
            "content": "The platform facilitates listings only. We are not responsible for the legality or condition of animals listed; users must comply with Moroccan laws."
          },
          "transfers": {
            "title": "14. International Transfers",
            "content": "If data is processed outside Morocco, we ensure appropriate safeguards are in place to protect your personal information."
          },
          "changes": {
            "title": "15. Changes to This Policy",
            "content": "We may update this Privacy Policy at any time. Updates will be published on this page."
          }
        }
      },
      "safetyPage": {
        "title": "Safety Tips",
        "welcome": "Your safety and the well-being of animals are our top priorities. Please follow these guidelines for a secure experience on Su9.ma.",
        "sections": {
          "general": {
            "title": "1. General Safety Rules",
            "content": "Always verify the identity of the buyer or seller before making any agreement. Never send money in advance without confirmation. Prefer meeting in person whenever possible. Be cautious of offers that seem “too good to be true”."
          },
          "scams": {
            "title": "2. Avoid Scams",
            "content": "Do not trust users asking for payment before showing the animal. Be careful with fake screenshots or edited photos. Avoid sellers who refuse to meet or provide clear details. Report suspicious users immediately."
          },
          "meeting": {
            "title": "3. Safe Meeting Practices",
            "content": "Meet in a public, safe place during daytime. If possible, bring someone with you. Inspect the animal carefully before completing any transaction. Do not meet in isolated or unsafe locations."
          },
          "welfare": {
            "title": "4. Animal Health & Welfare",
            "content": "Ask for vaccination or health records when available. Check the animal’s condition before buying. Avoid buying animals that appear sick or mistreated. Consider adopting instead of purchasing when possible."
          },
          "payments": {
            "title": "5. Payments",
            "content": "Prefer secure payment methods. Avoid sending money via unknown links or informal transfers. Do not share banking details with strangers."
          },
          "prohibited": {
            "title": "6. Prohibited Activities",
            "content": "Selling illegal or protected animals is strictly forbidden. Fraudulent listings or fake advertisements are not allowed. Any abuse or exploitation of animals must be reported immediately."
          },
          "communication": {
            "title": "7. Communication Safety",
            "content": "Keep all communication within safe and traceable channels. Do not share sensitive personal information unnecessarily. Be cautious of users asking to move conversations off-platform quickly."
          },
          "reporting": {
            "title": "8. Reporting Issues",
            "content": "If you encounter any suspicious behavior, scam, or illegal listing: Use the Report button on the listing or contact our support team at Contact@su9.ma. We will review and take action as soon as possible."
          },
          "reminder": {
            "title": "9. Reminder",
            "content": "su9.ma is a classified ads platform only. We do not sell animals and we are not responsible for transactions between users."
          }
        }
      }
    }
  },
  fr: {
    translation: {
      "nav": {
        "home": "Accueil",
        "postAd": "Publier",
        "buySell": "Acheter & Vendre",
        "adoption": "Adoption",
        "profile": "Profil",
        "messages": "Messages",
        "admin": "Admin",
        "login": "Connexion",
        "adminSupport": "Support Admin",
        "health": "Santé & Conseils",
        "coupling": "Accouplement",
        "notifications": "Notifications",
        "lostAndFound": "Perdu & Trouvé"
      },
      "health": {
        "title": "Santé Animale et Communauté",
        "subtitle": "Partagez vos expériences et aidez d'autres propriétaires.",
        "searchPlaceholder": "Rechercher des problèmes de santé...",
        "shareExperience": "Partager",
        "noPosts": "Aucune publication trouvée.",
        "postSuccess": "Expérience partagée avec succès !",
        "postTitle": "Titre de votre expérience",
        "postContent": "Décrivez votre expérience ou conseil...",
        "selectAnimal": "Type d'animal",
        "translateAction": "Traduire en {{lang}}",
        "viewOriginal": "Voir l'original",
        "like": "J'aime",
        "comment": "Commenter",
        "follow": "Suivre",
        "following": "Abonné",
        "translating": "Traduction...",
        "continueReading": "Lire la suite",
        "showLess": "Afficher moins",
        "pendingApproval": "En attente de validation"
      },
      "coupling": {
        "title": "Accouplement d'animaux",
        "subtitle": "Trouvez le partenaire idéal pour votre animal.",
        "postOffer": "Publier une offre d'accouplement",
        "petGender": "Sexe",
        "male": "Mâle",
        "female": "Femelle",
        "targetPet": "Recherche",
        "responses": "Réponses",
        "respond": "Envoyer une réponse",
        "myPetInfo": "Informations sur mon animal",
        "respondDesc": "Partagez les détails et les photos de votre animal pour répondre à cette offre.",
        "noOffers": "Aucune offre d'accouplement trouvée pour le moment.",
        "success": "Offre d'accouplement publiée avec succès !",
        "responseSuccess": "Réponse envoyée avec succès !",
        "petName": "Nom de l'animal",
        "petBreed": "Race de l'animal",
        "requirements": "Exigences / Préférences",
        "viewResponses": "Voir les réponses ({{count}})",
        "pendingApproval": "Validation en cours"
      },
      "lostAndFound": {
        "title": "Animaux Perdus & Trouvés",
        "subtitle": "Aidez à réunir les animaux perdus avec leurs familles.",
        "searchPlaceholder": "Rechercher par type, lieu...",
        "createPost": "Signaler un Animal",
        "postSuccess": "Annonce envoyée pour validation !",
        "postTitle": "Titre (ex: Golden Retriever perdu)",
        "postContent": "Décrivez l'animal, lieu, date, et contact...",
        "location": "Dernier lieu connu (Ville)",
        "status": { "lost": "Perdu", "found": "Trouvé" },
        "postType": "Type de signalement"
      },
      "footer": {
        "description": "La première destination au Maroc pour l'achat et la vente d'animaux. Des animaux de compagnie au bétail, trouvez votre compagnon idéal en toute confiance.",
        "browse": "Parcourir",
        "quickLinks": "Liens Rapides",
        "support": "Support",
        "rights": "Tous droits réservés.",
        "terms": "Conditions",
        "privacy": "Confidentialité",
        "safety": "Conseils de sécurité",
        "language": "Langue"
      },
      "categories": {
        "all": "Tout",
        "pets": "Animaux de compagnie à vendre",
        "livestock": "Bétail",
        "adoption": "Adoption (Gratuit)",
        "accessories": "Accessoires",
        "pet": "Animal à vendre",
        "accessory": "Accessoires"
      },
      "home": {
        "heroTitle": "Trouvez Votre Parfait",
        "heroSubtitle": "Compagnon Animal",
        "searchPlaceholder": "Rechercher des animaux...",
        "locationPlaceholder": "Localisation",
        "searchButton": "Rechercher",
        "browseCategories": "Parcourir les catégories",
        "viewAll": "Voir tout",
        "latestListings": "Dernières annonces",
        "showingResults": "Affichage de {{count}} résultats",
        "noListingsFound": "Aucune annonce trouvée",
        "adjustFilters": "Essayez d'ajuster vos filtres"
      },
      "admin": {
        "title": "Admin",
        "dashboard": "Tableau de bord",
        "subtitle": "Gérez les utilisateurs, modérez les annonces et surveillez la plateforme.",
        "overview": "Aperçu",
        "listings": "Annonces",
        "users": "Utilisateurs",
        "reports": "Signalements",
        "settings": "Paramètres",
        "totalUsers": "Total Utilisateurs",
        "totalAds": "Total Annonces",
        "pendingReports": "Signalements en attente",
        "status": {
          "pending": "En attente"
        }
      },
      "chat": {
        "title": "Messages",
        "searchPlaceholder": "Rechercher des conversations...",
        "noMessages": "Pas encore de messages",
        "startConversation": "Démarrer une conversation",
        "rateUser": "Évaluer",
        "typeMessage": "Écrivez votre message ici...",
        "conversations": "Vos Conversations",
        "selectChat": "Sélectionnez une discussion pour commencer à messager."
      },
      "profile": {
        "listingsCount": "Annonces",
        "favoritesCount": "Favoris",
        "reviewsCount": "Avis",
        "followersCount": "Abonnés",
        "followingCount": "Abonnements",
        "myListings": "Mes Annonces",
        "savedItems": "Articles Enregistrés",
        "accountSettings": "Paramètres",
        "logout": "Déconnexion",
        "noAds": "Pas encore d'annonces",
        "startSelling": "Commencez à vendre !",
        "personalInfo": "Infos personnelles",
        "displayName": "Nom d'affichage",
        "phoneNumber": "Numéro de téléphone",
        "location": "Localisation",
        "whatsapp": "WhatsApp (Optionnel)",
        "aboutBio": "À propos / Bio",
        "privacyVisibility": "Confidentialité et visibilité",
        "privacyDesc": "Contrôlez les informations visibles par les autres utilisateurs sur vos annonces.",
        "showPhone": "Afficher téléphone",
        "showLocation": "Afficher localisation",
        "showEmail": "Afficher Email",
        "noFavorites": "Pas encore de favoris",
        "saveInterest": "Enregistrez les annonces qui vous intéressent pour les voir ici.",
        "saveChanges": "Enregistrer",
        "saving": "Enregistrement..."
      },
      "login": {
        "welcome": "Bon retour",
        "subtitle": "Rejoignez la Communauté & Marché des Animaux du Maroc",
        "google": "Continuer avec Google",
        "secureAccess": "Accès Sécurisé",
        "emailPlaceholder": "Adresse E-mail",
        "passwordPlaceholder": "Mot de passe",
        "signIn": "Se connecter",
        "signUp": "S'inscrire",
        "noAccount": "Pas encore de compte ?",
        "hasAccount": "Vous avez déjà un compte ?",
        "agreement": "En continuant, vous acceptez les",
        "and": "et la"
      },
      "createListing": {
        "title": "Publier une annonce",
        "subtitle": "Touchez des milliers d'acheteurs à travers le Maroc",
        "photos": "Photos",
        "dragDrop": "Glissez-déposez vos photos ici",
        "orClick": "ou cliquez pour parcourir (jusqu'à 10 photos)",
        "basicInfo": "Informations de base",
        "listingTitle": "Titre de l'annonce",
        "description": "Description",
        "category": "Catégorie",
        "price": "Prix",
        "aiAssist": "Aide IA",
        "aiGenerating": "Génération...",
        "breed": "Race / Type",
        "petType": "Type d'animal",
        "petTypes": {
          "dog": "Chien",
          "cat": "Chat",
          "bird": "Oiseau",
          "fish": "Poisson",
          "sheep": "Mouton",
          "other": "Autre"
        },
        "selectPetType": "Sélectionner le type",
        "selectBreed": "Sélectionner la race",
        "age": "Âge",
        "ageUnits": {
          "days": "Jours",
          "weeks": "Semaines",
          "months": "Mois",
          "years": "Ans"
        },
        "location": "Localisation",
        "contactPreference": "Préférence de contact",
        "cancel": "Annuler",
        "publish": "Publier"
      },
      "listingDetail": {
        "back": "Retour aux résultats",
        "description": "Description",
        "posted": "Publié il y a {{time}}",
        "breed": "Race",
        "age": "Âge",
        "category": "Catégorie",
        "price": "Prix",
        "chat": "Discuter avec le vendeur",
        "favorite": "Favori",
        "saved": "Enregistré",
        "share": "Partager",
        "report": "Signaler cette annonce",
        "sellerInfo": "Informations sur le vendeur",
        "memberSince": "Membre depuis {{year}}",
        "viewOtherAds": "Voir les autres annonces",
        "removeAd": "Supprimer",
        "removeTitle": "Supprimer l'annonce",
        "removeDesc": "Veuillez nous indiquer la raison de la suppression. Cela nous aide à améliorer notre service.",
        "removePlaceholder": "ex: Vendu sur Su9.ma, Vendu ailleurs, Plus disponible...",
        "confirmRemove": "Confirmer la suppression"
      }
      ,
      "termsPage": {
        "title": "Conditions d'utilisation",
        "welcome": "Bienvenue sur Su9.ma. En utilisant notre plateforme, vous acceptez les conditions suivantes :",
        "sections": {
          "purpose": {
            "title": "1. Objet du site",
            "content": "Ce site est une plateforme de petites annonces en ligne dédiée aux animaux (chiens, chats, oiseaux, moutons et poissons d'ornement) au sein du Royaume du Maroc. Son but est de mettre en relation acheteurs et vendeurs. La plateforme ne vend ni n'achète d'animaux directement."
          },
          "role": {
            "title": "2. Rôle de la plateforme",
            "content": "La plateforme n'agit qu'en tant qu'intermédiaire pour la publication d'annonces. Elle ne participe à aucune transaction entre les utilisateurs. Tous les accords, paiements et échanges se font directement entre les utilisateurs en dehors de la plateforme."
          },
          "user": {
            "title": "3. Responsabilité de l'utilisateur",
            "content": "Les utilisateurs sont entièrement responsables de l'exactitude des informations qu'ils publient. Les annonces doivent être véridiques et non trompeuses. Les utilisateurs ne doivent pas publier de contenu faux, frauduleux ou trompeur."
          },
          "allowed": {
            "title": "4. Animaux autorisés",
            "content": "Les catégories suivantes sont autorisées : Chiens, Chats, Oiseaux, Moutons, Poissons d'ornement."
          },
          "prohibitedAnimals": {
            "title": "5. Animaux interdits",
            "content": "Il est strictement interdit de publier des annonces pour : Les espèces protégées ou en voie de disparition, Les animaux sauvages sans autorisation légale, Tout animal interdit par la loi marocaine."
          },
          "prohibitedContent": {
            "title": "6. Contenu interdit",
            "content": "Il est strictement interdit aux utilisateurs de publier : Des annonces frauduleuses ou des arnaques, Des annonces fausses ou trompeuses, Tout contenu offensant, abusif ou illégal, Toute activité violant les lois en vigueur au Maroc."
          },
          "liability": {
            "title": "7. Responsabilité légale",
            "content": "La plateforme n'est pas responsable des transactions ou des litiges entre utilisateurs. Tous les achats, ventes ou échanges sont de la seule responsabilité des utilisateurs concernés. Les utilisateurs sont entièrement responsables de s'assurer que leurs annonces sont conformes aux lois applicables."
          },
          "data": {
            "title": "8. Protection des données",
            "content": "Certaines données personnelles (telles que le numéro de téléphone ou l'e-mail) peuvent être collectées pour permettre la communication entre les utilisateurs. Les données personnelles ne sont ni vendues ni partagées avec des tiers. Le traitement des données est conforme aux lois applicables sur la protection des données personnelles au Maroc et peut être soumis à la supervision de la CNDP."
          },
          "removal": {
            "title": "9. Droit de suppression",
            "content": "La plateforme se réserve le droit de supprimer toute annonce qui enfreint ces conditions sans préavis. La plateforme peut suspendre ou bloquer tout utilisateur qui enfreint les règles."
          },
          "reporting": {
            "title": "10. Signalement des violations",
            "content": "Les utilisateurs peuvent signaler : Des annonces suspectes ou illégales, Des activités frauduleuses, Des contenus inappropriés ou trompeurs."
          },
          "changes": {
            "title": "11. Modification des conditions",
            "content": "Ces conditions d'utilisation peuvent être mises à jour à tout moment. L'utilisation continue du site implique l'acceptation de toute condition mise à jour."
          },
          "acceptance": {
            "title": "12. Acceptation des conditions",
            "content": "En utilisant ce site, vous confirmez que vous avez lu, compris et accepté ces conditions d'utilisation."
          }
        }
      },
      "privacyPage": {
        "title": "Politique de confidentialité",
        "welcome": "Cette politique de confidentialité explique comment su9.ma (« nous », « notre », « la plateforme ») collecte, utilise, stocke et protège les données personnelles.",
        "sections": {
          "introduction": {
            "title": "1. Introduction",
            "content": "La plateforme fonctionne comme un service de petites annonces en ligne pour les animaux au Royaume du Maroc. Son but est de mettre en relation acheteurs et vendeurs."
          },
          "controller": {
            "title": "2. Responsable du traitement",
            "content": "Le responsable du traitement des données est su9.ma. Pour toute question, contactez-nous à Contact@su9.ma."
          },
          "framework": {
            "title": "3. Cadre légal",
            "content": "Nous traitons les données conformément aux lois sur la protection des données au Maroc, aux principes du RGPD et sous la supervision de la CNDP."
          },
          "collect": {
            "title": "4. Informations collectées",
            "content": "Nous collectons les infos fournies par l'utilisateur (nom, téléphone, email, localisation) et les données automatiques (adresse IP, infos appareil)."
          },
          "purpose": {
            "title": "5. Finalité de la collecte",
            "content": "Nous utilisons les données pour gérer les annonces, permettre la communication, améliorer l'expérience et détecter la fraude."
          },
          "basis": {
            "title": "6. Base légale du traitement",
            "content": "Le traitement repose sur le consentement, la nécessité contractuelle, l'intérêt légitime et les obligations légales."
          },
          "sharing": {
            "title": "7. Partage des données",
            "content": "Nous ne vendons pas vos données. Elles sont partagées entre utilisateurs pour les transactions ou avec des prestataires légaux."
          },
          "retention": {
            "title": "8. Conservation des données",
            "content": "Les données sont conservées uniquement le temps nécessaire. Les utilisateurs peuvent demander leur suppression à tout moment."
          },
          "rights": {
            "title": "9. Droits de l'utilisateur",
            "content": "Vous avez un droit d'accès, de rectification, de suppression et d'opposition concernant vos données personnelles."
          },
          "cookies": {
            "title": "10. Cookies et suivi",
            "content": "Nous utilisons des cookies pour améliorer la performance et analyser le trafic. Vous pouvez les désactiver dans vos paramètres."
          },
          "security": {
            "title": "11. Sécurité des données",
            "content": "Nous mettons en œuvre des mesures techniques pour protéger vos données contre tout accès non autorisé."
          },
          "thirdparty": {
            "title": "12. Services tiers",
            "content": "Nous utilisons des tiers pour l'hébergement et l'analyse, tenus de respecter les obligations de protection des données."
          },
          "disclaimer": {
            "title": "13. Clause de non-responsabilité",
            "content": "La plateforme facilite uniquement les annonces. Nous ne sommes pas responsables de la légalité ou de l'état des animaux listés."
          },
          "transfers": {
            "title": "14. Transferts internationaux",
            "content": "En cas de traitement hors Maroc, nous garantissons des mesures de protection appropriées."
          },
          "changes": {
            "title": "15. Modifications",
            "content": "Cette politique peut être mise à jour à tout moment. Les mises à jour seront publiées sur cette page."
          }
        }
      },
      "safetyPage": {
        "title": "Conseils de sécurité",
        "welcome": "Votre sécurité et le bien-être des animaux sont nos priorités. Veuillez suivre ces conseils pour une expérience sécurisée sur Su9.ma.",
        "sections": {
          "general": {
            "title": "1. Règles générales de sécurité",
            "content": "Vérifiez toujours l'identité de l'acheteur ou du vendeur avant tout accord. N'envoyez jamais d'argent à l'avance sans confirmation. Préférez les rencontres en personne."
          },
          "scams": {
            "title": "2. Éviter les arnaques",
            "content": "Ne faites pas confiance aux utilisateurs demandant un paiement avant de montrer l'animal. Signalez immédiatement les utilisateurs suspects."
          },
          "meeting": {
            "title": "3. Pratiques de rencontre",
            "content": "Rencontrez-vous dans un lieu public et sûr pendant la journée. Inspectez soigneusement l'animal avant de conclure la transaction."
          },
          "welfare": {
            "title": "4. Santé et bien-être animal",
            "content": "Demandez les carnets de vaccination. Évitez d'acheter des animaux qui semblent malades ou maltraités. Considérez l'adoption lorsque c'est possible."
          },
          "payments": {
            "title": "5. Paiements",
            "content": "Privilégiez les méthodes de paiement sécurisées. Ne partagez pas vos coordonnées bancaires avec des inconnus."
          },
          "prohibited": {
            "title": "6. Activités interdites",
            "content": "La vente d'animaux protégés est strictement interdite. Tout abus envers les animaux doit être signalé immédiatement."
          },
          "communication": {
            "title": "7. Sécurité des communications",
            "content": "Gardez les communications sur la plateforme. Ne partagez pas d'informations personnelles sensibles inutilement."
          },
          "reporting": {
            "title": "8. Signaler un problème",
            "content": "En cas de comportement suspect ou d'annonce illégale, utilisez le bouton de signalement ou contactez Contact@su9.ma."
          },
          "reminder": {
            "title": "9. Rappel",
            "content": "su9.ma est uniquement une plateforme d'annonces. Nous ne vendons pas d'animaux et ne sommes pas responsables des transactions."
          }
        }
      }
    }
  },
  ar: {
    translation: {
      "nav": {
        "home": "الرئيسية",
        "postAd": "أضف إعلان",
        "buySell": "بيع وشراء",
        "adoption": "تبني",
        "profile": "حسابي",
        "messages": "الرسائل",
        "admin": "الإدارة",
        "login": "دخول / تسجيل",
        "adminSupport": "الدعم الفني",
        "health": "الصحة والنصائح",
        "coupling": "تزاوج",
        "notifications": "الإشعارات",
        "lostAndFound": "مفقودات"
      },
      "health": {
        "title": "صحة الحيوان والمجتمع",
        "subtitle": "شارك تجاربك، قدم نصائح، وساعد المربين الآخرين.",
        "searchPlaceholder": "ابحث عن مشاكل صحية، نصائح...",
        "shareExperience": "شارك تجربة",
        "noPosts": "لم يتم العثور على منشورات.",
        "postSuccess": "تم مشاركة التجربة بنجاح!",
        "postTitle": "عنوان التجربة",
        "postContent": "صف تجربتك أو نصيحتك...",
        "selectAnimal": "اختر نوع الحيوان",
        "translateAction": "ترجمة إلى {{lang}}",
        "viewOriginal": "عرض النص الأصلي",
        "like": "اعجاب",
        "comment": "تعليق",
        "follow": "متابعة",
        "following": "متابع",
        "translating": "جاري الترجمة...",
        "continueReading": "إقرأ المزيد",
        "showLess": "عرض أقل",
        "pendingApproval": "قيد مراجعة الإدارة"
      },
      "coupling": {
        "title": "تزاوج الحيوانات",
        "subtitle": "ابحث عن الشريك المثالي لحيوانك الأليف.",
        "postOffer": "إضافة عرض تزاوج",
        "petGender": "الجنس",
        "male": "ذكر",
        "female": "أنثى",
        "targetPet": "أبحث عن",
        "responses": "الردود",
        "respond": "إرسال رد",
        "myPetInfo": "معلومات حيواني الأليف",
        "respondDesc": "شارك تفاصيل وصور حيوانك الأليف للرد على هذا العرض.",
        "noOffers": "لم يتم العثور على عروض تزاوج بعد.",
        "success": "تم نشر عرض التزاوج بنجاح!",
        "responseSuccess": "تم إرسال الرد بنجاح!",
        "petName": "اسم الأليف",
        "petBreed": "السلالة",
        "requirements": "المتطلبات / التفضيلات",
        "viewResponses": "عرض الردود ({{count}})",
        "pendingApproval": "في انتظار المراجعة"
      },
      "lostAndFound": {
        "title": "حيوانات مفقودة ومعثور عليها",
        "subtitle": "ساعد في لم شمل الحيوانات الأليفة المفقودة مع أسرهم.",
        "searchPlaceholder": "ابحث حسب نوع الحيوان، الموقع...",
        "createPost": "بلغ عن حيوان",
        "postSuccess": "تم إرسال البلاغ للمراجعة بنجاح!",
        "postTitle": "عنوان البلاغ (مثال: كلب جولدن ريتريفر مفقود)",
        "postContent": "صف الحيوان، آخر مكان شوهد فيه، التاريخ، ومعلومات الاتصال...",
        "location": "آخر مكان (المدينة)",
        "status": { "lost": "مفقود", "found": "تم العثور عليه" },
        "postType": "نوع البلاغ"
      },
      "footer": {
        "description": "الوجهة الأولى في المغرب لبيع وشراء الحيوانات. من الأليفة إلى المواشي، اعثر على رفيقك المثالي بكل ثقة وأمان.",
        "browse": "تصفح",
        "quickLinks": "روابط سريعة",
        "support": "الدعم",
        "rights": "جميع الحقوق محفوظة.",
        "terms": "الشروط",
        "privacy": "الخصوصية",
        "safety": "نصائح السلامة",
        "language": "اللغة"
      },
      "categories": {
        "all": "الكل",
        "pets": "حيوانات أليفة للبيع",
        "livestock": "مواشي",
        "adoption": "تبني (مجاني)",
        "accessories": "إكسسوارات",
        "pet": "حيوان للبيع",
        "accessory": "إكسسوارات"
      },
      "home": {
        "heroTitle": "اعثر على",
        "heroSubtitle": "رفيقك المثالي",
        "searchPlaceholder": "البحث عن حيوانات...",
        "locationPlaceholder": "الموقع",
        "searchButton": "بحث",
        "browseCategories": "تصفح الفئات",
        "viewAll": "عرض الكل",
        "latestListings": "أحدث الإعلانات",
        "showingResults": "عرض {{count}} من النتائج",
        "noListingsFound": "لم يتم العثور على إعلانات",
        "adjustFilters": "حاول تعديل فلاتر البحث"
      },
      "admin": {
        "title": "الإدارة",
        "dashboard": "لوحة التحكم",
        "subtitle": "إدارة المستخدمين، مراقبة الإعلانات ومتابعة حالة المنصة.",
        "overview": "نظرة عامة",
        "listings": "الإعلانات",
        "users": "المستخدمون",
        "reports": "البلاغات",
        "settings": "الإعدادات",
        "totalUsers": "إجمالي المستخدمين",
        "totalAds": "إجمالي الإعلانات",
        "pendingReports": "بلاغات قيد الانتظار",
        "status": {
          "pending": "قيد المراجعة"
        }
      },
      "chat": {
        "title": "الرسائل",
        "searchPlaceholder": "البحث في المحادثات...",
        "noMessages": "لا توجد رسائل بعد",
        "startConversation": "ابدأ محادثة",
        "rateUser": "تقييم",
        "typeMessage": "اكتب رسالتك هنا...",
        "conversations": "محادثاتك",
        "selectChat": "اختر محادثة من القائمة للبدء."
      },
      "profile": {
        "listingsCount": "إعلانات",
        "favoritesCount": "المفضلة",
        "reviewsCount": "تقييمات",
        "followersCount": "متابعون",
        "followingCount": "أتابع",
        "myListings": "إعلاناتي",
        "savedItems": "المحفوظات",
        "accountSettings": "الإعدادات",
        "logout": "خروج",
        "noAds": "لا توجد إعلانات",
        "startSelling": "ابدأ البيع اليوم!",
        "personalInfo": "المعلومات الشخصية",
        "displayName": "اسم العرض",
        "phoneNumber": "رقم الهاتف",
        "location": "الموقع",
        "whatsapp": "واتساب (اختياري)",
        "aboutBio": "عني / نبذة",
        "privacyVisibility": "الخصوصية والظهور",
        "privacyDesc": "تحكم في المعلومات التي تظهر للمستخدمين الآخرين في إعلاناتك.",
        "showPhone": "إظهار الهاتف",
        "showLocation": "إظهار الموقع",
        "showEmail": "إظهار البريد",
        "noFavorites": "لا توجد مفضلة بعد",
        "saveInterest": "احفظ الإعلانات التي تهمك لتراها هنا.",
        "saveChanges": "حفظ التغييرات",
        "saving": "جاري الحفظ..."
      },
      "login": {
        "welcome": "مرحباً بعودتك",
        "subtitle": "انضم إلى مجتمع وسوق الحيوانات في المغرب",
        "google": "المتابعة باستخدام جوجل",
        "secureAccess": "دخول آمن",
        "emailPlaceholder": "البريد الإلكتروني",
        "passwordPlaceholder": "كلمة المرور",
        "signIn": "تسجيل الدخول",
        "signUp": "تسجيل جديد",
        "noAccount": "ليس لديك حساب؟",
        "hasAccount": "لديك حساب بالفعل؟",
        "agreement": "من خلال الاستمرار، فإنك توافق على",
        "and": "و"
      },
      "createListing": {
        "title": "أضف إعلان",
        "subtitle": "صل إلى آلاف المشترين في جميع أنحاء المغرب",
        "photos": "الصور",
        "dragDrop": "اسحب وأفلت الصور هنا",
        "orClick": "أو انقر للتصفح (حتى 10 صور)",
        "basicInfo": "معلومات أساسية",
        "listingTitle": "عنوان الإعلان",
        "description": "الوصف",
        "category": "الفئة",
        "price": "السعر",
        "aiAssist": "مساعد الذكاء الاصطناعي",
        "aiGenerating": "جاري التوليد...",
        "breed": "السلالة / النوع",
        "petType": "نوع الحيوان",
        "petTypes": {
          "dog": "كلب",
          "cat": "قط",
          "bird": "طائر",
          "fish": "سمك",
          "sheep": "خروف",
          "other": "آخر"
        },
        "selectPetType": "اختر النوع",
        "selectBreed": "اختر السلالة",
        "age": "العمر",
        "ageUnits": {
          "days": "أيام",
          "weeks": "أسابيع",
          "months": "شهور",
          "years": "سنوات"
        },
        "location": "الموقع",
        "contactPreference": "تفضيل الاتصال",
        "cancel": "إلغاء",
        "publish": "نشر الإعلان"
      },
      "listingDetail": {
        "back": "العودة للنتائج",
        "description": "الوصف",
        "posted": "نُشر منذ {{time}}",
        "breed": "السلالة",
        "age": "العمر",
        "category": "الفئة",
        "price": "السعر",
        "chat": "دردش مع البائع",
        "favorite": "المفضلة",
        "saved": "محفوظ",
        "share": "مشاركة",
        "report": "بلغ عن هذا الإعلان",
        "sellerInfo": "معلومات البائع",
        "memberSince": "عضو منذ {{year}}",
        "viewOtherAds": "شاهد إعلانات البائع الأخرى",
        "removeAd": "حذف الإعلان",
        "removeTitle": "حذف الإعلان",
        "removeDesc": "يرجى إخبارنا بسب حذف هذا الإعلان. هذا يساعدنا على تحسين خدمتنا.",
        "removePlaceholder": "مثال: تم البيع في Su9.ma، تم البيع في مكان آخر، لم يعد متاحاً...",
        "confirmRemove": "تأكيد الحذف"
      }
      ,
      "termsPage": {
        "title": "شروط الاستخدام",
        "welcome": "مرحبًا بكم في Su9.ma. باستخدامكم لموقعنا، فإنكم توافقون على الشروط التالية:",
        "sections": {
          "purpose": {
            "title": "1. الغرض من الموقع",
            "content": "هذا الموقع عبارة عن منصة إعلانات مبوبة عبر الإنترنت مخصصة للحيوانات (الكلاب والقطط والطيور والأغنام وأسماك الزينة) داخل المملكة المغربية. الغرض منه هو الربط بين المشترين والبائعين. المنصة لا تبيع أو تشتري أي حيوانات بشكل مباشر."
          },
          "role": {
            "title": "2. دور المنصة",
            "content": "تعمل المنصة فقط كوسيط لنشر الإعلانات. لا تشارك في أي معاملة بين المستخدمين. تتم جميع الاتفاقات والمدفوعات والتبادلات مباشرة بين المستخدمين خارج المنصة."
          },
          "user": {
            "title": "3. مسؤولية المستخدم",
            "content": "المستخدمون مسؤولون مسؤولية كاملة عن دقة المعلومات التي ينشرونها. يجب أن تكون الإعلانات صادقة وغير مضللة. يجب على المستخدمين عدم نشر محتوى كاذب أو احتيالي أو مخادع."
          },
          "allowed": {
            "title": "4. الحيوانات المسموح بها",
            "content": "الفئات التالية مسموح بها: الكلاب، القطط، الطيور، الأغنام، أسماك الزينة."
          },
          "prohibitedAnimals": {
            "title": "5. الحيوانات المحظورة",
            "content": "يمنع منعا باتا نشر إعلانات عن: الأنواع المحمية أو المهددة بالانقراض، الحيوانات البرية دون ترخيص قانوني، أي حيوانات محظورة بموجب القانون المغربي."
          },
          "prohibitedContent": {
            "title": "6. المحتوى المحظور",
            "content": "يمنع منعا باتا على المستخدمين نشر: إعلانات احتيالية أو وهمية، إعلانات كاذبة أو مضللة، أي محتوى مسيء أو بذيء أو غير قانوني، أي نشاط ينتهك القوانين المعمول بها في المغرب."
          },
          "liability": {
            "title": "7. المسؤولية القانونية",
            "content": "المنصة غير مسؤولة عن أي معاملات أو نزاعات بين المستخدمين. جميع عمليات الشراء أو البيع أو التبادل هي المسؤولية الحصرية للمستخدمين المعنيين. يتحمل المستخدمون المسؤولية الكاملة عن ضمان امتثال إعلاناتهم للقوانين المعمول بها."
          },
          "data": {
            "title": "8. حماية البيانات",
            "content": "قد يتم جمع بعض البيانات الشخصية (مثل رقم الهاتف أو البريد الإلكتروني) لتمكين التواصل بين المستخدمين. لا يتم بيع البيانات الشخصية أو مشاركتها مع أطراف ثالثة. تتوافق معالجة البيانات مع القوانين المعمول بها لحماية البيانات الشخصية في المغرب وقد تخضع لإشراف اللجنة الوطنية لمراقبة حماية المعطيات ذات الطابع الشخصي (CNDP)."
          },
          "removal": {
            "title": "9. الحق في إزالة المحتوى",
            "content": "تحتفظ المنصة بالحق في إزالة أي إعلان ينتهك هذه الشروط دون إشعار مسبق. يجوز للمنصة تعليق أو حظر أي مستخدم ينتهك القواعد."
          },
          "reporting": {
            "title": "10. الإبلاغ عن الانتهاكات",
            "content": "يمكن للمستخدمين الإبلاغ عن: الإعلانات المشبوهة أو غير القانونية، الأنشطة الاحتيالية، المحتوى غير اللائق أو المضلل."
          },
          "changes": {
            "title": "11. التغييرات في الشروط",
            "content": "قد يتم تحديث شروط الاستخدام هذه في أي وقت. الاستمرار في استخدام الموقع يعني قبول أي شروط محدثة."
          },
          "acceptance": {
            "title": "12. قبول الشروط",
            "content": "باستخدامك لهذا الموقع، فإنك تؤكد أنك قد قرأت وفهمت ووافقت على شروط الاستخدام هذه."
          }
        }
      },
      "privacyPage": {
        "title": "سياسة الخصوصية",
        "welcome": "توضح سياسة الخصوصية هذه كيف يقوم موقع su9.ma («نحن»، «نا»، «المنصة») بجمع واستخدام وتخزين وحماية البيانات الشخصية.",
        "sections": {
          "introduction": {
            "title": "1. مقدمة",
            "content": "تعمل المنصة كخدمة إعلانات مبوبة عبر الإنترنت للحيوانات في المملكة المغربية. الغرض منها هو الربط بين المشترين والبائعين."
          },
          "controller": {
            "title": "2. مسؤول البيانات",
            "content": "المسؤول عن معالجة البيانات الشخصية هو su9.ma. للاستفسارات، اتصل بنا عبر Contact@su9.ma."
          },
          "framework": {
            "title": "3. الإطار القانوني",
            "content": "نعالج البيانات وفقاً للقوانين المعمول بها في المغرب، وبمبادئ تتماشى مع GDPR، وتحت إشراف اللجنة الوطنية (CNDP)."
          },
          "collect": {
            "title": "4. المعلومات التي نجمعها",
            "content": "نجمع المعلومات المقدمة من المستخدمين (الاسم، الهاتف، البريد) والبيانات التي يتم جمعها تلقائياً (عنوان IP، معلومات الجهاز)."
          },
          "purpose": {
            "title": "5. الغرض من جمع البيانات",
            "content": "نستخدم البيانات لإدارة الإعلانات، تمكين التواصل، تحسين تجربة المستخدم، كشف الاحتيال، والامتثال للالتزامات القانونية."
          },
          "basis": {
            "title": "6. الأساس القانوني للمعالجة",
            "content": "تعتمد المعالجة على موافقة المستخدم، والضرورة التعاقدية لنشر الإعلانات، والمصالح المشروعة، والالتزامات القانونية."
          },
          "sharing": {
            "title": "7. مشاركة البيانات",
            "content": "نحن لا نبيع بياناتك. يتم مشاركة البيانات بين المستخدمين لإتمام المعاملات أو مع مقدمي الخدمات القانونيين."
          },
          "retention": {
            "title": "8. الاحتفاظ بالبيانات",
            "content": "يتم الاحتفاظ بالبيانات فقط للفترة الضرورية. يمكن للمستخدمين طلب حذف بياناتهم في أي وقت."
          },
          "rights": {
            "title": "9. حقوق المستخدم",
            "content": "للمستخدمين الحق في الوصول إلى بياناتهم، تصحيحها، حذفها، الاعتراض على معالجتها، وسحب الموافقة."
          },
          "cookies": {
            "title": "10. ملفات تعريف الارتباط",
            "content": "نستخدم ملفات تعريف الارتباط لتحسين الأداء وتحليل حركة المرور. يمكنك تعطيلها من إعدادات المتصفح."
          },
          "security": {
            "title": "11. أمن البيانات",
            "content": "نطبق تدابير تقنية لحماية البيانات ضد الوصول غير المصرح به، رغم أن المستخدم يشارك بياناته على مسؤوليته الخاصة."
          },
          "thirdparty": {
            "title": "12. خدمات الطرف الثالث",
            "content": "نستعين بمقدمي خدمات للاستضافة والتحليل، وهم ملزمون باحترام التزامات حماية البيانات."
          },
          "disclaimer": {
            "title": "13. إخلاء المسؤولية",
            "content": "المنصة تسهل القوائم فقط. نحن لسنا مسؤولين عن قانونية أو حالة الحيوانات المعروضة؛ يجب على المستخدمين الامتثال للقوانين المغربية."
          },
          "transfers": {
            "title": "14. التحويلات الدولية",
            "content": "إذا تمت معالجة البيانات خارج المغرب، نضمن وجود ضمانات مناسبة لحماية معلوماتك الشخصية."
          },
          "changes": {
            "title": "15. التغييرات في السياسة",
            "content": "قد نقوم بتحديث هذه السياسة في أي وقت، وسيتم نشر التحديثات على هذه الصفحة."
          }
        }
      },
      "safetyPage": {
        "title": "نصائح السلامة",
        "welcome": "سلامتكم ورفاهية الحيوانات هي أولويتنا القصوى. يرجى اتباع هذه الإرشادات لتجربة آمنة على Su9.ma.",
        "sections": {
          "general": {
            "title": "1. قواعد السلامة العامة",
            "content": "تحقق دائماً من هوية المشتري أو البائع قبل التوصل إلى أي اتفاق. لا ترسل المال أبداً مسبقاً دون تأكيد. فضل اللقاء شخصياً كلما أمكن ذلك."
          },
          "scams": {
            "title": "2. تجنب الاحتيال",
            "content": "لا تثق بالمستخدمين الذين يطلبون الدفع قبل عرض الحيوان. كن حذراً من الصور المعدلة وأبلغ عن الحسابات المشبوهة فوراً."
          },
          "meeting": {
            "title": "3. ممارسات اللقاء الآمن",
            "content": "التقي في مكان عام وآمن خلال النهار. افحص الحيوان جيداً قبل إتمام أي عملية بيع. لا تلتقِ في أماكن معزولة."
          },
          "welfare": {
            "title": "4. صحة الحيوان ورفاهيته",
            "content": "اطلب سجلات التلقيح عند توفرها. افحص حالة الحيوان قبل الشراء وتجنب شراء الحيوانات التي تبدو مريضة."
          },
          "payments": {
            "title": "5. المدفوعات",
            "content": "فضل طرق الدفع الآمنة. تجنب إرسال الأموال عبر روابط مجهولة ولا تشارك بياناتك البنكية مع الغرباء."
          },
          "prohibited": {
            "title": "6. الأنشطة المحظورة",
            "content": "بيع الحيوانات غير القانونية أو المحمية ممنوع تماماً. يجب الإبلاغ عن أي استغلال للحيوانات فوراً."
          },
          "communication": {
            "title": "7. سلامة الاتصالات",
            "content": "حافظ على جميع الاتصالات داخل القنوات الآمنة للمنصة. لا تشارك معلومات شخصية حساسة دون داعٍ."
          },
          "reporting": {
            "title": "8. الإبلاغ عن المشكلات",
            "content": "إذا واجهت أي سلوك مريب، استخدم زر الإبلاغ في الإعلان أو اتصل بفريق الدعم عبر Contact@su9.ma."
          },
          "reminder": {
            "title": "9. تذكير",
            "content": "موقع su9.ma هو منصة للإعلانات المبوبة فقط. نحن لا نبيع الحيوانات ولسنا مسؤولين عن المعاملات بين المستخدمين."
          }
        }
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;