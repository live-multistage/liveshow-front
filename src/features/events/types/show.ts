export interface Show {
  id: string;
  title: string;
  artist: string;
  category: string;
  venue: string;
  city: string;
  country: string;
  date: string;
  time: string;
  duration: string;
  image: string;
  price: number;
  currency: string;
  isLive: boolean;
  hasReplay: boolean;
  cameras: Camera[];
  description: string;
  tags: string[];
  viewers?: number;
  rating?: number;
  priceRange?: { min: number; max: number };
}

export interface Camera {
  id: string;
  name: string;
  angle: string;
  color: string;
  gradient: string;
}

const CAMERAS_ROCK: Camera[] = [
  { id: "cam1", name: "Câmera Principal", angle: "Palco Frontal", color: "#e63946", gradient: "from-red-900 via-red-800 to-orange-900" },
  { id: "cam2", name: "Câmera Aérea", angle: "Vista Drone", color: "#457b9d", gradient: "from-blue-900 via-blue-800 to-indigo-900" },
  { id: "cam3", name: "Câmera Lateral Esq.", angle: "Lateral Esquerda", color: "#2a9d8f", gradient: "from-teal-900 via-teal-800 to-green-900" },
  { id: "cam4", name: "Câmera Lateral Dir.", angle: "Lateral Direita", color: "#e9c46a", gradient: "from-yellow-900 via-yellow-800 to-amber-900" },
  { id: "cam5", name: "Câmera da Plateia", angle: "Vista da Plateia", color: "#8338ec", gradient: "from-purple-900 via-purple-800 to-violet-900" },
  { id: "cam6", name: "Câmera do Baterista", angle: "Bateria", color: "#f77f00", gradient: "from-orange-900 via-orange-800 to-red-900" },
  { id: "cam7", name: "Câmera do Guitarrista", angle: "Guitarra", color: "#06d6a0", gradient: "from-emerald-900 via-emerald-800 to-teal-900" },
  { id: "cam8", name: "Câmera Backstage", angle: "Bastidores", color: "#f72585", gradient: "from-pink-900 via-pink-800 to-rose-900" },
];

const CAMERAS_ORCHESTRA: Camera[] = [
  { id: "cam1", name: "Câmera Principal", angle: "Vista Geral", color: "#6d4c41", gradient: "from-amber-950 via-amber-900 to-yellow-950" },
  { id: "cam2", name: "Câmera Maestro", angle: "Regente", color: "#37474f", gradient: "from-slate-900 via-slate-800 to-gray-900" },
  { id: "cam3", name: "Câmera Violinos", angle: "Seção de Cordas", color: "#4a148c", gradient: "from-purple-950 via-purple-900 to-indigo-950" },
  { id: "cam4", name: "Câmera Sopros", angle: "Seção de Sopros", color: "#1a237e", gradient: "from-blue-950 via-blue-900 to-indigo-950" },
  { id: "cam5", name: "Câmera Percussão", angle: "Tímpanos", color: "#b71c1c", gradient: "from-red-950 via-red-900 to-rose-950" },
  { id: "cam6", name: "Câmera Plateia", angle: "Auditório", color: "#1b5e20", gradient: "from-green-950 via-green-900 to-emerald-950" },
];

const CAMERAS_FESTIVAL: Camera[] = [
  { id: "cam1", name: "Câmera Principal", angle: "Palco Central", color: "#7b2ff7", gradient: "from-violet-900 via-purple-900 to-indigo-900" },
  { id: "cam2", name: "Câmera Crowd", angle: "Multidão", color: "#f72585", gradient: "from-pink-900 via-rose-900 to-red-900" },
  { id: "cam3", name: "Câmera Aérea", angle: "Drone 4K", color: "#4cc9f0", gradient: "from-cyan-900 via-sky-900 to-blue-900" },
  { id: "cam4", name: "Câmera DJ", angle: "Booth do DJ", color: "#f7b731", gradient: "from-yellow-900 via-amber-900 to-orange-900" },
  { id: "cam5", name: "Câmera VIP", angle: "Área VIP", color: "#2ed573", gradient: "from-green-900 via-emerald-900 to-teal-900" },
  { id: "cam6", name: "Câmera Led Wall", angle: "Painel de LED", color: "#ff4757", gradient: "from-red-900 via-rose-900 to-pink-900" },
  { id: "cam7", name: "Câmera Palco 2", angle: "Segundo Palco", color: "#1e90ff", gradient: "from-blue-900 via-indigo-900 to-violet-900" },
  { id: "cam8", name: "Câmera Backstage", angle: "Bastidores", color: "#ff6b81", gradient: "from-rose-900 via-pink-900 to-fuchsia-900" },
  { id: "cam9", name: "Câmera Laser", angle: "Efeitos Especiais", color: "#a29bfe", gradient: "from-indigo-900 via-violet-900 to-purple-900" },
];

const CAMERAS_JAZZ: Camera[] = [
  { id: "cam1", name: "Câmera Principal", angle: "Palco Frontal", color: "#b5451b", gradient: "from-orange-950 via-orange-900 to-amber-950" },
  { id: "cam2", name: "Câmera Pianista", angle: "Piano", color: "#1c3144", gradient: "from-slate-950 via-slate-900 to-blue-950" },
  { id: "cam3", name: "Câmera Saxofone", angle: "Sax", color: "#d4a017", gradient: "from-yellow-950 via-yellow-900 to-amber-950" },
  { id: "cam4", name: "Câmera Contrabaixo", angle: "Bass", color: "#2d4739", gradient: "from-green-950 via-green-900 to-emerald-950" },
];

const CAMERAS_BALLET: Camera[] = [
  { id: "cam1", name: "Câmera Principal", angle: "Vista Frontal", color: "#ad1457", gradient: "from-pink-950 via-rose-900 to-fuchsia-950" },
  { id: "cam2", name: "Câmera Lateral", angle: "Perfil", color: "#6a1b9a", gradient: "from-purple-950 via-violet-900 to-indigo-950" },
  { id: "cam3", name: "Câmera Aérea", angle: "Vista Aérea", color: "#0277bd", gradient: "from-blue-950 via-sky-900 to-cyan-950" },
  { id: "cam4", name: "Câmera Coxia", angle: "Bastidores", color: "#2e7d32", gradient: "from-green-950 via-emerald-900 to-teal-950" },
  { id: "cam5", name: "Câmera Plateia", angle: "Auditório", color: "#4e342e", gradient: "from-stone-950 via-stone-900 to-neutral-950" },
];

export const SHOWS: Show[] = [
  {
    id: "1",
    title: "Thunder World Tour 2025",
    artist: "The Voltage",
    category: "Rock",
    venue: "Madison Square Garden",
    city: "Nova York",
    country: "EUA",
    date: "2025-05-15",
    time: "21:00",
    duration: "2h 30min",
    image: "https://images.unsplash.com/photo-1619973226698-b77a5b5dd14b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyb2NrJTIwY29uY2VydCUyMGxpdmUlMjBzdGFnZSUyMGxpZ2h0cyUyMGNyb3dkfGVufDF8fHx8MTc3NzIzMTEyNnww&ixlib=rb-4.1.0&q=80&w=1080",
    price: 89.90,
    currency: "BRL",
    isLive: true,
    hasReplay: true,
    cameras: CAMERAS_ROCK,
    description: "A maior turnê de rock do ano está de volta! The Voltage promete uma noite inesquecível com mais de 2 horas de show, efeitos especiais impressionantes e os maiores sucessos da carreira de 20 anos. Agora você pode assistir de qualquer lugar do mundo com acesso a 8 câmeras exclusivas.",
    tags: ["Rock", "Ao Vivo", "Multi-câmera"],
    viewers: 48320,
    rating: 4.9,
  },
  {
    id: "2",
    title: "Noite de Gala Sinfônica",
    artist: "Filarmônica de Berlim",
    category: "Clássico",
    venue: "Berliner Philharmonie",
    city: "Berlim",
    country: "Alemanha",
    date: "2025-05-20",
    time: "19:30",
    duration: "3h",
    image: "https://images.unsplash.com/photo-1775143452250-ee0637b96b71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGFzc2ljYWwlMjBvcmNoZXN0cmElMjBzeW1waG9ueSUyMHBlcmZvcm1hbmNlfGVufDF8fHx8MTc3NzIzMTEyNnww&ixlib=rb-4.1.0&q=80&w=1080",
    price: 149.90,
    currency: "BRL",
    isLive: false,
    hasReplay: true,
    cameras: CAMERAS_ORCHESTRA,
    description: "Uma noite extraordinária com a mundialmente renomada Filarmônica de Berlim. O programa inclui obras de Beethoven, Brahms e Mahler. Com câmeras posicionadas estrategicamente, você poderá acompanhar cada seção da orquestra de perto.",
    tags: ["Clássico", "Orquestra", "Alemanha"],
    viewers: 12540,
    rating: 4.8,
  },
  {
    id: "3",
    title: "Aurora Festival 2025",
    artist: "Vários Artistas",
    category: "Eletrônica",
    venue: "Parque Olímpico",
    city: "Londres",
    country: "Reino Unido",
    date: "2025-06-07",
    time: "18:00",
    duration: "8h",
    image: "https://images.unsplash.com/photo-1763379917766-ff3027447bfa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljJTIwbXVzaWMlMjBmZXN0aXZhbCUyMG91dGRvb3IlMjBuaWdodHxlbnwxfHx8fDE3NzcyMzExMjd8MA&ixlib=rb-4.1.0&q=80&w=1080",
    price: 199.90,
    currency: "BRL",
    isLive: true,
    hasReplay: true,
    cameras: CAMERAS_FESTIVAL,
    description: "O maior festival de música eletrônica da Europa retorna em 2025 com uma lineup explosiva. 9 câmeras cobrindo 2 palcos, área VIP, backstage e os incríveis efeitos de luz e laser. Assista como se estivesse lá!",
    tags: ["EDM", "Festival", "Multi-palco"],
    viewers: 92100,
    rating: 4.7,
  },
  {
    id: "4",
    title: "Blue Note Sessions",
    artist: "Marcus Carter Quartet",
    category: "Jazz",
    venue: "Blue Note Jazz Club",
    city: "Nova Orleans",
    country: "EUA",
    date: "2025-05-28",
    time: "22:00",
    duration: "1h 45min",
    image: "https://images.unsplash.com/photo-1757439160077-dd5d62a4d851?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYXp6JTIwYmFuZCUyMGxpdmUlMjBwZXJmb3JtYW5jZSUyMGNsdWJ8ZW58MXx8fHwxNzc3MjMxMTI3fDA&ixlib=rb-4.1.0&q=80&w=1080",
    price: 59.90,
    currency: "BRL",
    isLive: false,
    hasReplay: true,
    cameras: CAMERAS_JAZZ,
    description: "Uma experiência íntima e única com o talentoso Marcus Carter Quartet. Jazz improvisado ao vivo do lendário Blue Note, com câmeras próximas a cada músico para que você não perca nenhum detalhe da performance.",
    tags: ["Jazz", "Íntimo", "Ao Vivo"],
    viewers: 5420,
    rating: 4.9,
  },
  {
    id: "5",
    title: "Lago dos Cisnes – Gala Especial",
    artist: "Ballet Imperial de Moscou",
    category: "Ballet",
    venue: "Teatro Bolshoi",
    city: "Moscou",
    country: "Rússia",
    date: "2025-06-14",
    time: "20:00",
    duration: "2h 45min",
    image: "https://images.unsplash.com/photo-1760543320338-7bde1336eaef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWxsZXQlMjB0aGVhdGVyJTIwc3RhZ2UlMjBwZXJmb3JtYW5jZXxlbnwxfHx8fDE3NzcyMzExMjh8MA&ixlib=rb-4.1.0&q=80&w=1080",
    price: 129.90,
    currency: "BRL",
    isLive: false,
    hasReplay: false,
    cameras: CAMERAS_BALLET,
    description: "A obra-prima de Tchaikovsky ganha vida no palco do lendário Bolshoi. Com 5 câmeras estrategicamente posicionadas, você poderá ver cada movimento dos bailarinos com perfeição técnica impecável.",
    tags: ["Ballet", "Clássico", "Bolshoi"],
    viewers: 18900,
    rating: 5.0,
  },
  {
    id: "6",
    title: "Madama Butterfly",
    artist: "Teatro La Scala",
    category: "Ópera",
    venue: "Teatro alla Scala",
    city: "Milão",
    country: "Itália",
    date: "2025-07-01",
    time: "20:30",
    duration: "3h 30min",
    image: "https://images.unsplash.com/photo-1761359841098-8e84b7cf3661?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvcGVyYSUyMGhvdXNlJTIwZ3JhbmQlMjBwZXJmb3JtYW5jZXxlbnwxfHx8fDE3NzcyMzExMjh8MA&ixlib=rb-4.1.0&q=80&w=1080",
    price: 179.90,
    currency: "BRL",
    isLive: false,
    hasReplay: false,
    cameras: CAMERAS_ORCHESTRA,
    description: "A ópera mais emocionante de Puccini apresentada no Teatro alla Scala de Milão, um dos palcos mais prestigiados do mundo. Uma experiência cultural ímpar transmitida ao vivo em 6 câmeras de alta definição.",
    tags: ["Ópera", "Puccini", "La Scala"],
    viewers: 22300,
    rating: 4.8,
  },
];

export const GRID_LAYOUTS = [
  { id: "1x1", label: "1 Câmera", cols: 1, rows: 1, max: 1 },
  { id: "1x2", label: "2 Câmeras", cols: 2, rows: 1, max: 2 },
  { id: "2x2", label: "4 Câmeras", cols: 2, rows: 2, max: 4 },
];
