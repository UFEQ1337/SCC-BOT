### Dokumentacja NEXTPBX BOT

#### Przegląd
NEXTPBX BOT to aplikacja zaprojektowana do zarządzania i automatyzacji zadań związanych z systemem PBX. Umożliwia ona interakcję z systemem za pomocą interfejsu webowego oraz automatyzację różnych zadań związanych z zarządzaniem DID.

#### Instalacja
Aby zainstalować NEXTPBX BOT, wykonaj poniższe kroki:

1. **Wymagania wstępne**: Upewnij się, że masz zainstalowany Node.js na swoim komputerze. Możesz go pobrać ze strony [oficjalnej Node.js](https://nodejs.org/).

2. **Klonowanie repozytorium**: Użyj poniższego polecenia, aby sklonować repozytorium na swój lokalny komputer:
   ```
   git clone https://github.com/UFEQ1337/SCC-BOT.git
   ```

3. **Instalacja zależności**: Przejdź do katalogu projektu i zainstaluj wymagane zależności za pomocą npm (Node Package Manager):
   ```
   cd NEXTPBX-BOT
   npm install
   ```

#### Sposób użycia
NEXTPBX BOT oferuje interfejs webowy do zarządzania DID. Poniżej znajduje się opis sposobu użycia głównych funkcji:

1. **Uruchomienie aplikacji**: Aby uruchomić aplikację, użyj polecenia:
   ```
   npm start
   ```
   Po uruchomieniu, aplikacja będzie dostępna przez przeglądarkę internetową.

2. **Interfejs webowy**: Aplikacja oferuje kilka stron webowych do zarządzania DID i tenantami:
   - `index.html` - Strona logowania.
   - `choose.html` - Strona wyboru między zarządzaniem DID a tenantami.
   - `did.html`, `did-add.html`, `did-update.html` - Strony do zarządzania DID.
   - `tenants.html` - Strona do zarządzania tenantami.

3. **Zarządzanie DID**: Aby zarządzać DID, przejdź do sekcji DID w interfejsie webowym. Możesz dodawać, aktualizować i usuwać DID za pomocą dostępnych formularzy.

4. **Przygotowanie pliku**:
   Plik typu Excel (xlsx).
   
   Wzór do pobrania:
[DID.xlsx](https://github.com/UFEQ1337/NEXTPBX-BOT/files/14397295/DID.xlsx)

   
| DID | KOMENTARZ | NAGRANIA | DESTINATION1 | DESTINATION2 | DESTINATION3 | DESTINATION4 | DESTINATION5 |
|-----|-----------|----------|--------------|--------------|--------------|--------------|--------------|



Typy Destination:
 - `PLAYBACK` - wpisujemy nazwę pliku do odtworzenia
 - `IVR` - wpisujemy nazwę IVR.
 - `EXT` - wpisujemy numer EXT.
 - `QUEUE` - wpisujemy nazwę kolejki.
 - `CUSTOM` - wpisujemy ID custom destination (znajduje się w adresie strony w edycji).
 - `CONDITION` - wpisujemy ID condition (znajduje się w adresie strony w edycji).
