// Espejo manual de los catálogos de permisos del backend.
// Si agregas un permiso nuevo en nxpos-api/src/modules/<context>/<context>.permissions.ts,
// repítelo aquí — el frontend valida y muestra contra esta lista.

export type CatalogPermission = {
  id: string;
  label: string;
};

export type CatalogPermissionGroup = {
  group: string;
  items: CatalogPermission[];
};

export const PERMISSION_GROUPS: CatalogPermissionGroup[] = [
  {
    group: "IAM · Usuarios",
    items: [
      { id: "iam.users.read", label: "Ver usuarios" },
      { id: "iam.users.write", label: "Crear y editar usuarios" },
      { id: "iam.users.deactivate", label: "Desactivar usuarios" },
    ],
  },
  {
    group: "IAM · Roles",
    items: [
      { id: "iam.roles.read", label: "Ver roles" },
      { id: "iam.roles.write", label: "Crear y editar roles" },
      { id: "iam.roles.assign", label: "Asignar roles a usuarios" },
    ],
  },
  {
    group: "Auditoría",
    items: [{ id: "audit.read", label: "Ver bitácora de auditoría" }],
  },
];

export const ALL_PERMISSION_IDS: string[] = PERMISSION_GROUPS.flatMap((g) =>
  g.items.map((i) => i.id),
);

export const TOTAL_PERMISSIONS = ALL_PERMISSION_IDS.length;
