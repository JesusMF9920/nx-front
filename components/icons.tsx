import type { CSSProperties, ReactNode } from "react";

type IconProps = {
  d: string | ReactNode;
  size?: number;
  stroke?: number;
  fill?: string;
  style?: CSSProperties;
};

export function Icon({ d, size = 16, stroke = 1.6, fill = "none", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {typeof d === "string" ? <path d={d} /> : d}
    </svg>
  );
}

export const I = {
  home:        <Icon d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" />,
  cart:        <Icon d={<><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h3l2.5 12.5a2 2 0 0 0 2 1.5h8a2 2 0 0 0 2-1.5L22 7H6" /></>} />,
  box:         <Icon d={<><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" /></>} />,
  users:       <Icon d={<><circle cx="9" cy="8" r="3.5" /><path d="M2 21a7 7 0 0 1 14 0" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14a5 5 0 0 1 6 5" /></>} />,
  user:        <Icon d={<><circle cx="12" cy="8" r="3.5" /><path d="M4 21a8 8 0 0 1 16 0" /></>} />,
  truck:       <Icon d={<><path d="M3 6h11v10H3z" /><path d="M14 9h4l3 3v4h-7" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></>} />,
  factory:     <Icon d={<><path d="M3 21V10l5 3V10l5 3V10l5 3v8z" /><path d="M3 21h18" /></>} />,
  receipt:     <Icon d={<><path d="M5 3h14v18l-3-2-3 2-3-2-3 2-2-2z" /><path d="M8 8h8M8 12h8M8 16h5" /></>} />,
  calendar:    <Icon d={<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>} />,
  chart:       <Icon d={<><path d="M3 21V3" /><path d="M3 21h18" /><rect x="6" y="12" width="3" height="6" /><rect x="12" y="8" width="3" height="10" /><rect x="18" y="14" width="3" height="4" /></>} />,
  settings:    <Icon d={<><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.3l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2.3-1.3L14 3h-4l-.3 2.5a7 7 0 0 0-2.3 1.3l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .9.1 1.3l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2.3 1.3L10 21h4l.3-2.5a7 7 0 0 0 2.3-1.3l2.3 1 2-3.4-2-1.5c.1-.4.1-.9.1-1.3z" /></>} />,
  search:      <Icon d={<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>} />,
  plus:        <Icon d="M12 5v14M5 12h14" />,
  more:        <Icon d={<><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>} />,
  chevronDown: <Icon d="m6 9 6 6 6-6" />,
  chevronRight:<Icon d="m9 6 6 6-6 6" />,
  check:       <Icon d="M5 12l5 5 9-11" />,
  x:           <Icon d="M6 6l12 12M6 18 18 6" />,
  bell:        <Icon d={<><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2.5h-15z" /><path d="M10 21h4" /></>} />,
  edit:        <Icon d={<><path d="M4 20h4l11-11-4-4L4 16z" /><path d="m14 6 4 4" /></>} />,
  shield:      <Icon d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6z" />,
  alert:       <Icon d={<><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.7 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0z" /></>} />,
  paint:       <Icon d={<><path d="M19 11V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h14z" /><path d="M11 13v3a2 2 0 0 0 2 2h0a2 2 0 0 1 2 2v0" /></>} />,
  layers:      <Icon d={<><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /><path d="m3 18 9 5 9-5" /></>} />,
  logout:      <Icon d={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>} />,
  lock:        <Icon d={<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>} />,
  arrowRight:  <Icon d="M5 12h14M13 5l7 7-7 7" />,
  send:        <Icon d="m22 2-7 20-4-9-9-4z" />,
};
