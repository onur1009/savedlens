import 'server-only'

/**
 * Verilen post URL'inden GERÇEK, doğrudan indirilebilir medya (video/ses)
 * URL'ini çözmeye çalışır. Bulamazsa null döner — asla thumbnail döndürmez.
 *
 * NOT: Instagram/TikTok resmi API'leri bunu doğrudan sağlamaz; bu genellikle
 * ayrı, sürekli bakım gerektiren bir üçüncü parti indirme servisi/kütüphanesi
 * gerektirir (ör. yönetilen bir 'media-extraction' mikroservisi). Bu fonksiyon,
 * o servis entegre edilene kadar YALNIZCA null döndürüp özelliği dürüstçe
 * 'kullanılamıyor' olarak işaretlemelidir — sahte/placeholder veri üretmemelidir.
 */
export async function resolveDirectMediaUrl(_postUrl: string, _platform: string): Promise<string | null> {
  // Gerçek medya indirme mikroservisi entegre edilene kadar bilerek null döndürür.
  // Thumbnail görüntüsünün Whisper'a ses dosyası gibi gönderilmesini engeller.
  return null
}
