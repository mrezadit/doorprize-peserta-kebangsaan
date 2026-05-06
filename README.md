# Mayday Doorprize

Web app untuk doorprize dengan fokus angka acak dan animasi smooth.

## Demo
[https://mrezadit.github.io/mayday-doorprize/](https://mrezadit.github.io/mayday-doorprize/)

## Algoritma Doorprize

1.  **Pool Data**: Generate array 1 - 10.000 saat start awal.
2.  **Persistence**: Pool dan riwayat menang disimpan di Local Storage agar aman pas refresh.
3.  **Secure Random**: Menggunakan `window.crypto.getRandomValues` yang lebih baik dari logika `Math.random`, agar hasil tidak bisa ditebak.
4.  **Animasi**: Generate 60 angka untuk angka putar dengan CSS `cubic-bezier`.
5.  **Unique Winner**: Nomor yang menang otomatis dihapus dari pool agar tidak menang dua kali.
6.  **History**: Hasil menang dikelompokkan per barang dan bisa diekspor ke JSON.

## Cara Install & Jalankan

1.  **Clone & Masuk Folder**
    ```bash
    git clone [https://github.com/mrezadit/mayday-doorprize.git](https://github.com/mrezadit/mayday-doorprize.git)
    cd mayday-doorprize
    ```

2.  **Instal Dependensi**
    ```bash
    npm install
    ```

3.  **Running Mode Dev**
    ```bash
    npm run dev
    ```