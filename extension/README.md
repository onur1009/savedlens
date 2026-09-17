# SavedLens — Chrome Extension (Manifest V3)

Web sayfalarını, Instagram, TikTok, Twitter/X ve YouTube gönderilerini tek tıkla **SavedLens** kütüphanenize aktarır, kalıcı medya kopyalarını alır ve AI ile özetleyip etiketler.

---

## 🚀 Kurulum (Geliştirici Modu)

1. Tarayıcınızda (Chrome, Brave, Edge) uzantılar sayfasını açın:
   - Chrome / Brave: `chrome://extensions/`
   - Edge: `edge://extensions/`
2. Sağ üst köşedeki **"Geliştirici Modu" (Developer Mode)** anahtarını açın.
3. Sol üstteki **"Paketlenmemiş Öğe Yükle" (Load unpacked)** butonuna tıklayın.
4. Bu projedeki `savedlens/extension/` klasörünü seçin.
5. SavedLens uzantısı tarayıcı araç çubuğunuza eklenecektir! 🎉

---

## ⚡ Kullanım ve Doğrulama

### 1. Senkronizasyon Anahtarınızı (Token) Ekleyin:
1. SavedLens panelinizde **Ayarlar > Chrome Eklentisi** (`/dashboard/settings/sync`) sayfasına gidin.
2. Kişisel **Eşitleme Anahtarınızı (Sync Token)** kopyalayın.
3. Chrome araç çubuğundaki **SavedLens** ikonuna tıklayın ve tokeni yapıştırın (otomatik kaydedilir).

### 2. Aktif Sekmeyi Tek Tıkla Kaydetme:
- Gezindiğiniz herhangi bir web sitesinde, blogda, Twitter tweet'inde veya YouTube videosundayken uzantıya tıklayıp **"✨ Aktif Sekmeyi SavedLens'e Kaydet"** butonuna basın.
- Sayfa arka planda taranır, yapay zeka özeti çıkarılır ve kütüphanenize anında eklenir!

### 3. Instagram Kaydedilenleri Toplu Eşitleme:
1. Tarayıcınızda `instagram.com/<kullanıcı_adınız>/saved/` (Kaydedilenler) sayfasına gidin.
2. Sayfayı biraz aşağı kaydırarak gönderilerin yüklenmesini sağlayın.
3. Uzantı ikonuna tıklayın ve **"📥 Instagram Kaydedilenleri Eşitle"** butonuna basın.
4. Gönderiler topluca taranıp SavedLens veritabanınıza aktarılacaktır.

---

## 🛠️ Mimari ve Veri Formatı

Extension, standart SavedLens payload formatını backend'e iletir:

```json
{
  "bookmarks": [
    {
      "platform": "instagram",
      "external_id": "31948572918239123",
      "permalink": "https://www.instagram.com/p/C-xyz123/",
      "author": {
        "username": "tasarim_gunlugu",
        "full_name": "Tasarım Günlüğü",
        "avatar_url": "https://..."
      },
      "content": {
        "caption": "2026'nın En İyi UI Tasarım Trendleri!",
        "media_type": "carousel",
        "media_urls": ["https://..."]
      },
      "saved_at": "2026-09-17T15:00:00Z"
    }
  ]
}
```
