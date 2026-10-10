import React, { useState } from 'react';
import { 
  X, 
  Layers, 
  FileCode2, 
  Database, 
  ShieldCheck, 
  Smartphone, 
  Cloud, 
  Check, 
  Copy,
  Terminal
} from 'lucide-react';

interface AndroidArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidArchitectureModal: React.FC<AndroidArchitectureModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'gradle' | 'compose' | 'room' | 'firebase'>('architecture');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const gradleCode = `// app/build.gradle.kts (Kotlin DSL)
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
    alias(libs.plugins.google.services)
}

android {
    namespace = "id.kebonkangkung.digitalrw03"
    compileSdk = 35

    defaultConfig {
        applicationId = "id.kebonkangkung.digitalrw03"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    // Jetpack Compose & Material 3
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.navigation.compose)

    // Android Architecture Components & Lifecycle
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)

    // Local Database - Room with Coroutines & Flow
    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)

    // Firebase (Auth, Firestore, Storage, Cloud Messaging)
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.auth.ktx)
    implementation(libs.firebase.firestore.ktx)
    implementation(libs.firebase.storage.ktx)
    implementation(libs.firebase.messaging.ktx)

    // Dependency Injection - Hilt
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.androidx.hilt.navigation.compose)

    // Image Loading & Utilities
    implementation(libs.coil.compose)
    implementation(libs.kotlinx.coroutines.android)
}`;

  const composeScreenCode = `// ui/screens/dashboard/DashboardRwScreen.kt
package id.kebonkangkung.digitalrw03.ui.screens.dashboard

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardRwScreen(
    viewModel: DashboardRwViewModel = hiltViewModel(),
    onNavigateToWarga: () -> Unit,
    onNavigateToSurat: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("RW.03 Kebon Kangkung") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            )
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                StatCardRow(
                    totalWarga = uiState.totalWarga,
                    totalKk = uiState.totalKk,
                    suratPending = uiState.suratPending
                )
            }
            item {
                ChartWargaPerRt(data = uiState.wargaPerRt)
            }
            item {
                RecentComplaintsSection(
                    complaints = uiState.recentComplaints
                )
            }
        }
    }
}`;

  const roomDaoCode = `// data/local/dao/ResidentDao.kt
package id.kebonkangkung.digitalrw03.data.local.dao

import androidx.room.*
import id.kebonkangkung.digitalrw03.data.local.entity.ResidentEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ResidentDao {
    @Query("SELECT * FROM residents ORDER BY namaLengkap ASC")
    fun getAllResidents(): Flow<List<ResidentEntity>>

    @Query("SELECT * FROM residents WHERE rt = :rt ORDER BY namaLengkap ASC")
    fun getResidentsByRt(rt: String): Flow<List<ResidentEntity>>

    @Query("SELECT * FROM residents WHERE NIK = :nik LIMIT 1")
    suspend fun getResidentByNik(nik: String): ResidentEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertResidents(residents: List<ResidentEntity>)

    @Update
    suspend fun updateResident(resident: ResidentEntity)

    @Delete
    suspend fun deleteResident(resident: ResidentEntity)
}`;

  const firestoreRulesCode = `// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    
    function getUserRt() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.RT;
    }
    
    function isSuperAdmin() {
      return isAuthenticated() && getUserRole() == 'super_admin';
    }
    
    function isKetuaRw() {
      return isAuthenticated() && getUserRole() == 'ketua_rw';
    }
    
    function isPengurusRt(rt) {
      return isAuthenticated() && getUserRole() == 'pengurus_rt' && getUserRt() == rt;
    }

    // Residents collection: NIK protection & RT isolation
    match /residents/{residentId} {
      allow read: if isAuthenticated() && (
        isSuperAdmin() || 
        isKetuaRw() || 
        isPengurusRt(resource.data.rt) ||
        resource.data.NIK == request.auth.token.nik
      );
      allow create, update: if isSuperAdmin() || isKetuaRw() || isPengurusRt(request.resource.data.rt);
      allow delete: if isSuperAdmin() || isKetuaRw();
    }

    // Letters collection
    match /letters/{letterId} {
      allow read: if isAuthenticated() && (
        resource.data.pemohonId == request.auth.uid ||
        isSuperAdmin() || isKetuaRw() || isPengurusRt(resource.data.rt)
      );
      allow create: if isAuthenticated();
      allow update: if isSuperAdmin() || isKetuaRw() || isPengurusRt(resource.data.rt);
    }

    // Announcements
    match /announcements/{announcementId} {
      allow read: if isAuthenticated();
      allow write: if isSuperAdmin() || isKetuaRw() || getUserRole() == 'pengurus_rt';
    }
  }
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Arsitektur Produksi Android (Kotlin & Jetpack Compose)</h2>
              <p className="text-xs text-slate-300">Clean Architecture, MVVM, Room DB Caching, & Cloud Firestore Ready</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-2 bg-slate-100 border-b border-slate-200 flex gap-2 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'architecture' ? 'bg-white text-emerald-800 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Struktur & Layering
          </button>
          <button
            onClick={() => setActiveTab('gradle')}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'gradle' ? 'bg-white text-emerald-800 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            build.gradle.kts
          </button>
          <button
            onClick={() => setActiveTab('compose')}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'compose' ? 'bg-white text-emerald-800 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Compose UI
          </button>
          <button
            onClick={() => setActiveTab('room')}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'room' ? 'bg-white text-emerald-800 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4" />
            Room Database
          </button>
          <button
            onClick={() => setActiveTab('firebase')}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'firebase' ? 'bg-white text-emerald-800 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Firestore Rules
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 text-sm text-slate-700 space-y-4">
          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <h4 className="font-semibold text-emerald-900 mb-1 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-emerald-700" />
                  Kesesuaian Clean Architecture & Repository Pattern
                </h4>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Aplikasi ini dirancang sesuai arsitektur Google Android Modern (MAD) dengan pemisahan layer yang ketat antara UI (Jetpack Compose + Material 3), Presentation (ViewModel), Domain (Use Cases), dan Data Layer (Offline-First via Room Database + Cloud Firestore).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <h5 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Layer Folder Android Studio
                  </h5>
                  <pre className="text-xs font-mono text-slate-800 bg-white p-3 rounded-lg border border-slate-200 overflow-x-auto leading-relaxed">
{`app/src/main/java/id/kebonkangkung/digitalrw03/
├── di/                     # Hilt Dependency Injection
├── ui/
│   ├── theme/              # Material 3 Colors & Typography
│   ├── navigation/         # NavHost & Sealed Destinations
│   ├── components/         # Reusable Compose Widgets
│   └── screens/
│       ├── auth/           # Login, Register, ForgotPw
│       ├── dashboard/      # Warga, RT, RW Dashboards
│       ├── warga/          # Daftar, Detail, Form Warga
│       ├── kk/             # Kartu Keluarga & Anggota
│       ├── surat/          # Pengajuan & Approval Surat
│       ├── pengaduan/      # Lapor Masalah & Kamera
│       ├── iuran/          # Tagihan & Bukti Bayar
│       ├── keuangan/       # Kas Masuk, Keluar, Saldo
│       └── inventaris/     # Aset & Peminjaman
├── domain/
│   ├── model/              # Pure Kotlin Data Classes
│   └── usecase/            # Business Logic & Permissions
└── data/
    ├── local/              # Room Database, DAOs, Entities
    ├── remote/             # Firebase SDK / Retrofit REST
    └── repository/         # Offline-First Repositories`}
                  </pre>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <h5 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Fitur Keamanan & Privasi Warga
                  </h5>
                  <ul className="text-xs space-y-2 text-slate-600">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-emerald-700">1.</span>
                      <span><strong>Proteksi NIK:</strong> NIK disamarkan (masked) otomatis untuk pengguna non-otoritas dan hanya terbuka dengan otentikasi biometrik/admin.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-emerald-700">2.</span>
                      <span><strong>Isolasi Wilayah RT:</strong> Pengurus RT hanya diizinkan melihat dan memverifikasi data di RT masing-masing.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-emerald-700">3.</span>
                      <span><strong>Audit Trail Terintegrasi:</strong> Setiap mutasi data warga, verifikasi surat, dan transaksi tercatat pada tabel Audit Log.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-emerald-700">4.</span>
                      <span><strong>Offline-First:</strong> Menggunakan Room DB sebagai single source of truth untuk tampilan offline tanpa latency.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'gradle' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">app/build.gradle.kts</span>
                <button
                  onClick={() => handleCopy(gradleCode, 'gradle')}
                  className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  {copiedSection === 'gradle' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSection === 'gradle' ? 'Tersalin' : 'Salin Kode'}
                </button>
              </div>
              <pre className="p-4 bg-slate-950 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed">
                {gradleCode}
              </pre>
            </div>
          )}

          {activeTab === 'compose' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">ui/screens/dashboard/DashboardRwScreen.kt</span>
                <button
                  onClick={() => handleCopy(composeScreenCode, 'compose')}
                  className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  {copiedSection === 'compose' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSection === 'compose' ? 'Tersalin' : 'Salin Kode'}
                </button>
              </div>
              <pre className="p-4 bg-slate-950 text-indigo-300 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed">
                {composeScreenCode}
              </pre>
            </div>
          )}

          {activeTab === 'room' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">data/local/dao/ResidentDao.kt</span>
                <button
                  onClick={() => handleCopy(roomDaoCode, 'room')}
                  className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  {copiedSection === 'room' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSection === 'room' ? 'Tersalin' : 'Salin Kode'}
                </button>
              </div>
              <pre className="p-4 bg-slate-950 text-amber-300 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed">
                {roomDaoCode}
              </pre>
            </div>
          )}

          {activeTab === 'firebase' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">firestore.rules (Production Security Rules)</span>
                <button
                  onClick={() => handleCopy(firestoreRulesCode, 'firebase')}
                  className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  {copiedSection === 'firebase' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSection === 'firebase' ? 'Tersalin' : 'Salin Kode'}
                </button>
              </div>
              <pre className="p-4 bg-slate-950 text-sky-300 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed">
                {firestoreRulesCode}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-600" />
            <span>Prototype interaktif saat ini berjalan dengan local storage caching & repository simulation</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
