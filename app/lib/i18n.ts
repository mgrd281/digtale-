// Admin UI internationalisation. German is the source language; the others
// cover the major European languages plus Ukrainian and Arabic (RTL).

export const LOCALES: { code: string; label: string }[] = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "nl", label: "Nederlands" },
  { code: "pl", label: "Polski" },
  { code: "pt", label: "Português" },
  { code: "uk", label: "Українська" },
  { code: "ar", label: "العربية" },
];

export type TKey =
  | "nav.overview"
  | "nav.products"
  | "nav.orders"
  | "nav.settings"
  | "welcome.title"
  | "welcome.subtitle"
  | "welcome.f1"
  | "welcome.f2"
  | "welcome.f3"
  | "welcome.f4"
  | "welcome.selectLang"
  | "welcome.start"
  | "dash.manage"
  | "dash.glance"
  | "dash.products"
  | "dash.delivered"
  | "dash.pending"
  | "dash.failed"
  | "products.title"
  | "products.sync"
  | "products.active"
  | "products.notActivated"
  | "products.search"
  | "products.manage"
  | "products.sold30";

type Dict = Record<TKey, string>;

const de: Dict = {
  "nav.overview": "Übersicht",
  "nav.products": "Produkte",
  "nav.orders": "Bestellungen",
  "nav.settings": "Einstellungen",
  "welcome.title": "Willkommen bei KARINEX",
  "welcome.subtitle": "Mit KARINEX ist der Verkauf digitaler Produkte einfach.",
  "welcome.f1": "Schlüssel & Download-Links sofort nach dem Kauf senden",
  "welcome.f2": "Pro Produkt: Schlüssel, Links und eigene Nachricht",
  "welcome.f3": "Alles an Ihre Marke anpassen",
  "welcome.f4": "Lieferung auch bei Vorkasse möglich",
  "welcome.selectLang": "Sprache wählen",
  "welcome.start": "Los geht's",
  "dash.manage": "Produkte verwalten",
  "dash.glance": "Auf einen Blick",
  "dash.products": "Produkte",
  "dash.delivered": "Ausgeliefert",
  "dash.pending": "In Bearbeitung",
  "dash.failed": "Fehlgeschlagen",
  "products.title": "Digitale Produkte",
  "products.sync": "Mit Shopify synchronisieren",
  "products.active": "Aktive Produkte",
  "products.notActivated": "Noch nicht aktiviert",
  "products.search": "Produkt suchen …",
  "products.manage": "Verwalten",
  "products.sold30": "Verkauft (30 Tage)",
};

const en: Dict = {
  "nav.overview": "Overview",
  "nav.products": "Products",
  "nav.orders": "Orders",
  "nav.settings": "Settings",
  "welcome.title": "Welcome to KARINEX",
  "welcome.subtitle": "With KARINEX, selling digital products is easy.",
  "welcome.f1": "Send keys & download links instantly after checkout",
  "welcome.f2": "Per product: keys, links and a custom message",
  "welcome.f3": "Customize everything to match your brand",
  "welcome.f4": "Delivery on prepayment (Vorkasse) too",
  "welcome.selectLang": "Select your language",
  "welcome.start": "Get started",
  "dash.manage": "Manage products",
  "dash.glance": "At a glance",
  "dash.products": "Products",
  "dash.delivered": "Delivered",
  "dash.pending": "In progress",
  "dash.failed": "Failed",
  "products.title": "Digital products",
  "products.sync": "Sync with Shopify",
  "products.active": "Active products",
  "products.notActivated": "Not yet set up",
  "products.search": "Search product …",
  "products.manage": "Manage",
  "products.sold30": "Sold (30 days)",
};

const fr: Dict = {
  "nav.overview": "Aperçu",
  "nav.products": "Produits",
  "nav.orders": "Commandes",
  "nav.settings": "Paramètres",
  "welcome.title": "Bienvenue chez KARINEX",
  "welcome.subtitle": "Avec KARINEX, vendre des produits numériques est simple.",
  "welcome.f1": "Envoyez clés et liens de téléchargement dès l'achat",
  "welcome.f2": "Par produit : clés, liens et message personnalisé",
  "welcome.f3": "Personnalisez tout à votre marque",
  "welcome.f4": "Livraison aussi en prépaiement",
  "welcome.selectLang": "Choisissez votre langue",
  "welcome.start": "Commencer",
  "dash.manage": "Gérer les produits",
  "dash.glance": "En un coup d'œil",
  "dash.products": "Produits",
  "dash.delivered": "Livré",
  "dash.pending": "En cours",
  "dash.failed": "Échoué",
  "products.title": "Produits numériques",
  "products.sync": "Synchroniser avec Shopify",
  "products.active": "Produits actifs",
  "products.notActivated": "Pas encore configuré",
  "products.search": "Rechercher un produit …",
  "products.manage": "Gérer",
  "products.sold30": "Vendu (30 jours)",
};

const es: Dict = {
  "nav.overview": "Resumen",
  "nav.products": "Productos",
  "nav.orders": "Pedidos",
  "nav.settings": "Ajustes",
  "welcome.title": "Bienvenido a KARINEX",
  "welcome.subtitle": "Con KARINEX, vender productos digitales es fácil.",
  "welcome.f1": "Envía claves y enlaces de descarga al instante tras la compra",
  "welcome.f2": "Por producto: claves, enlaces y mensaje propio",
  "welcome.f3": "Personaliza todo según tu marca",
  "welcome.f4": "Entrega también con pago por adelantado",
  "welcome.selectLang": "Selecciona tu idioma",
  "welcome.start": "Empezar",
  "dash.manage": "Gestionar productos",
  "dash.glance": "De un vistazo",
  "dash.products": "Productos",
  "dash.delivered": "Entregado",
  "dash.pending": "En curso",
  "dash.failed": "Fallido",
  "products.title": "Productos digitales",
  "products.sync": "Sincronizar con Shopify",
  "products.active": "Productos activos",
  "products.notActivated": "Aún no configurado",
  "products.search": "Buscar producto …",
  "products.manage": "Gestionar",
  "products.sold30": "Vendido (30 días)",
};

const it: Dict = {
  "nav.overview": "Panoramica",
  "nav.products": "Prodotti",
  "nav.orders": "Ordini",
  "nav.settings": "Impostazioni",
  "welcome.title": "Benvenuto in KARINEX",
  "welcome.subtitle": "Con KARINEX vendere prodotti digitali è semplice.",
  "welcome.f1": "Invia chiavi e link di download subito dopo l'acquisto",
  "welcome.f2": "Per prodotto: chiavi, link e messaggio personalizzato",
  "welcome.f3": "Personalizza tutto in base al tuo marchio",
  "welcome.f4": "Consegna anche con pagamento anticipato",
  "welcome.selectLang": "Seleziona la lingua",
  "welcome.start": "Inizia",
  "dash.manage": "Gestisci prodotti",
  "dash.glance": "In sintesi",
  "dash.products": "Prodotti",
  "dash.delivered": "Consegnato",
  "dash.pending": "In corso",
  "dash.failed": "Fallito",
  "products.title": "Prodotti digitali",
  "products.sync": "Sincronizza con Shopify",
  "products.active": "Prodotti attivi",
  "products.notActivated": "Non ancora configurato",
  "products.search": "Cerca prodotto …",
  "products.manage": "Gestisci",
  "products.sold30": "Venduto (30 giorni)",
};

const nl: Dict = {
  "nav.overview": "Overzicht",
  "nav.products": "Producten",
  "nav.orders": "Bestellingen",
  "nav.settings": "Instellingen",
  "welcome.title": "Welkom bij KARINEX",
  "welcome.subtitle": "Met KARINEX is digitale producten verkopen eenvoudig.",
  "welcome.f1": "Verstuur sleutels en downloadlinks direct na aankoop",
  "welcome.f2": "Per product: sleutels, links en eigen bericht",
  "welcome.f3": "Pas alles aan je merk aan",
  "welcome.f4": "Levering ook bij vooruitbetaling",
  "welcome.selectLang": "Kies je taal",
  "welcome.start": "Aan de slag",
  "dash.manage": "Producten beheren",
  "dash.glance": "In één oogopslag",
  "dash.products": "Producten",
  "dash.delivered": "Geleverd",
  "dash.pending": "In behandeling",
  "dash.failed": "Mislukt",
  "products.title": "Digitale producten",
  "products.sync": "Synchroniseren met Shopify",
  "products.active": "Actieve producten",
  "products.notActivated": "Nog niet ingesteld",
  "products.search": "Product zoeken …",
  "products.manage": "Beheren",
  "products.sold30": "Verkocht (30 dagen)",
};

const pl: Dict = {
  "nav.overview": "Przegląd",
  "nav.products": "Produkty",
  "nav.orders": "Zamówienia",
  "nav.settings": "Ustawienia",
  "welcome.title": "Witamy w KARINEX",
  "welcome.subtitle": "Z KARINEX sprzedaż produktów cyfrowych jest prosta.",
  "welcome.f1": "Wysyłaj klucze i linki do pobrania od razu po zakupie",
  "welcome.f2": "Na produkt: klucze, linki i własna wiadomość",
  "welcome.f3": "Dostosuj wszystko do swojej marki",
  "welcome.f4": "Dostawa także przy przedpłacie",
  "welcome.selectLang": "Wybierz język",
  "welcome.start": "Rozpocznij",
  "dash.manage": "Zarządzaj produktami",
  "dash.glance": "W skrócie",
  "dash.products": "Produkty",
  "dash.delivered": "Dostarczone",
  "dash.pending": "W toku",
  "dash.failed": "Nieudane",
  "products.title": "Produkty cyfrowe",
  "products.sync": "Synchronizuj z Shopify",
  "products.active": "Aktywne produkty",
  "products.notActivated": "Jeszcze nie skonfigurowano",
  "products.search": "Szukaj produktu …",
  "products.manage": "Zarządzaj",
  "products.sold30": "Sprzedano (30 dni)",
};

const pt: Dict = {
  "nav.overview": "Visão geral",
  "nav.products": "Produtos",
  "nav.orders": "Pedidos",
  "nav.settings": "Configurações",
  "welcome.title": "Bem-vindo à KARINEX",
  "welcome.subtitle": "Com a KARINEX, vender produtos digitais é fácil.",
  "welcome.f1": "Envie chaves e links de download logo após a compra",
  "welcome.f2": "Por produto: chaves, links e mensagem personalizada",
  "welcome.f3": "Personalize tudo de acordo com a sua marca",
  "welcome.f4": "Entrega também com pagamento antecipado",
  "welcome.selectLang": "Selecione o seu idioma",
  "welcome.start": "Começar",
  "dash.manage": "Gerir produtos",
  "dash.glance": "Resumo",
  "dash.products": "Produtos",
  "dash.delivered": "Entregue",
  "dash.pending": "Em curso",
  "dash.failed": "Falhou",
  "products.title": "Produtos digitais",
  "products.sync": "Sincronizar com Shopify",
  "products.active": "Produtos ativos",
  "products.notActivated": "Ainda não configurado",
  "products.search": "Procurar produto …",
  "products.manage": "Gerir",
  "products.sold30": "Vendido (30 dias)",
};

const uk: Dict = {
  "nav.overview": "Огляд",
  "nav.products": "Товари",
  "nav.orders": "Замовлення",
  "nav.settings": "Налаштування",
  "welcome.title": "Ласкаво просимо до KARINEX",
  "welcome.subtitle": "З KARINEX продавати цифрові товари легко.",
  "welcome.f1": "Надсилайте ключі та посилання на завантаження одразу після покупки",
  "welcome.f2": "Для кожного товару: ключі, посилання та власне повідомлення",
  "welcome.f3": "Налаштуйте все під свій бренд",
  "welcome.f4": "Доставка також за передоплатою",
  "welcome.selectLang": "Виберіть мову",
  "welcome.start": "Почати",
  "dash.manage": "Керувати товарами",
  "dash.glance": "Коротко",
  "dash.products": "Товари",
  "dash.delivered": "Доставлено",
  "dash.pending": "В обробці",
  "dash.failed": "Помилка",
  "products.title": "Цифрові товари",
  "products.sync": "Синхронізувати з Shopify",
  "products.active": "Активні товари",
  "products.notActivated": "Ще не налаштовано",
  "products.search": "Пошук товару …",
  "products.manage": "Керувати",
  "products.sold30": "Продано (30 днів)",
};

const ar: Dict = {
  "nav.overview": "نظرة عامة",
  "nav.products": "المنتجات",
  "nav.orders": "الطلبات",
  "nav.settings": "الإعدادات",
  "welcome.title": "مرحباً بك في KARINEX",
  "welcome.subtitle": "مع KARINEX، بيع المنتجات الرقمية سهل.",
  "welcome.f1": "أرسل المفاتيح وروابط التحميل فوراً بعد الشراء",
  "welcome.f2": "لكل منتج: مفاتيح وروابط ورسالة مخصّصة",
  "welcome.f3": "خصّص كل شيء ليناسب علامتك التجارية",
  "welcome.f4": "التسليم متاح أيضاً للدفع المسبق (Vorkasse)",
  "welcome.selectLang": "اختر لغتك",
  "welcome.start": "ابدأ الآن",
  "dash.manage": "إدارة المنتجات",
  "dash.glance": "نظرة سريعة",
  "dash.products": "المنتجات",
  "dash.delivered": "تم التسليم",
  "dash.pending": "قيد المعالجة",
  "dash.failed": "فشل",
  "products.title": "المنتجات الرقمية",
  "products.sync": "المزامنة مع Shopify",
  "products.active": "المنتجات المفعّلة",
  "products.notActivated": "غير مفعّلة بعد",
  "products.search": "ابحث عن منتج …",
  "products.manage": "إدارة",
  "products.sold30": "المباع (30 يوماً)",
};

const DICTS: Record<string, Dict> = { de, en, fr, es, it, nl, pl, pt, uk, ar };

export function isRtl(locale: string): boolean {
  return locale === "ar";
}

export function t(locale: string, key: TKey): string {
  return DICTS[locale]?.[key] ?? de[key];
}
