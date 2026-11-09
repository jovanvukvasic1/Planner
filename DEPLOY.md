# Postavljanje planera na vlastiti server (Docker)

> Najlakši put bez kartice je **[Render + Turso](DEPLOY-RENDER.md)**. Ovo uputstvo je za
> slučaj kad želiš vlastiti (virtualni) server: tada nema "uspavljivanja" i sve je kod tebe.

Ovo uputstvo podiže planer na **virtualni server** s **besplatnim domenom** i
**HTTPS-om**, tako da radi i s laptopa i s telefona (kao aplikacija na početnom ekranu).
Baza (s naslovnim slikama) je SQLite fajl u Docker volumenu.

## Gdje nabaviti besplatan server

| Opcija | Šta dobiješ | Napomena |
| --- | --- | --- |
| **Oracle Cloud "Always Free"** (preporuka) | Ubuntu server, disk koji se ne briše | Traži karticu za verifikaciju, ali ne naplaćuje dok si u "Always Free" resursima |
| **Google Cloud e2-micro** | 1 mali server (1 GB RAM), 30 GB disk | Samo regioni `us-west1`, `us-central1`, `us-east1`; traži karticu |
| **Svoj računar / Raspberry Pi** | Potpuna kontrola | Mora biti stalno uključen |

Uslovi besplatnih planova se mijenjaju, pa prije registracije pogledaj zvanične stranice
(Oracle: *Always Free Resources*, Google: *Free Tier*).

Planeru je dovoljno malo resursa: radi i na najmanjim besplatnim serverima (1 GB RAM).

---

## 1. Napravi server (Oracle Cloud)

1. Registruj se na [cloud.oracle.com](https://cloud.oracle.com) (izaberi najbliži "home region",
   npr. Frankfurt; kasnije se ne može mijenjati).
2. **Compute → Instances → Create instance**
   - **Image:** Canonical Ubuntu 24.04
   - **Shape:** `VM.Standard.A1.Flex` (Ampere, npr. 1 OCPU i 6 GB RAM). Ako dobiješ grešku
     *"Out of capacity"*, probaj kasnije ili izaberi `VM.Standard.E2.1.Micro` (1 GB RAM, i to je dovoljno).
   - **SSH keys:** dodaj svoj javni ključ (ili preuzmi ključ koji Oracle generiše).
3. Kad se server pokrene, zapiši **Public IP address**. Da se adresa ne bi mijenjala, u
   *Networking → IP Management → Reserved public IPs* rezerviši je i dodijeli serveru.
4. **Otvori portove 80 i 443:** *Networking → Virtual cloud networks → (tvoja mreža) → Security
   Lists → Default Security List → Add Ingress Rules*:
   - Source CIDR `0.0.0.0/0`, IP Protocol `TCP`, Destination port `80`
   - Source CIDR `0.0.0.0/0`, IP Protocol `TCP`, Destination port `443`
5. Poveži se na server: `ssh ubuntu@TVOJA_IP`. Ubuntu na Oracleu ima i svoj firewall
   (iptables) koji blokira portove, pa i njih otvori:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
```

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
```

```bash
sudo netfilter-persistent save
```

**Google Cloud umjesto Oraclea:** napravi `e2-micro` VM u jednom od besplatnih regiona, s
Ubuntu 24.04 i "standard persistent disk" do 30 GB, i uključi *Allow HTTP traffic* i *Allow
HTTPS traffic*. Iptables korak ne treba. Ostatak uputstva je isti.

## 2. Besplatan domen (DuckDNS)

1. Prijavi se na [duckdns.org](https://www.duckdns.org) (preko GitHub ili Google naloga).
2. Napravi poddomen, npr. `mojplaner` → dobiješ `mojplaner.duckdns.org`.
3. U polje **current ip** upiši javnu IP adresu servera i klikni **update ip**.

Provjera (na svom računaru): `ping mojplaner.duckdns.org` treba da pokaže IP servera.

## 3. Instaliraj Docker na serveru

```bash
curl -fsSL https://get.docker.com | sudo sh
```

```bash
sudo usermod -aG docker $USER
```

Odjavi se (`exit`) i ponovo se poveži preko SSH-a, da bi grupa `docker` važila.

**Samo za servere s 1 GB RAM** (npr. E2.1.Micro, e2-micro): dodaj 2 GB swap memorije, jer
izgradnja aplikacije troši više memorije nego njen rad.

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
```

```bash
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 4. Preuzmi planer i podesi ga

```bash
git clone https://github.com/jovanvukvasic1/Planner.git planer && cd planer
```

Ako je repozitorij privatan, Git će tražiti korisničko ime i lozinku: kao lozinku upiši
GitHub *personal access token* (GitHub → Settings → Developer settings → Personal access tokens,
s pravom čitanja repozitorija).

Napravi `.env` sa svojim domenom i nasumičnim tajnim ključem:

```bash
cp .env.example .env && sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 32)/" .env
```

```bash
nano .env
```

U `.env` promijeni `DOMAIN=` u svoj domen (npr. `DOMAIN=mojplaner.duckdns.org`) i sačuvaj
(`Ctrl+O`, `Enter`, `Ctrl+X`).

## 5. Pokreni

```bash
docker compose up -d --build
```

Prvi put izgradnja traje nekoliko minuta. Caddy zatim sam pribavi HTTPS certifikat (Let's
Encrypt) za tvoj domen. Otvori `https://mojplaner.duckdns.org` i **registruj se**. Prvi korisnik
postaje vlasnik, a nakon toga se registracija zatvara.

Provjera stanja i logova:

```bash
docker compose ps
```

```bash
docker compose logs -f
```

## 6. Instaliraj na telefon

- **Android (Chrome):** otvori adresu planera → meni (⋮) → *Instaliraj aplikaciju* /
  *Dodaj na početni ekran*.
- **iPhone (Safari):** otvori adresu planera → dugme *Dijeli* → *Dodaj na početni ekran*.

Planer se tada otvara kao zasebna aplikacija, bez trake browsera.

## 7. Ažuriranje na novu verziju

```bash
cd ~/planer && git pull && docker compose up -d --build
```

Promjene baze (migracije) primjenjuju se automatski pri pokretanju; podaci ostaju.

## 8. Backup

Skripta pravi kopiju baze (sa slikama) u `backups/planer-DATUM.tar.gz` i čuva zadnjih 14 kopija:

```bash
./deploy/backup.sh
```

Automatski backup svaku noć u 3:00 (otvori `crontab -e` i dodaj red):

```
0 3 * * * cd /home/ubuntu/planer && ./deploy/backup.sh >> backups/backup.log 2>&1
```

Backup na serveru ne pomaže ako se izgubi sam server, pa povremeno skini kopiju na svoj
računar:

```bash
scp ubuntu@TVOJA_IP:planer/backups/planer-*.tar.gz .
```

**Vraćanje iz backupa** (zamijeni ime fajla):

```bash
mkdir -p /tmp/planer-restore && tar xzf backups/planer-2026-11-09-0300.tar.gz -C /tmp/planer-restore
```

```bash
docker compose stop planner
```

```bash
docker compose cp /tmp/planer-restore/planner.db planner:/app/server/data/planner.db
```

```bash
docker compose start planner && rm -rf /tmp/planer-restore
```

## Česti problemi

| Problem | Rješenje |
| --- | --- |
| Stranica se ne otvara / nema certifikata | Provjeri da domen pokazuje na IP servera i da su portovi 80 i 443 otvoreni (i u Oracle Security List i u iptables). Pogledaj `docker compose logs caddy`. |
| `planner` se stalno restartuje | `docker compose logs planner`; najčešće `JWT_SECRET` nije postavljen u `.env`. |
| Izgradnja se prekida (killed) | Server ima premalo memorije: dodaj swap (korak 3). |
| Zaboravljena lozinka | Na serveru: `docker compose exec planner node scripts/reset-password.mjs KORISNIK NOVA_LOZINKA` |
| Previše pokušaja prijave | Nakon 10 pokušaja u 15 minuta prijava se privremeno blokira za tu IP adresu. Sačekaj. |
