# SavedLens — Chrome Extension (Manifest V3)

Instagram ve diğer sosyal platformlardaki kaydedilen gönderileri tek tıkla **SavedLens** kütüphanenize aktarır, kalıcı medya kopyalarını alır ve AI ile etiketler.

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

## ⚡ Kullanım

### A. Instagram'dan Gerçek Senkronizasyon:
1. Tarayıcınızda `instagram.com/<kullanıcı_adınız>/saved/` (Kaydedilenler) sayfasına gidin.
2. Sayfayı biraz aşağı kaydırarak gönderilerin yüklenmesini sağlayın.
3. Araç çubuğundaki **SavedLens Sync** uzantı ikonuna tıklayın.
4. **"📥 Instagram Kaydedilenleri Eşitle"** butonuna basın.
5. Gönderiler taranıp yerel veya bulut SavedLens veritabanınıza aktarılacaktır.

### B. Çevrimdışı / Hızlı Test:
1. Herhangi bir sayfadayken uzantı ikonuna tıklayın.
2. **"⚡ Örnek Veri ile Test Eşitlemesi"** butonuna basın.
3. `http://localhost:3000/api/v1/sync/instagram` endpoint'i test edilecek ve başarılı sonucu ekranda göreceksiniz.

---

## 🛠️ Mimari ve Veri Formatı

Extension, Instagram'ın DOM ve GraphQL isteklerini dinleyerek aşağıdaki standart Dewey payload formatını SavedLens backend'ine iletir:

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
      "saved_at": "2026-09-16T15:00:00Z"
    }
  ]
}
```
