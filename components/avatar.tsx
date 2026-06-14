type AvatarProps = {
  name: string;
  size?: number;
  color?: string;
};

// Colores decorativos FIJOS (no tokens): la identidad de color del avatar no
// debe cambiar con el tema, y el texto siempre es blanco. Todos son saturados
// para legibilidad en claro y oscuro (se reemplazaron 2 casi-neutras que se
// leían como "fondo" en modo oscuro).
const PALETTE = ["#3d3df0", "#a85b00", "#1f7a4d", "#6e3ab8", "#0c5b9e", "#b3261e", "#0e7490", "#be185d"];

export function Avatar({ name, size = 22, color }: AvatarProps) {
  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const bg = color ?? PALETTE[name.charCodeAt(0) % PALETTE.length];
  return (
    <div
      className="rounded-full text-white font-semibold grid place-items-center shrink-0"
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize: size * 0.42,
      }}
    >
      {initials}
    </div>
  );
}
