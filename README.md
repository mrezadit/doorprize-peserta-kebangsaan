# Mayday Doorprize - Stadion Benteng Reborn

Aplikasi putaran angka doorprize sederhana untuk perayaan Hari Buruh di Stadion Benteng Reborn. Dirancang dan dipublikasi untuk menangani pengundian dengan fokus pada transparansi dan stabilitas distribusi angka.

## Demo

[https://mrezadit.github.io/mayday-doorprize/](https://mrezadit.github.io/mayday-doorprize/)

## Fitur Teknis

*   **Stabilisator Distribusi**: Menggunakan logika Stratified Sampling untuk memastikan pemenang tersebar rata di seluruh rentang 1 - 10.000. Sistem menyeimbangkan jatah pemenang per 20 draw untuk menghindari penumpukan angka di rentang tertentu.
*   **Secure Random**: Implementasi `window.crypto.getRandomValues()` untuk menjamin acakan tingkat tinggi yang memenuhi standar keamanan kriptografis.
*   **Data Persistence**: Sinkronisasi otomatis ke Local Storage untuk menjaga data pool dan riwayat tetap aman jika terjadi refresh halaman atau gangguan koneksi.
*   **Animasi Reel**: Animasi perpindahan angka menggunakan transisi CSS cubic-bezier untuk efek visual yang natural pada layar besar.
*   **Manajemen Riwayat**: Pencatatan otomatis hasil menang per kategori barang dengan fitur ekspor ke format JSON untuk kebutuhan audit panitia.

## Instalasi dan Penggunaan

1.  **Clone Repository**
    ```bash
    git clone [https://github.com/mrezadit/mayday-doorprize.git](https://github.com/mrezadit/mayday-doorprize.git)
    cd mayday-doorprize
    ```

2.  **Instal Dependensi**
    
    ```bash
    npm install
    ```

3.  **Jalankan Mode Development**
    ```bash
    npm run dev
    ```
