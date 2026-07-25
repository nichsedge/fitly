export type Language = 'en' | 'id';
export type Currency = 'IDR' | 'USD' | 'EUR' | 'GBP';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  IDR: 'Rp',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export const translations = {
  en: {
    // Header & Navigation
    appTitle: 'Fitly',
    wardrobe: 'Wardrobe',
    outfits: 'Outfits',
    laundry: 'Laundry',
    calendar: 'Log',
    trips: 'Trips',
    stats: 'Stats',
    add: 'Add',
    settings: 'Settings & Storage',
    offline: 'Offline',

    // Laundry Counter View
    laundryCounter: 'Laundry Counter',
    laundryDesc: 'Track clothing usage since last wash & reset after laundry',
    wearsSinceWash: 'wears since wash',
    wearSinceWash: 'wear since wash',
    washItem: '🧼 Mark Washed',
    washAll: '🧺 Wash All Worn Items',
    washRecommended: '⚠️ Wash Recommended',
    cleanNoWornTitle: 'All Clothes Are Clean',
    cleanNoWornDesc: 'No worn clothes pending laundry right now. Wear an item or outfit to start tracking usage!',

    // Wardrobe View
    searchPlaceholder: 'Search items, brands, tags...',
    items: 'Items',
    categories: 'Categories',
    styles: 'Styles',
    selectMode: 'Select',
    done: 'Done',
    all: 'All',
    allStyles: 'All Styles',
    allStatus: 'All Status',
    ready: 'Ready',
    dirty: 'Dirty',
    cleaning: 'Cleaning',
    laundryBanner: 'item(s) in laundry',
    cleanAllReady: 'Clean All Ready',
    emptyWardrobeTitle: 'Your Wardrobe is Empty',
    emptyWardrobeDesc: 'Start by adding your clothes or load sample items to explore. Everything is stored 100% locally on your device.',
    addFirstItem: '+ Add Your First Item',
    loadSampleWardrobe: '✨ Load Sample Wardrobe',
    noItemsFound: 'No items found',

    // Add Item View
    addItemTitle: 'Add Clothing Item',
    addItemDesc: 'Take photos or upload from gallery (multi-select supported)',
    photos: 'Photos',
    maxPhotos: '5 photos max',
    tapAddPhoto: 'Tap to add photo(s)',
    autoCompressed: 'Auto-compressed',
    tapPickColor: '🎯 Tap on any photo to pick a color',
    nameLabel: 'Name',
    namePlaceholder: 'e.g. White Oxford Shirt',
    brandLabel: 'Brand',
    brandPlaceholder: "e.g. Uniqlo, Levi's",
    priceLabel: 'Price',
    purchaseDate: 'Purchase Date',
    conditionLabel: 'Condition',
    materialLabel: 'Material',
    materialPlaceholder: 'e.g. 100% Cotton',
    careLabel: 'Care Info',
    carePlaceholder: 'e.g. Cold machine wash',
    categoryLabel: 'Category',
    colorLabel: 'Color',
    styleTagsLabel: 'Style Tags',
    newTag: '＋ New Tag',
    cancel: 'Cancel',
    addToWardrobe: '✓ Add to Wardrobe',
    saving: 'Saving…',

    // Outfit Builder & View
    buildOutfit: '✨ Build Outfit',
    shuffleLook: '🎲 Shuffle Look',
    smartLookSuggestion: '💡 Smart Look Suggestion',
    refresh: '🔄 Refresh',
    saveLook: '+ Save Look',
    savedOutfits: 'Saved Outfits',
    noOutfitsTitle: 'No outfits yet',
    noOutfitsDesc: 'Build your first outfit or tap Shuffle Look above',
    addMinItems: 'Add at least 2 items to your wardrobe to start building looks',

    // Item Detail
    costPerWear: 'Cost per Wear',
    greatValue: '★ Great Value',
    purchased: 'Purchased',
    timesWorn: 'Times Worn',
    addedDate: 'Added',
    deleteItem: 'Delete Item',
    confirmDelete: 'Confirm Delete?',
    wearToday: '⚡ Wore This Today',

    // Settings Modal
    dataManagement: 'Data Management',
    exportBackup: '📥 Backup Wardrobe JSON',
    restoreBackup: '📤 Restore Wardrobe',
    manageTags: '🏷️ Manage Style Tags',
    localAppStatus: 'Local-First App Status',
    localStatusDesc: '100% stored in browser IndexedDB. No external servers or API calls are used.',
    installAndroid: '📱 Install Fitly on Android',
    languageLabel: 'Language / Bahasa',
    currencyLabel: 'Currency',
    deviceStorageUsed: 'Device Storage Used',

    // Conditions
    condNew: 'New',
    condExcellent: 'Excellent',
    condGood: 'Good',
    condFair: 'Fair',
    condPoor: 'Poor',
    condRepair: 'Needs Repair',
  },
  id: {
    // Header & Navigation
    appTitle: 'Fitly',
    wardrobe: 'Pakaian',
    outfits: 'Setelan',
    laundry: 'Cucian',
    calendar: 'Jurnal',
    trips: 'Perjalanan',
    stats: 'Statistik',
    add: 'Tambah',
    settings: 'Pengaturan & Penyimpanan',
    offline: 'Luring',

    // Laundry Counter View
    laundryCounter: 'Penghitung Cucian',
    laundryDesc: 'Lacak berapa kali pakaian dipakai sejak dicuci & reset setelah dicuci',
    wearsSinceWash: 'kali dipakai sejak dicuci',
    wearSinceWash: 'kali dipakai sejak dicuci',
    washItem: '🧼 Sudah Dicuci',
    washAll: '🧺 Cuci Semua Pakaian',
    washRecommended: '⚠️ Disarankan Dicuci',
    cleanNoWornTitle: 'Semua Pakaian Bersih',
    cleanNoWornDesc: 'Tidak ada pakaian yang baru dipakai. Pakai pakaian atau setelan untuk melacak pemakaian di sini!',

    // Wardrobe View
    searchPlaceholder: 'Cari pakaian, merek, tag...',
    items: 'Pakaian',
    categories: 'Kategori',
    styles: 'Gaya',
    selectMode: 'Pilih',
    done: 'Selesai',
    all: 'Semua',
    allStyles: 'Semua Gaya',
    allStatus: 'Semua Status',
    ready: 'Siap Pakai',
    dirty: 'Kotor',
    cleaning: 'Dicuci',
    laundryBanner: 'pakaian kotor / cuci',
    cleanAllReady: 'Bersihkan Semua',
    emptyWardrobeTitle: 'Lemari Pakaian Kosong',
    emptyWardrobeDesc: 'Mulai dengan menambahkan pakaian Anda atau muat contoh pakaian. Semua data tersimpan 100% lokal di perangkat Anda.',
    addFirstItem: '+ Tambah Pakaian Pertama',
    loadSampleWardrobe: '✨ Muat Contoh Pakaian',
    noItemsFound: 'Pakaian tidak ditemukan',

    // Add Item View
    addItemTitle: 'Tambah Pakaian Baru',
    addItemDesc: 'Ambil foto atau pilih dari galeri (bisa pilih beberapa foto sekaligus)',
    photos: 'Foto Pakaian',
    maxPhotos: 'Maksimal 5 foto',
    tapAddPhoto: 'Ketuk untuk tambah foto',
    autoCompressed: 'Terkompresi otomatis',
    tapPickColor: '🎯 Ketuk foto untuk memilih warna otomatis',
    nameLabel: 'Nama Pakaian',
    namePlaceholder: 'misal. Kemeja Putih Uniqlo',
    brandLabel: 'Merek',
    brandPlaceholder: 'misal. Uniqlo, Erigo',
    priceLabel: 'Harga',
    purchaseDate: 'Tanggal Beli',
    conditionLabel: 'Kondisi',
    materialLabel: 'Bahan / Material',
    materialPlaceholder: 'misal. Katun 100%',
    careLabel: 'Perawatan',
    carePlaceholder: 'misal. Cuci pakai air dingin',
    categoryLabel: 'Kategori',
    colorLabel: 'Warna Utama',
    styleTagsLabel: 'Tag Gaya',
    newTag: '＋ Tag Baru',
    cancel: 'Batal',
    addToWardrobe: '✓ Simpan ke Lemari',
    saving: 'Menyimpan…',

    // Outfit Builder & View
    buildOutfit: '✨ Buat Setelan Baru',
    shuffleLook: '🎲 Acak Setelan',
    smartLookSuggestion: '💡 Rekomendasi Setelan Hari Ini',
    refresh: '🔄 Acak Lagi',
    saveLook: '+ Simpan Setelan',
    savedOutfits: 'Setelan Tersimpan',
    noOutfitsTitle: 'Belum ada setelan',
    noOutfitsDesc: 'Buat setelan pertama Anda atau ketuk Acak Setelan di atas',
    addMinItems: 'Tambahkan minimal 2 pakaian ke lemari untuk mulai membuat setelan',

    // Item Detail
    costPerWear: 'Biaya per Pemakaian',
    greatValue: '★ Hemat Sekali',
    purchased: 'Dibeli Pada',
    timesWorn: 'Total Dipakai',
    addedDate: 'Ditambahkan',
    deleteItem: 'Hapus Pakaian',
    confirmDelete: 'Yakin Hapus?',
    wearToday: '⚡ Pakai Hari Ini',

    // Settings Modal
    dataManagement: 'Manajemen Data',
    exportBackup: '📥 Cadangkan Data (JSON)',
    restoreBackup: '📤 Pulihkan Data',
    manageTags: '🏷️ Kelola Tag Gaya',
    localAppStatus: 'Status Aplikasi Lokal',
    localStatusDesc: '100% tersimpan di IndexedDB browser Anda. Tanpa server atau internet.',
    installAndroid: '📱 Pasang Fitly di Android',
    languageLabel: 'Bahasa / Language',
    currencyLabel: 'Mata Uang / Currency',
    deviceStorageUsed: 'Penyimpanan Perangkat Digunakan',

    // Conditions
    condNew: 'Baru',
    condExcellent: 'Sangat Bagus',
    condGood: 'Bagus',
    condFair: 'Cukup',
    condPoor: 'Agak Rusak',
    condRepair: 'Butuh Perbaikan',
  }
};

export function formatCurrency(amount: number | undefined | null, currency: Currency = 'IDR'): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '—';
  
  if (currency === 'IDR') {
    return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
  }

  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(amount);
  }

  if (currency === 'EUR') {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
    }).format(amount);
  }

  if (currency === 'GBP') {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      maximumFractionDigits: 2,
    }).format(amount);
  }

  return `${CURRENCY_SYMBOLS[currency]} ${amount.toLocaleString()}`;
}
