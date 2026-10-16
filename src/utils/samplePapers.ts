import { PaperSample } from '../types';

export const SAMPLE_PAPERS: PaperSample[] = [
  {
    id: 'user-yellow-slip',
    title: 'Yellow Paper Slip (070263516)',
    category: 'Your Uploaded Paper',
    description: 'Yellow handwritten paper slip with 070263516 and 10-1038 in black pen',
    expectedNumbers: ['070263516', '10-1038'],
    imageUrl: '',
    svgData: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
      <!-- Desk background -->
      <rect width="600" height="400" fill="#f8fafc"/>
      <!-- Sheet of white paper -->
      <polygon points="40,20 560,35 550,380 30,370" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>
      
      <!-- Yellow paper slip rotated slightly like the user photo -->
      <g transform="translate(60, 95) rotate(-1.5 240 100)">
        <!-- Paper shadow -->
        <rect x="5" y="5" width="460" height="190" fill="#000000" opacity="0.12" rx="4"/>
        <!-- Yellow torn sticky strip -->
        <rect x="0" y="0" width="460" height="190" fill="#fef08a" stroke="#facc15" stroke-width="1.5" rx="3"/>
        
        <!-- Top handwritten line: 10-1038 in black ballpoint pen -->
        <text x="140" y="70" fill="#18181b" font-family="'Caveat', 'Comic Sans MS', cursive, sans-serif" font-weight="bold" font-size="38" letter-spacing="3">10-1038</text>
        
        <!-- Bottom handwritten line: 070263516 in black pen -->
        <text x="80" y="145" fill="#09090b" font-family="'Caveat', 'Comic Sans MS', cursive, sans-serif" font-weight="900" font-size="46" letter-spacing="4">070263516</text>
      </g>
      
      <text x="50" y="385" fill="#94a3b8" font-family="sans-serif" font-size="12">Captured paper slip: Yellow note with 070263516 &bull; Ready for Ctrl+V</text>
    </svg>`,
  },
  {
    id: 'handwritten-8-digit',
    title: 'Handwritten 8-Digit Paper Slip',
    category: 'Handwriting (8 Digits)',
    description: 'Paper note with 8 handwritten numbers written in blue ballpoint pen',
    expectedNumbers: ['84920194', '51029384'],
    imageUrl: '',
    svgData: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
      <!-- Lined notebook paper texture -->
      <rect width="600" height="400" fill="#fdfbf7" rx="4" stroke="#e2e8f0" stroke-width="2"/>
      
      <!-- Blue notebook horizontal ruled lines -->
      <line x1="30" y1="70" x2="570" y2="70" stroke="#cbd5e1" stroke-width="1"/>
      <line x1="30" y1="130" x2="570" y2="130" stroke="#cbd5e1" stroke-width="1"/>
      <line x1="30" y1="190" x2="570" y2="190" stroke="#cbd5e1" stroke-width="1"/>
      <line x1="30" y1="250" x2="570" y2="250" stroke="#cbd5e1" stroke-width="1"/>
      <line x1="30" y1="310" x2="570" y2="310" stroke="#cbd5e1" stroke-width="1"/>
      <line x1="30" y1="370" x2="570" y2="370" stroke="#cbd5e1" stroke-width="1"/>

      <!-- Red margin line on the left -->
      <line x1="90" y1="0" x2="90" y2="400" stroke="#fca5a5" stroke-width="1.5"/>

      <!-- Handwritten text -->
      <text x="110" y="60" fill="#1e293b" font-family="'Comic Sans MS', 'Caveat', cursive, sans-serif" font-weight="bold" font-size="22">Order Reference / Serial Tag:</text>
      
      <!-- Big Handwritten 8-digit number (Blue ballpoint ink look) -->
      <rect x="110" y="85" width="450" height="85" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="4" rx="8"/>
      <text x="120" y="110" fill="#2563eb" font-family="sans-serif" font-weight="bold" font-size="12">8 DIGITS ONLY:</text>
      <text x="135" y="155" fill="#1e40af" font-family="'Fira Code', 'Comic Sans MS', monospace" font-weight="900" font-size="44" letter-spacing="6">84920194</text>

      <text x="110" y="240" fill="#334155" font-family="'Comic Sans MS', cursive, sans-serif" font-size="22">Backup Code (8 digits):</text>
      <text x="135" y="300" fill="#1e40af" font-family="'Fira Code', 'Comic Sans MS', monospace" font-weight="900" font-size="42" letter-spacing="6">51029384</text>

      <text x="110" y="360" fill="#64748b" font-family="sans-serif" font-size="13">Handwritten paper note • 8 digits • Ready for Ctrl+V</text>
    </svg>`,
  },
  {
    id: 'handwritten-10-digit',
    title: 'Handwritten 10-Digit Paper Memo',
    category: 'Handwriting (10 Digits)',
    description: 'Yellow memo note with 10 handwritten numbers (phone / account ID)',
    expectedNumbers: ['0814929381', '9823481023'],
    imageUrl: '',
    svgData: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
      <!-- Yellow memo slip -->
      <rect width="600" height="400" fill="#fef9c3" rx="8" stroke="#fde047" stroke-width="2"/>
      <rect x="0" y="0" width="600" height="24" fill="#facc15" opacity="0.6"/>

      <text x="50" y="70" fill="#854d0e" font-family="'Comic Sans MS', cursive, sans-serif" font-weight="bold" font-size="22">Customer Account / Phone Slip:</text>
      
      <!-- 10 digits number box -->
      <rect x="45" y="95" width="510" height="95" fill="#fef08a" stroke="#ca8a04" stroke-width="2" rx="8"/>
      <text x="60" y="122" fill="#a16207" font-family="sans-serif" font-weight="bold" font-size="13">10 DIGIT NUMBER (WRITTEN BY HAND):</text>
      <text x="65" y="172" fill="#0f172a" font-family="'Fira Code', 'Comic Sans MS', monospace" font-weight="900" font-size="42" letter-spacing="4">0814929381</text>

      <text x="50" y="245" fill="#854d0e" font-family="'Comic Sans MS', cursive, sans-serif" font-size="22">Secondary Tracking (10 digits):</text>
      <text x="65" y="310" fill="#0f172a" font-family="'Fira Code', 'Comic Sans MS', monospace" font-weight="900" font-size="42" letter-spacing="4">9823481023</text>

      <text x="50" y="365" fill="#a16207" font-family="sans-serif" font-size="13">Scan or hold in front of webcam &rarr; Instant 10-digit Ctrl+V copy</text>
    </svg>`,
  },
  {
    id: 'package-tracking',
    title: 'Courier Shipping Label',
    category: 'Logistics',
    description: 'Package tracking number and postal routing barcode digits',
    expectedNumbers: ['9405-5112-9831-29', '75024'],
    imageUrl: '',
    svgData: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
      <rect width="600" height="400" fill="#fdfbf7" rx="8" stroke="#d1d5db" stroke-width="3"/>
      <rect x="20" y="20" width="560" height="60" fill="#1e293b" rx="4"/>
      <text x="40" y="58" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="28">EXPRESS COURIER</text>
      <text x="440" y="58" fill="#94a3b8" font-family="sans-serif" font-weight="700" font-size="20">PRIORITY</text>
      
      <rect x="20" y="90" width="560" height="85" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5" rx="4"/>
      <text x="35" y="115" fill="#64748b" font-family="sans-serif" font-size="12">SHIP TO:</text>
      <text x="35" y="135" fill="#0f172a" font-family="sans-serif" font-weight="700" font-size="16">Tech Logistics Hub, Bay 4</text>
      <text x="35" y="155" fill="#334155" font-family="sans-serif" font-size="14">Dallas TX 75024</text>

      <rect x="20" y="190" width="560" height="110" fill="#ffffff" stroke="#0f172a" stroke-width="2.5" rx="6"/>
      <text x="40" y="220" fill="#64748b" font-family="sans-serif" font-weight="700" font-size="13">TRACKING NUMBER (USPS / FEDEX):</text>
      <text x="40" y="265" fill="#0f172a" font-family="Courier New, monospace" font-weight="900" font-size="34" letter-spacing="2">9405-5112-9831-29</text>
      <text x="40" y="350" fill="#334155" font-family="monospace" font-weight="bold" font-size="18">WEIGHT: 1.45 KG  |  POSTAL CODE: 75024</text>
    </svg>`,
  },
  {
    id: 'serial-plate',
    title: 'Industrial Serial Plate',
    category: 'Hardware',
    description: 'Machinery stamped part number and unit serial code',
    expectedNumbers: ['2026-X889-4401', '240', '16'],
    imageUrl: '',
    svgData: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
      <rect width="600" height="400" fill="#1e293b" rx="16" stroke="#94a3b8" stroke-width="4"/>
      <text x="60" y="80" fill="#f8fafc" font-family="sans-serif" font-weight="900" font-size="26">APEX DYNAMICS CORP.</text>
      <text x="60" y="110" fill="#cbd5e1" font-family="monospace" font-size="16">INDUSTRIAL SERVER CHASSIS REV 4.2</text>
      <rect x="60" y="150" width="480" height="120" fill="#0f172a" rx="8" stroke="#38bdf8" stroke-width="2"/>
      <text x="80" y="185" fill="#38bdf8" font-family="monospace" font-weight="bold" font-size="14">EQUIPMENT SERIAL NUMBER (S/N):</text>
      <text x="80" y="240" fill="#ffffff" font-family="Courier New, monospace" font-weight="900" font-size="36" letter-spacing="3">2026-X889-4401</text>
      <text x="60" y="320" fill="#94a3b8" font-family="monospace" font-size="16">VOLTAGE: 240V AC  |  AMPS: 16A  |  FREQ: 50/60HZ</text>
    </svg>`,
  },
  {
    id: 'store-receipt',
    title: 'Retail Store Register Receipt',
    category: 'Retail',
    description: 'Thermal printed store paper receipt with transaction and order ID',
    expectedNumbers: ['9102449102', '38.50'],
    imageUrl: '',
    svgData: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
      <rect width="600" height="400" fill="#fafafa" rx="2" stroke="#e5e7eb" stroke-width="1"/>
      <g fill="#1f2937" font-family="monospace">
        <text x="300" y="55" font-weight="900" font-size="24" text-anchor="middle">SUPERMARKET MART</text>
        <text x="50" y="125" font-size="16" font-weight="bold">TRANSACTION (10 DIGITS):</text>
        <text x="50" y="175" font-size="38" font-weight="900" fill="#111827">9102449102</text>
        <text x="50" y="240" font-size="16">SUBTOTAL: $35.00  |  TAX: $3.50</text>
        <text x="50" y="290" font-size="28" font-weight="900" fill="#047857">TOTAL: $38.50</text>
      </g>
    </svg>`,
  },
];
