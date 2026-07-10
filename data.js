/* ==========================================================
   DATA.JS — Data Puzzle Angka Ceria 11-20
   ==========================================================
   =========================================
   EDIT KONTEN DI SINI
   =========================================
   Guru / admin dapat mengganti gambar, jumlah keping,
   atau kalimat instruksi suara di file ini tanpa perlu
   menyentuh file lainnya.

   - image   : path ke gambar angka (PNG, disarankan persegi)
   - pieces  : 4 (bentuk sederhana) atau 6 (bentuk lebih kompleks)
   - grid    : susunan potongan [baris, kolom] — baris*kolom harus = pieces
   - voice   : kalimat yang akan diucapkan saat puzzle ini dimulai
   ========================================================== */

const PUZZLES = [
  { number: 11, image: "assets/numbers/11.png", pieces: 4, grid: [2, 2], voice: "Susun puzzle angka sebelas." },
  { number: 12, image: "assets/numbers/12.png", pieces: 4, grid: [2, 2], voice: "Susun puzzle angka dua belas." },
  { number: 13, image: "assets/numbers/13.png", pieces: 6, grid: [2, 3], voice: "Susun puzzle angka tiga belas." },
  { number: 14, image: "assets/numbers/14.png", pieces: 4, grid: [2, 2], voice: "Susun puzzle angka empat belas." },
  { number: 15, image: "assets/numbers/15.png", pieces: 6, grid: [2, 3], voice: "Susun puzzle angka lima belas." },
  { number: 16, image: "assets/numbers/16.png", pieces: 4, grid: [2, 2], voice: "Susun puzzle angka enam belas." },
  { number: 17, image: "assets/numbers/17.png", pieces: 6, grid: [2, 3], voice: "Susun puzzle angka tujuh belas." },
  { number: 18, image: "assets/numbers/18.png", pieces: 4, grid: [2, 2], voice: "Susun puzzle angka delapan belas." },
  { number: 19, image: "assets/numbers/19.png", pieces: 6, grid: [2, 3], voice: "Susun puzzle angka sembilan belas." },
  { number: 20, image: "assets/numbers/20.png", pieces: 4, grid: [2, 2], voice: "Susun puzzle angka dua puluh." },
];

/* Kalimat pujian acak setelah semua keping benar tersusun */
const PRAISE_LINES = ["Hebat.", "Bagus sekali.", "Kamu pintar.", "Luar biasa."];

/* Skrip suara halaman-halaman lain */
const VOICE_LINES = {
  splash: "Halo teman-teman. Selamat datang di Puzzle Angka Ceria. Hari ini kita akan belajar angka sebelas sampai dua puluh. Tekan tombol Mulai untuk bermain.",
  tutorial: "Seret potongan puzzle ke tempat yang benar. Jika sudah pas, potongan akan menempel sendiri.",
  puzzleDone: "Hebat. Sekarang kita lanjut ke angka berikutnya.",
  gameDone: "Selamat. Kamu berhasil menyusun semua angka. Sampai jumpa lagi.",
};

/* Jangan diubah — dipakai oleh modul lain */
if (typeof module !== "undefined") {
  module.exports = { PUZZLES, PRAISE_LINES, VOICE_LINES };
}
